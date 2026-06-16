import { ChatMessage, ChatMessagePart, ChatTool, ChatToolCallPart, ChatToolResultPart, HFModelItem } from "./types";

export function getApertureApiModeLabel(apiMode: HFModelItem["apiMode"]): string {
	switch (apiMode) {
		case "anthropic":
			return "Anthropic Messages";
		case "bedrock":
			return "Bedrock";
		case "openai-responses":
			return "OpenAI Responses";
		case "openai":
		default:
			return "OpenAI-compatible chat";
	}
}

export function getApertureEndpoint(
	baseUrl: string,
	modelId: string,
	apiMode: NonNullable<HFModelItem["apiMode"]>,
): string {
	switch (apiMode) {
		case "anthropic":
			return `${baseUrl}/v1/messages`;
		case "bedrock":
			return `${baseUrl}/bedrock/model/${encodeURIComponent(modelId)}/invoke`;
		case "openai-responses":
			return `${baseUrl}/v1/responses`;
		case "openai":
		default:
			return `${baseUrl}/v1/chat/completions`;
	}
}

export function getApertureRequestBody(
	modelId: string,
	messages: ChatMessage[],
	apiMode: NonNullable<HFModelItem["apiMode"]>,
	tools: readonly ChatTool[] = [],
): Record<string, unknown> {
	switch (apiMode) {
		case "anthropic":
			return withAnthropicTools(
				{
					model: modelId,
					max_tokens: 8192,
					messages: toAnthropicMessages(stripSystemMessages(messages)),
					stream: false,
				},
				tools,
			);
		case "bedrock":
			return withAnthropicTools(
				{
					anthropic_version: "bedrock-2023-05-31",
					max_tokens: 8192,
					messages: toAnthropicMessages(stripSystemMessages(messages)),
				},
				tools,
			);
		case "openai-responses":
			return withOpenAiResponsesTools(
				{
					model: modelId,
					input: toOpenAiResponsesInput(messages),
					stream: true,
				},
				tools,
			);
		case "openai":
		default:
			return withOpenAiTools(
				{
					model: modelId,
					messages: toOpenAiMessages(messages),
					stream: true,
				},
				tools,
			);
	}
}

function stripSystemMessages(messages: ChatMessage[]): ChatMessage[] {
	return messages
		.filter((message) => message.role !== "system")
		.map((message) => ({
			role: message.role === "assistant" ? "assistant" : "user",
			content: message.content,
		}));
}

function toOpenAiMessages(messages: ChatMessage[]): unknown[] {
	return messages.flatMap((message) => {
		const text = textContent(message.content);
		const toolCalls = message.content.filter(isToolCallPart);
		const toolResults = message.content.filter(isToolResultPart);
		const converted: unknown[] = [];

		if (message.role === "assistant") {
			converted.push({
				role: "assistant",
				content: text || null,
				...(toolCalls.length > 0
					? {
						tool_calls: toolCalls.map((toolCall) => ({
							id: toolCall.callId,
							type: "function",
							function: {
								name: toolCall.name,
								arguments: JSON.stringify(toolCall.input),
							},
						})),
					}
					: {}),
			});
			return converted;
		}

		if (text || toolResults.length === 0) {
			converted.push({ role: message.role, content: text });
		}

		for (const toolResult of toolResults) {
			converted.push({
				role: "tool",
				tool_call_id: toolResult.callId,
				content: toolResult.content,
			});
		}

		return converted;
	});
}

function toOpenAiResponsesInput(messages: ChatMessage[]): unknown[] {
	return messages.flatMap((message) => {
		const text = textContent(message.content);
		const toolCalls = message.content.filter(isToolCallPart);
		const toolResults = message.content.filter(isToolResultPart);
		const converted: unknown[] = [];

		if (text || (toolCalls.length === 0 && toolResults.length === 0)) {
			converted.push({
				role: message.role === "assistant" ? "assistant" : message.role === "system" ? "system" : "user",
				content: text,
			});
		}

		for (const toolCall of toolCalls) {
			converted.push({
				type: "function_call",
				call_id: toolCall.callId,
				name: toolCall.name,
				arguments: JSON.stringify(toolCall.input),
			});
		}

		for (const toolResult of toolResults) {
			converted.push({
				type: "function_call_output",
				call_id: toolResult.callId,
				output: toolResult.content,
			});
		}

		return converted;
	});
}

function toAnthropicMessages(messages: ChatMessage[]): unknown[] {
	return messages.map((message) => ({
		role: message.role === "assistant" ? "assistant" : "user",
		content: toAnthropicContent(message.content),
	}));
}

function toAnthropicContent(content: readonly ChatMessagePart[]): unknown[] {
	const blocks: unknown[] = [];
	const text = textContent(content);

	if (text) {
		blocks.push({ type: "text", text });
	}

	for (const part of content) {
		if (part.type === "tool_call") {
			blocks.push({
				type: "tool_use",
				id: part.callId,
				name: part.name,
				input: part.input,
			});
		}

		if (part.type === "tool_result") {
			blocks.push({
				type: "tool_result",
				tool_use_id: part.callId,
				content: part.content,
			});
		}
	}

	return blocks.length > 0 ? blocks : [{ type: "text", text: "" }];
}

function withOpenAiTools(body: Record<string, unknown>, tools: readonly ChatTool[]): Record<string, unknown> {
	if (tools.length === 0) {
		return body;
	}

	return {
		...body,
		tools: tools.map((tool) => ({
			type: "function",
			function: {
				name: tool.name,
				description: tool.description,
				parameters: tool.inputSchema ?? emptyJsonSchema(),
			},
		})),
	};
}

function withOpenAiResponsesTools(body: Record<string, unknown>, tools: readonly ChatTool[]): Record<string, unknown> {
	if (tools.length === 0) {
		return body;
	}

	return {
		...body,
		tools: tools.map((tool) => ({
			type: "function",
			name: tool.name,
			description: tool.description,
			parameters: tool.inputSchema ?? emptyJsonSchema(),
		})),
	};
}

function withAnthropicTools(body: Record<string, unknown>, tools: readonly ChatTool[]): Record<string, unknown> {
	if (tools.length === 0) {
		return body;
	}

	return {
		...body,
		tools: tools.map((tool) => ({
			name: tool.name,
			description: tool.description,
			input_schema: tool.inputSchema ?? emptyJsonSchema(),
		})),
	};
}

function textContent(content: readonly ChatMessagePart[]): string {
	return content
		.filter((part) => part.type === "text")
		.map((part) => part.text)
		.join("");
}

function isToolCallPart(part: ChatMessagePart): part is ChatToolCallPart {
	return part.type === "tool_call";
}

function isToolResultPart(part: ChatMessagePart): part is ChatToolResultPart {
	return part.type === "tool_result";
}

function emptyJsonSchema(): object {
	return {
		type: "object",
		properties: {},
	};
}
