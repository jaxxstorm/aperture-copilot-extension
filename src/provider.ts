import * as vscode from "vscode";
import {
	APERTURE_SECRET_KEY,
	getEffectiveModelSettings,
	inferApertureApiMode,
	LEGACY_APERTURE_SECRET_KEY,
	LEGACY_MODELS_SETTING,
	LEGACY_SETTINGS_NAMESPACE,
	MODELS_SETTING,
	resolveApertureSecret,
	SETTINGS_NAMESPACE,
} from "./aperture";
import { getApertureRequestHeaders } from "./apertureHeaders";
import { getApertureApiModeLabel, getApertureEndpoint, getApertureRequestBody } from "./apertureRouting";
import { ApertureDiagnostics, noopDiagnostics, sanitizeBodyExcerpt, sanitizeError, summarizeUnknown } from "./diagnostics";
import {
	getApertureRequestFailureMessage,
	hasPotentialToolCallShape,
	parseJsonResponseParts,
	parseSseLine,
	SseParseState,
} from "./response";
import { deriveApertureSessionId } from "./session";
import { ApertureLanguageModelInformation, ChatMessage, ChatMessagePart, ChatTool, HFModelItem, ParsedResponsePart } from "./types";
import { getUserAgent } from "./userAgent";

export class HuggingFaceChatModelProvider implements vscode.LanguageModelChatProvider<
	ApertureLanguageModelInformation & vscode.LanguageModelChatInformation
> {
	private readonly onDidChangeEmitter = new vscode.EventEmitter<void>();
	public readonly onDidChangeLanguageModelChatInformation = this.onDidChangeEmitter.event;

	public constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly diagnostics: ApertureDiagnostics = noopDiagnostics,
	) {}

	public notifyModelInformationChanged(): void {
		this.onDidChangeEmitter.fire();
	}

	public dispose(): void {
		this.onDidChangeEmitter.dispose();
	}

	public provideLanguageModelChatInformation(
		_options: unknown,
		_token: vscode.CancellationToken,
	): vscode.ProviderResult<Array<ApertureLanguageModelInformation & vscode.LanguageModelChatInformation>> {
		const canonicalConfig = vscode.workspace.getConfiguration(SETTINGS_NAMESPACE);
		const legacyConfig = vscode.workspace.getConfiguration(LEGACY_SETTINGS_NAMESPACE);
		const { models, source } = getEffectiveModelSettings(
			canonicalConfig.get<HFModelItem[]>(MODELS_SETTING, []),
			legacyConfig.get<HFModelItem[]>(LEGACY_MODELS_SETTING, []),
		);
		this.diagnostics.log("Providing Aperture model information.", {
			modelSettingSource: source,
			count: models.length,
		});

		return models.map((model) => ({
			...model,
			id: model.id,
			name: model.name,
			family: model.model,
			version: "1.0.0",
			detail: `Aperture · ${getApertureApiModeLabel(model.apiMode)}`,
			tooltip: `Aperture-served model using ${getApertureApiModeLabel(model.apiMode)}`,
			maxInputTokens: 128000,
			maxOutputTokens: 8192,
			capabilities: {
				toolCalling: supportsToolCalling(model.apiMode),
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

		const preferredSecretKey =
			model.apiKeyName && model.apiKeyName !== LEGACY_APERTURE_SECRET_KEY ? model.apiKeyName : APERTURE_SECRET_KEY;
		const secret = await resolveApertureSecret(this.context.secrets, preferredSecretKey, LEGACY_APERTURE_SECRET_KEY);
		this.diagnostics.log("Resolved Aperture request credential.", {
			modelId: model.id,
			configId: model.configId,
			secretSource: secret.source,
		});
		const request = await sendApertureRequest(
			model,
			messages.map(toChatMessage),
			secret.value,
			_options,
			token,
			this.diagnostics,
		);

		if (!request.response.ok) {
			const body = await request.response.text();
			const bodyExcerpt = sanitizeBodyExcerpt(body);
			this.diagnostics.log("Aperture request returned an error response.", {
				modelId: model.id,
				configId: model.configId,
				apiMode: request.apiMode,
				endpointPath: request.endpoint.pathname,
				status: request.response.status,
				statusText: request.response.statusText,
				bodyExcerpt,
			});
			throw new Error(getApertureRequestFailureMessage(request.response.status, request.response.statusText, body));
		}

		if (!request.response.body) {
			this.diagnostics.log("Aperture request returned no response body.", {
				modelId: model.id,
				configId: model.configId,
				apiMode: request.apiMode,
				endpointPath: request.endpoint.pathname,
			});
			throw new Error("Aperture request succeeded but returned no response body.");
		}

		const didReportContent = await reportApertureResponse(request.response, progress, this.diagnostics);
		if (!didReportContent) {
			this.diagnostics.log("Aperture request returned no usable response content.", {
				modelId: model.id,
				configId: model.configId,
				apiMode: request.apiMode,
				endpointPath: request.endpoint.pathname,
			});
			throw new Error("Aperture request succeeded but returned no usable response content.");
		}
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
	diagnostics: ApertureDiagnostics,
): Promise<{ response: Response; apiMode: NonNullable<HFModelItem["apiMode"]>; endpoint: URL }> {
	const apiMode: NonNullable<HFModelItem["apiMode"]> = model.apiMode ?? inferApertureApiMode(model.model) ?? "openai";
	const endpoint = new URL(getApertureEndpoint(model.baseUrl!, model.model, apiMode));
	const tools = supportsToolCalling(apiMode) ? toChatTools(options.tools ?? []) : [];
	const body = getApertureRequestBody(model.model, messages, apiMode, tools);
	const sessionId = deriveApertureSessionId(options);
	const requestDetails = {
		modelId: model.id,
		configId: model.configId,
		apiMode,
		endpointPath: endpoint.pathname,
		hasApiKey: Boolean(apiKey),
		toolCount: tools.length,
	};
	diagnostics.log("Sending Aperture request.", requestDetails);

	try {
		const response = await fetchApertureEndpoint(endpoint, apiKey, apiMode, sessionId, body, token);
		if (apiMode === "openai" && (await shouldRetryWithOpenAiResponses(response))) {
			const retryApiMode: NonNullable<HFModelItem["apiMode"]> = "openai-responses";
			const retryEndpoint = new URL(getApertureEndpoint(model.baseUrl!, model.model, retryApiMode));
			const retryTools = supportsToolCalling(retryApiMode) ? tools : [];
			const retryBody = getApertureRequestBody(model.model, messages, retryApiMode, retryTools);
			diagnostics.log("Retrying Aperture request with OpenAI Responses API.", {
				...requestDetails,
				apiMode: retryApiMode,
				endpointPath: retryEndpoint.pathname,
				previousStatus: response.status,
				previousStatusText: response.statusText,
			});
			return {
				response: await fetchApertureEndpoint(retryEndpoint, apiKey, retryApiMode, sessionId, retryBody, token),
				apiMode: retryApiMode,
				endpoint: retryEndpoint,
			};
		}

		return { response, apiMode, endpoint };
	} catch (error) {
		diagnostics.log("Aperture request failed before receiving a response.", {
			modelId: model.id,
			configId: model.configId,
			apiMode,
			endpointPath: endpoint.pathname,
			error: sanitizeError(error),
		});
		throw error;
	}
}

async function fetchApertureEndpoint(
	endpoint: URL,
	apiKey: string | undefined,
	apiMode: NonNullable<HFModelItem["apiMode"]>,
	sessionId: string,
	body: Record<string, unknown>,
	token: vscode.CancellationToken,
): Promise<Response> {
	return fetch(endpoint, {
		method: "POST",
		headers: getApertureRequestHeaders(apiKey, apiMode, getUserAgent(vscode.version), sessionId),
		body: JSON.stringify(body),
		signal: tokenToSignal(token),
	});
}

async function shouldRetryWithOpenAiResponses(response: Response): Promise<boolean> {
	if (response.ok) {
		return false;
	}

	const body = await response.clone().text();
	return body.includes("v1/responses") && body.includes("v1/chat/completions");
}

async function reportApertureResponse(
	response: Response,
	progress: vscode.Progress<vscode.LanguageModelResponsePart>,
	diagnostics: ApertureDiagnostics = noopDiagnostics,
): Promise<boolean> {
	const contentType = response.headers.get("content-type") ?? "";
	if (contentType.includes("text/event-stream")) {
		let partCount = 0;
		await streamChatResponse(response.body!, (part) => {
			partCount += reportResponsePart(part, progress);
		});
		return partCount > 0;
	}

	let body: unknown;
	try {
		body = (await response.json()) as unknown;
	} catch (error) {
		diagnostics.log("Aperture response JSON parsing failed.", {
			contentType,
			error: sanitizeError(error),
		});
		return false;
	}

	const parts = parseJsonResponseParts(body);
	let partCount = 0;
	for (const part of parts) {
		partCount += reportResponsePart(part, progress);
	}

	if (partCount > 0) {
		return true;
	}

	diagnostics.log("Aperture response JSON had no supported text content.", {
		contentType,
		bodySummary: summarizeUnknown(body),
		hasPotentialToolCallShape: hasPotentialToolCallShape(body),
	});
	return false;
}

export async function streamChatResponse(
	body: ReadableStream<Uint8Array>,
	onPart: (value: ParsedResponsePart) => void,
): Promise<void> {
	const reader = body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	const parseState: SseParseState = {};

	while (true) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}

		buffer += decoder.decode(value, { stream: true });
		const lines = buffer.split(/\r?\n/);
		buffer = lines.pop() ?? "";

		for (const line of lines) {
			const parts = parseSseLine(line, parseState);
			for (const part of parts) {
				onPart(part);
			}
		}
	}

	const tail = decoder.decode();
	if (tail) {
		buffer += tail;
	}

	const parts = parseSseLine(buffer, parseState);
	for (const part of parts) {
		onPart(part);
	}
}

function toChatMessage(message: vscode.LanguageModelChatRequestMessage): ChatMessage {
	return {
		role: message.role === vscode.LanguageModelChatMessageRole.Assistant ? "assistant" : "user",
		content: toChatMessageParts(message.content),
	};
}

function messageContentToString(content: readonly unknown[]): string {
	return toChatMessageParts(content)
		.map((part) => {
			switch (part.type) {
				case "text":
					return part.text;
				case "tool_call":
					return `${part.name} ${JSON.stringify(part.input)}`;
				case "tool_result":
					return part.content;
			}
		})
		.join("");
}

function toChatMessageParts(content: readonly unknown[]): ChatMessagePart[] {
	const parts = content
		.flatMap((part): ChatMessagePart[] => {
			const toolCall = toToolCallPart(part);
			if (toolCall) {
				return [toolCall];
			}

			const toolResult = toToolResultPart(part);
			if (toolResult) {
				return [toolResult];
			}

			const text = partToText(part);
			return text ? [{ type: "text", text }] : [];
		});

	return parts.length > 0 ? parts : [{ type: "text", text: "" }];
}

function partToText(part: unknown): string | undefined {
	if (part instanceof vscode.LanguageModelTextPart) {
		return part.value;
	}

	if (typeof part === "object" && part !== null && "value" in part && typeof part.value === "string") {
		return part.value;
	}

	if (typeof part === "object" && part !== null && "text" in part && typeof part.text === "string") {
		return part.text;
	}

	return undefined;
}

function toToolCallPart(part: unknown): ChatMessagePart | undefined {
	if (
		typeof part !== "object" ||
		part === null ||
		!("callId" in part) ||
		typeof part.callId !== "string" ||
		!("name" in part) ||
		typeof part.name !== "string" ||
		!("input" in part)
	) {
		return undefined;
	}

	return {
		type: "tool_call",
		callId: part.callId,
		name: part.name,
		input: toRecord(part.input),
	};
}

function toToolResultPart(part: unknown): ChatMessagePart | undefined {
	if (
		typeof part !== "object" ||
		part === null ||
		!("callId" in part) ||
		typeof part.callId !== "string" ||
		!("content" in part) ||
		!Array.isArray(part.content)
	) {
		return undefined;
	}

	return {
		type: "tool_result",
		callId: part.callId,
		content: part.content.map(partToToolResultText).join(""),
	};
}

function partToToolResultText(part: unknown): string {
	const text = partToText(part);
	if (text !== undefined) {
		return text;
	}

	if (typeof part === "object" && part !== null && "data" in part && part.data instanceof Uint8Array) {
		return `[${"mimeType" in part && typeof part.mimeType === "string" ? part.mimeType : "data"}]`;
	}

	if (typeof part === "string") {
		return part;
	}

	return "";
}

function toChatTools(tools: readonly vscode.LanguageModelChatTool[]): ChatTool[] {
	return tools.map((tool) => ({
		name: tool.name,
		description: tool.description,
		inputSchema: tool.inputSchema,
	}));
}

function reportResponsePart(
	part: ParsedResponsePart,
	progress: vscode.Progress<vscode.LanguageModelResponsePart>,
): number {
	if (part.type === "text") {
		if (!part.text) {
			return 0;
		}

		progress.report(new vscode.LanguageModelTextPart(part.text));
		return 1;
	}

	progress.report(new vscode.LanguageModelToolCallPart(part.callId, part.name, part.input));
	return 1;
}

function supportsToolCalling(apiMode: HFModelItem["apiMode"]): boolean {
	switch (apiMode) {
		case "openai":
		case "openai-responses":
		case "anthropic":
		case "bedrock":
		case undefined:
			return true;
		default:
			return false;
	}
}

function toRecord(value: unknown): Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
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
