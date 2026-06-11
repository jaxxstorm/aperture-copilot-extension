import { ChatMessage, HFModelItem } from "./types";

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
): Record<string, unknown> {
	switch (apiMode) {
		case "anthropic":
			return {
				model: modelId,
				max_tokens: 8192,
				messages: stripSystemMessages(messages),
				stream: false,
			};
		case "bedrock":
			return {
				anthropic_version: "bedrock-2023-05-31",
				max_tokens: 8192,
				messages: stripSystemMessages(messages),
			};
		case "openai-responses":
			return {
				model: modelId,
				input: messages.map((message) => ({
					role: message.role === "assistant" ? "assistant" : message.role === "system" ? "system" : "user",
					content: message.content,
				})),
				stream: true,
			};
		case "openai":
		default:
			return {
				model: modelId,
				messages,
				stream: true,
			};
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
