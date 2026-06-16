import { sanitizeBodyExcerpt } from "./diagnostics";
import { ChatCompletionChunk, OpenAiToolCall, ParsedResponsePart, ParsedToolCallPart } from "./types";

export interface SseParseState {
	sawOpenAiResponsesTextDelta?: boolean;
	openAiToolCalls?: Map<number, OpenAiToolCallAccumulator>;
	anthropicToolCalls?: Map<number, AnthropicToolCallAccumulator>;
}

interface OpenAiToolCallAccumulator {
	callId: string;
	name: string;
	argumentsText: string;
}

interface AnthropicToolCallAccumulator {
	callId: string;
	name: string;
	argumentsText: string;
}

export function parseSseLine(line: string, state?: SseParseState): ParsedResponsePart[] {
	const trimmed = line.trim();
	if (!trimmed || !trimmed.startsWith("data:")) {
		return [];
	}

	const data = trimmed.slice("data:".length).trim();
	if (!data || data === "[DONE]") {
		return [];
	}

	let chunk: unknown;
	try {
		chunk = JSON.parse(data) as unknown;
	} catch {
		return [];
	}

	return parseSseChunk(chunk, state);
}

export function parseJsonResponseText(body: unknown): string | undefined {
	const text = parseJsonResponseParts(body)
		.filter((part) => part.type === "text")
		.map((part) => part.text)
		.join("");
	return text || undefined;
}

export function parseJsonResponseParts(body: unknown): ParsedResponsePart[] {
	if (typeof body !== "object" || body === null) {
		return [];
	}

	if ("content" in body && Array.isArray(body.content)) {
		return body.content.flatMap(parseContentPart);
	}

	if ("output" in body && typeof body.output === "object" && body.output !== null && "message" in body.output) {
		return parseJsonResponseParts(body.output.message);
	}

	if ("output" in body && Array.isArray(body.output)) {
		return body.output.flatMap(parseJsonResponseParts);
	}

	if ("output_text" in body && typeof body.output_text === "string" && body.output_text) {
		return [{ type: "text", text: body.output_text }];
	}

	if ("message" in body && typeof body.message === "object") {
		return parseJsonResponseParts(body.message);
	}

	if ("choices" in body && Array.isArray(body.choices)) {
		const first = body.choices[0] as unknown;
		if (typeof first === "object" && first !== null && "message" in first) {
			return parseOpenAiMessage(first.message);
		}
	}

	if ("text" in body && typeof body.text === "string" && body.text) {
		return [{ type: "text", text: body.text }];
	}

	return parseResponseItem(body);
}

export function getApertureRequestFailureMessage(status: number, statusText: string, body: string): string {
	const bodyExcerpt = sanitizeBodyExcerpt(body);
	const detail = bodyExcerpt ? ` ${bodyExcerpt}` : "";
	return `Aperture request failed: ${status} ${statusText}.${detail}`;
}

export function hasPotentialToolCallShape(body: unknown): boolean {
	if (typeof body !== "object" || body === null) {
		return false;
	}

	return containsKey(body, "tool_calls") || containsKey(body, "tool_use") || containsKey(body, "function_call");
}

function parseSseChunk(chunk: unknown, state?: SseParseState): ParsedResponsePart[] {
	return [
		...parseOpenAiChatChunk(chunk as ChatCompletionChunk, state),
		...parseOpenAiResponsesDelta(chunk, state),
		...parseAnthropicContentDelta(chunk, state),
	];
}

function parseOpenAiChatChunk(chunk: ChatCompletionChunk, state?: SseParseState): ParsedResponsePart[] {
	const choice = chunk.choices?.[0];
	if (!choice) {
		return [];
	}

	const parts: ParsedResponsePart[] = [];
	if (choice.delta?.content) {
		parts.push({ type: "text", text: choice.delta.content });
	}

	if (choice.message) {
		parts.push(...parseOpenAiMessage(choice.message));
	}

	if (choice.delta?.tool_calls) {
		state ??= {};
		state.openAiToolCalls ??= new Map();
		for (const toolCall of choice.delta.tool_calls) {
			const index = toolCall.index ?? 0;
			const current = state.openAiToolCalls.get(index) ?? {
				callId: toolCall.id ?? `tool-call-${index}`,
				name: "",
				argumentsText: "",
			};
			current.callId = toolCall.id ?? current.callId;
			current.name = toolCall.function?.name ?? current.name;
			current.argumentsText += toolCall.function?.arguments ?? "";
			state.openAiToolCalls.set(index, current);
		}
	}

	if (choice.finish_reason === "tool_calls" && state?.openAiToolCalls) {
		for (const toolCall of state.openAiToolCalls.values()) {
			const parsed = toParsedToolCall(toolCall.callId, toolCall.name, toolCall.argumentsText);
			if (parsed) {
				parts.push(parsed);
			}
		}
		state.openAiToolCalls.clear();
	}

	return parts;
}

function parseOpenAiResponsesDelta(chunk: unknown, state?: SseParseState): ParsedResponsePart[] {
	if (typeof chunk !== "object" || chunk === null) {
		return [];
	}

	if ("type" in chunk && chunk.type === "response.output_text.delta" && "delta" in chunk && typeof chunk.delta === "string") {
		if (state) {
			state.sawOpenAiResponsesTextDelta = true;
		}
		return [{ type: "text", text: chunk.delta }];
	}

	if ("type" in chunk && chunk.type === "response.output_item.done" && "item" in chunk) {
		const itemParts = parseResponseItem(chunk.item);
		if (state?.sawOpenAiResponsesTextDelta) {
			return itemParts.filter((part) => part.type !== "text");
		}
		return itemParts;
	}

	return [];
}

function parseAnthropicContentDelta(chunk: unknown, state?: SseParseState): ParsedResponsePart[] {
	if (typeof chunk !== "object" || chunk === null) {
		return [];
	}

	if ("type" in chunk && chunk.type === "content_block_start" && "index" in chunk && "content_block" in chunk) {
		const index = typeof chunk.index === "number" ? chunk.index : 0;
		const contentBlock = chunk.content_block;
		if (
			typeof contentBlock === "object" &&
			contentBlock !== null &&
			"type" in contentBlock &&
			contentBlock.type === "tool_use" &&
			"id" in contentBlock &&
			typeof contentBlock.id === "string" &&
			"name" in contentBlock &&
			typeof contentBlock.name === "string"
		) {
			state ??= {};
			state.anthropicToolCalls ??= new Map();
			state.anthropicToolCalls.set(index, {
				callId: contentBlock.id,
				name: contentBlock.name,
				argumentsText:
					"input" in contentBlock &&
					typeof contentBlock.input === "object" &&
					contentBlock.input !== null &&
					Object.keys(contentBlock.input).length > 0
						? JSON.stringify(contentBlock.input)
						: "",
			});
		}
		return [];
	}

	if (!("type" in chunk) || chunk.type !== "content_block_delta" || !("delta" in chunk)) {
		if ("type" in chunk && chunk.type === "content_block_stop" && "index" in chunk && state?.anthropicToolCalls) {
			const index = typeof chunk.index === "number" ? chunk.index : 0;
			const current = state.anthropicToolCalls.get(index);
			if (!current) {
				return [];
			}
			state.anthropicToolCalls.delete(index);
			const parsed = toParsedToolCall(current.callId, current.name, current.argumentsText);
			return parsed ? [parsed] : [];
		}

		return [];
	}

	const delta = chunk.delta;
	if (typeof delta !== "object" || delta === null) {
		return [];
	}

	if ("text" in delta && typeof delta.text === "string") {
		return [{ type: "text", text: delta.text }];
	}

	if ("type" in delta && delta.type === "input_json_delta" && "partial_json" in delta && typeof delta.partial_json === "string") {
		const index = "index" in chunk && typeof chunk.index === "number" ? chunk.index : 0;
		const current = state?.anthropicToolCalls?.get(index);
		if (current) {
			current.argumentsText += delta.partial_json;
		}
	}

	return [];
}

function parseOpenAiMessage(message: unknown): ParsedResponsePart[] {
	if (typeof message !== "object" || message === null) {
		return [];
	}

	const parts: ParsedResponsePart[] = [];
	if ("content" in message) {
		parts.push(...parseMessageContent(message.content));
	}

	if ("tool_calls" in message && Array.isArray(message.tool_calls)) {
		parts.push(...message.tool_calls.flatMap(parseOpenAiToolCall));
	}

	return parts;
}

function parseMessageContent(content: unknown): ParsedResponsePart[] {
	if (typeof content === "string" && content) {
		return [{ type: "text", text: content }];
	}

	if (Array.isArray(content)) {
		return content.flatMap(parseContentPart);
	}

	return [];
}

function parseContentPart(part: unknown): ParsedResponsePart[] {
	if (typeof part === "string" && part) {
		return [{ type: "text", text: part }];
	}

	if (typeof part !== "object" || part === null) {
		return [];
	}

	if ("type" in part && part.type === "tool_use") {
		const toolCall = parseAnthropicToolUse(part);
		return toolCall ? [toolCall] : [];
	}

	if ("text" in part && typeof part.text === "string" && part.text) {
		return [{ type: "text", text: part.text }];
	}

	return parseResponseItem(part);
}

function parseResponseItem(item: unknown): ParsedResponsePart[] {
	if (typeof item !== "object" || item === null) {
		return [];
	}

	if ("type" in item && item.type === "function_call") {
		const callId = getStringField(item, "call_id") ?? getStringField(item, "id");
		const name = getStringField(item, "name");
		const argumentsText = getStringField(item, "arguments") ?? "{}";
		const toolCall = toParsedToolCall(callId, name, argumentsText);
		return toolCall ? [toolCall] : [];
	}

	if ("type" in item && item.type === "message") {
		return parseJsonResponseParts(item);
	}

	if ("content" in item || "output" in item || "output_text" in item || "message" in item || "choices" in item || "text" in item) {
		return parseJsonResponseParts(item);
	}

	return [];
}

function parseOpenAiToolCall(toolCall: unknown): ParsedResponsePart[] {
	if (typeof toolCall !== "object" || toolCall === null) {
		return [];
	}

	const record = toolCall as OpenAiToolCall;
	const parsed = toParsedToolCall(record.id, record.function?.name, record.function?.arguments ?? "{}");
	return parsed ? [parsed] : [];
}

function parseAnthropicToolUse(toolUse: unknown): ParsedToolCallPart | undefined {
	if (typeof toolUse !== "object" || toolUse === null) {
		return undefined;
	}

	const callId = getStringField(toolUse, "id");
	const name = getStringField(toolUse, "name");
	if (!callId || !name || !("input" in toolUse)) {
		return undefined;
	}

	const input = toolUse.input;
	return {
		type: "tool_call",
		callId,
		name,
		input: typeof input === "object" && input !== null && !Array.isArray(input) ? (input as Record<string, unknown>) : {},
	};
}

function toParsedToolCall(
	callId: string | undefined,
	name: string | undefined,
	argumentsText: string,
): ParsedToolCallPart | undefined {
	if (!callId || !name) {
		return undefined;
	}

	return {
		type: "tool_call",
		callId,
		name,
		input: parseToolInput(argumentsText),
	};
}

function parseToolInput(argumentsText: string): Record<string, unknown> {
	if (!argumentsText.trim()) {
		return {};
	}

	try {
		const value = JSON.parse(argumentsText) as unknown;
		return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
	} catch {
		return {};
	}
}

function getStringField(record: object, key: string): string | undefined {
	if (!(key in record)) {
		return undefined;
	}

	const value = (record as Record<string, unknown>)[key];
	return typeof value === "string" ? value : undefined;
}

function containsKey(value: unknown, needle: string, seen = new WeakSet<object>()): boolean {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	if (seen.has(value)) {
		return false;
	}
	seen.add(value);

	if (needle in value) {
		return true;
	}

	if (Array.isArray(value)) {
		return value.some((item) => containsKey(item, needle, seen));
	}

	return Object.values(value).some((item) => containsKey(item, needle, seen));
}
