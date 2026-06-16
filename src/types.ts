export type ProviderId = "aperture" | "openai" | "ollama" | "anthropic" | "gemini" | string;

export interface HFModelItem {
	id: string;
	name: string;
	model: string;
	provider: ProviderId;
	configId: string;
	baseUrl?: string;
	apiKeyName?: string;
	apiMode?: "openai" | "openai-responses" | "anthropic" | "bedrock";
}

export interface ApertureLanguageModelInformation extends HFModelItem {
	id: string;
	name: string;
	family: string;
	version: string;
	maxInputTokens: number;
	maxOutputTokens: number;
	capabilities: {
		toolCalling: boolean;
		imageInput: boolean;
	};
	detail: string;
	tooltip: string;
	isUserSelectable: boolean;
	modelPickerCategory: {
		label: string;
		order: number;
	};
}

export interface ApertureModelConfig {
	id: string;
	name: string;
	model: string;
	apiMode?: "openai" | "openai-responses" | "anthropic" | "bedrock";
}

export interface ChatMessage {
	role: "system" | "user" | "assistant";
	content: ChatMessagePart[];
}

export type ChatMessagePart = ChatTextPart | ChatToolCallPart | ChatToolResultPart;

export interface ChatTextPart {
	type: "text";
	text: string;
}

export interface ChatToolCallPart {
	type: "tool_call";
	callId: string;
	name: string;
	input: Record<string, unknown>;
}

export interface ChatToolResultPart {
	type: "tool_result";
	callId: string;
	content: string;
}

export interface ChatTool {
	name: string;
	description: string;
	inputSchema?: object;
}

export type ParsedResponsePart = ParsedTextPart | ParsedToolCallPart;

export interface ParsedTextPart {
	type: "text";
	text: string;
}

export interface ParsedToolCallPart {
	type: "tool_call";
	callId: string;
	name: string;
	input: Record<string, unknown>;
}

export interface ChatCompletionChunk {
	choices?: Array<{
		delta?: {
			content?: string;
			tool_calls?: OpenAiToolCallDelta[];
		};
		message?: {
			content?: string;
			tool_calls?: OpenAiToolCall[];
		};
		finish_reason?: string | null;
	}>;
}

export interface OpenAiToolCall {
	id?: string;
	type?: string;
	function?: {
		name?: string;
		arguments?: string;
	};
}

export interface OpenAiToolCallDelta extends OpenAiToolCall {
	index?: number;
}
