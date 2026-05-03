export type ProviderId = "aperture" | "openai" | "ollama" | "anthropic" | "gemini" | string;

export interface HFModelItem {
	id: string;
	name: string;
	model: string;
	provider: ProviderId;
	configId: string;
	baseUrl?: string;
	apiKeyName?: string;
	apiMode?: "openai" | "anthropic" | "bedrock";
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
	apiMode?: "openai" | "anthropic" | "bedrock";
}

export interface ChatMessage {
	role: "system" | "user" | "assistant";
	content: string;
}

export interface ChatCompletionChunk {
	choices?: Array<{
		delta?: {
			content?: string;
		};
		message?: {
			content?: string;
		};
	}>;
}
