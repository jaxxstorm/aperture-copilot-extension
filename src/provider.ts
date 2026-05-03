import * as vscode from "vscode";
import { APERTURE_SECRET_KEY, inferApertureApiMode, MODELS_SETTING, SETTINGS_NAMESPACE } from "./aperture";
import { getApertureRequestHeaders } from "./apertureHeaders";
import { deriveApertureSessionId } from "./session";
import { ApertureLanguageModelInformation, ChatCompletionChunk, ChatMessage, HFModelItem } from "./types";
import { getUserAgent } from "./userAgent";

export class HuggingFaceChatModelProvider implements vscode.LanguageModelChatProvider<
	ApertureLanguageModelInformation & vscode.LanguageModelChatInformation
> {
	public constructor(private readonly context: vscode.ExtensionContext) {}

	public provideLanguageModelChatInformation(
		_options: unknown,
		_token: vscode.CancellationToken,
	): vscode.ProviderResult<Array<ApertureLanguageModelInformation & vscode.LanguageModelChatInformation>> {
		const config = vscode.workspace.getConfiguration(SETTINGS_NAMESPACE);
		const models = config.get<HFModelItem[]>(MODELS_SETTING, []);

		return models.map((model) => ({
			...model,
			id: model.id,
			name: model.name,
			family: model.provider,
			version: "1.0.0",
			detail: `${model.provider} (Aperture Copilot)`,
			tooltip: `${model.provider} (Aperture Copilot)`,
			maxInputTokens: 128000,
			maxOutputTokens: 8192,
			capabilities: {
				toolCalling: true,
				imageInput: false,
			},
			isUserSelectable: true,
			modelPickerCategory: {
				label: "Aperture",
				order: 50,
			},
		}));
	}

	public async provideLanguageModelChatResponse(
		model: ApertureLanguageModelInformation & vscode.LanguageModelChatInformation,
		messages: readonly vscode.LanguageModelChatRequestMessage[],
		_options: vscode.ProvideLanguageModelChatResponseOptions,
		progress: vscode.Progress<vscode.LanguageModelResponsePart>,
		token: vscode.CancellationToken,
	): Promise<void> {
		if (!model.baseUrl) {
			throw new Error(`Model ${model.name} is missing a base URL.`);
		}

		const apiKey = await this.context.secrets.get(model.apiKeyName ?? APERTURE_SECRET_KEY);
		const response = await sendApertureRequest(model, messages.map(toChatMessage), apiKey, _options, token);

		if (!response.ok) {
			const body = await response.text();
			const detail = body ? `\n${body}` : "";
			throw new Error(`Aperture request failed: ${response.status} ${response.statusText}${detail}`);
		}

		if (!response.body) {
			return;
		}

		await reportApertureResponse(response, progress);
	}

	public async provideTokenCount(
		_model: ApertureLanguageModelInformation & vscode.LanguageModelChatInformation,
		text: string | vscode.LanguageModelChatRequestMessage,
		_token: vscode.CancellationToken,
	): Promise<number> {
		const content = typeof text === "string" ? text : messageContentToString(text.content);
		return Math.ceil(content.length / 4);
	}
}

async function sendApertureRequest(
	model: ApertureLanguageModelInformation,
	messages: ChatMessage[],
	apiKey: string | undefined,
	options: vscode.ProvideLanguageModelChatResponseOptions,
	token: vscode.CancellationToken,
): Promise<Response> {
	const apiMode: NonNullable<HFModelItem["apiMode"]> = model.apiMode ?? inferApertureApiMode(model.model) ?? "openai";
	const endpoint = getApertureEndpoint(model.baseUrl!, model.model, apiMode);
	const body = getApertureRequestBody(model.model, messages, apiMode);
	const sessionId = deriveApertureSessionId(options);

	return fetch(endpoint, {
		method: "POST",
		headers: getApertureRequestHeaders(apiKey, apiMode, getUserAgent(vscode.version), sessionId),
		body: JSON.stringify(body),
		signal: tokenToSignal(token),
	});
}

function getApertureEndpoint(baseUrl: string, modelId: string, apiMode: NonNullable<HFModelItem["apiMode"]>): string {
	switch (apiMode) {
		case "anthropic":
			return `${baseUrl}/v1/messages`;
		case "bedrock":
			return `${baseUrl}/bedrock/model/${encodeURIComponent(modelId)}/invoke`;
		case "openai":
		default:
			return `${baseUrl}/v1/chat/completions`;
	}
}

function getApertureRequestBody(
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

async function reportApertureResponse(
	response: Response,
	progress: vscode.Progress<vscode.LanguageModelResponsePart>,
): Promise<void> {
	const contentType = response.headers.get("content-type") ?? "";
	if (contentType.includes("text/event-stream")) {
		await streamChatResponse(response.body!, (value) => {
			progress.report(new vscode.LanguageModelTextPart(value));
		});
		return;
	}

	const body = (await response.json()) as unknown;
	const text = parseJsonResponseText(body);
	if (text) {
		progress.report(new vscode.LanguageModelTextPart(text));
	}
}

export async function streamChatResponse(
	body: ReadableStream<Uint8Array>,
	onToken: (value: string) => void,
): Promise<void> {
	const reader = body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";

	while (true) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}

		buffer += decoder.decode(value, { stream: true });
		const lines = buffer.split(/\r?\n/);
		buffer = lines.pop() ?? "";

		for (const line of lines) {
			const token = parseSseLine(line);
			if (token) {
				onToken(token);
			}
		}
	}

	const tail = decoder.decode();
	if (tail) {
		buffer += tail;
	}

	const token = parseSseLine(buffer);
	if (token) {
		onToken(token);
	}
}

function toChatMessage(message: vscode.LanguageModelChatRequestMessage): ChatMessage {
	return {
		role: message.role === vscode.LanguageModelChatMessageRole.Assistant ? "assistant" : "user",
		content: messageContentToString(message.content),
	};
}

function messageContentToString(content: readonly unknown[]): string {
	return content
		.map((part) => {
			if (part instanceof vscode.LanguageModelTextPart) {
				return part.value;
			}

			if (typeof part === "object" && part !== null && "value" in part && typeof part.value === "string") {
				return part.value;
			}

			if (typeof part === "object" && part !== null && "text" in part && typeof part.text === "string") {
				return part.text;
			}

			return "";
		})
		.join("");
}

function parseSseLine(line: string): string | undefined {
	const trimmed = line.trim();
	if (!trimmed || !trimmed.startsWith("data:")) {
		return undefined;
	}

	const data = trimmed.slice("data:".length).trim();
	if (!data || data === "[DONE]") {
		return undefined;
	}

	const chunk = JSON.parse(data) as ChatCompletionChunk;
	return (
		chunk.choices?.[0]?.delta?.content ?? chunk.choices?.[0]?.message?.content ?? parseAnthropicContentDelta(chunk)
	);
}

function parseJsonResponseText(body: unknown): string | undefined {
	if (typeof body !== "object" || body === null) {
		return undefined;
	}

	if ("content" in body && Array.isArray(body.content)) {
		return body.content
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
	}

	if ("output" in body && typeof body.output === "object" && body.output !== null && "message" in body.output) {
		return parseJsonResponseText(body.output.message);
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

	if ("text" in body && typeof body.text === "string") {
		return body.text;
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

function tokenToSignal(token: vscode.CancellationToken): AbortSignal | undefined {
	if (!token || !token.onCancellationRequested) {
		return undefined;
	}

	const controller = new AbortController();
	if (token.isCancellationRequested) {
		controller.abort();
		return controller.signal;
	}

	token.onCancellationRequested(() => {
		controller.abort();
	});

	return controller.signal;
}
