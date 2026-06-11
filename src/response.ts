import { sanitizeBodyExcerpt } from "./diagnostics";
import { ChatCompletionChunk } from "./types";

export function parseSseLine(line: string): string | undefined {
	const trimmed = line.trim();
	if (!trimmed || !trimmed.startsWith("data:")) {
		return undefined;
	}

	const data = trimmed.slice("data:".length).trim();
	if (!data || data === "[DONE]") {
		return undefined;
	}

	let chunk: ChatCompletionChunk;
	try {
		chunk = JSON.parse(data) as ChatCompletionChunk;
	} catch {
		return undefined;
	}

	return (
		chunk.choices?.[0]?.delta?.content ??
		chunk.choices?.[0]?.message?.content ??
		parseOpenAiResponsesDelta(chunk) ??
		parseAnthropicContentDelta(chunk)
	);
}

export function parseJsonResponseText(body: unknown): string | undefined {
	if (typeof body !== "object" || body === null) {
		return undefined;
	}

	if ("content" in body && Array.isArray(body.content)) {
		const text = body.content
			.map((part) => {
				if (typeof part === "object" && part !== null && "text" in part && typeof part.text === "string") {
					return part.text;
				}

				if (typeof part === "string") {
					return part;
				}

				return "";
			})
			.join("");
		return text || undefined;
	}

	if ("output" in body && typeof body.output === "object" && body.output !== null && "message" in body.output) {
		return parseJsonResponseText(body.output.message);
	}

	if ("output" in body && Array.isArray(body.output)) {
		const text = body.output.map(parseJsonResponseText).join("");
		return text || undefined;
	}

	if ("output_text" in body && typeof body.output_text === "string" && body.output_text) {
		return body.output_text;
	}

	if ("message" in body && typeof body.message === "object") {
		return parseJsonResponseText(body.message);
	}

	if ("choices" in body && Array.isArray(body.choices)) {
		const first = body.choices[0] as unknown;
		if (typeof first === "object" && first !== null && "message" in first) {
			return parseJsonResponseText(first.message);
		}
	}

	if ("text" in body && typeof body.text === "string" && body.text) {
		return body.text;
	}

	return undefined;
}

export function getApertureRequestFailureMessage(status: number, statusText: string, body: string): string {
	const bodyExcerpt = sanitizeBodyExcerpt(body);
	const detail = bodyExcerpt ? ` ${bodyExcerpt}` : "";
	return `Aperture request failed: ${status} ${statusText}.${detail}`;
}

function parseOpenAiResponsesDelta(chunk: unknown): string | undefined {
	if (typeof chunk !== "object" || chunk === null) {
		return undefined;
	}

	if ("type" in chunk && chunk.type === "response.output_text.delta" && "delta" in chunk && typeof chunk.delta === "string") {
		return chunk.delta;
	}

	if ("type" in chunk && chunk.type === "response.output_item.done" && "item" in chunk) {
		return parseJsonResponseText(chunk.item);
	}

	return undefined;
}

function parseAnthropicContentDelta(chunk: unknown): string | undefined {
	if (typeof chunk !== "object" || chunk === null) {
		return undefined;
	}

	if (!("type" in chunk) || chunk.type !== "content_block_delta" || !("delta" in chunk)) {
		return undefined;
	}

	const delta = chunk.delta;
	if (typeof delta !== "object" || delta === null || !("text" in delta) || typeof delta.text !== "string") {
		return undefined;
	}

	return delta.text;
}
