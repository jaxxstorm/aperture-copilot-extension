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
import { getApertureRequestFailureMessage, parseJsonResponseText, parseSseLine } from "./response";
import { deriveApertureSessionId } from "./session";
import { ApertureLanguageModelInformation, ChatMessage, HFModelItem } from "./types";
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

		const preferredSecretKey =
			model.apiKeyName && model.apiKeyName !== LEGACY_APERTURE_SECRET_KEY ? model.apiKeyName : APERTURE_SECRET_KEY;
		const secret = await resolveApertureSecret(this.context.secrets, preferredSecretKey, LEGACY_APERTURE_SECRET_KEY);
		this.diagnostics.log("Resolved Aperture request credential.", {
			modelId: model.id,
			configId: model.configId,
			secretSource: secret.source,
		});
		const request = await sendApertureRequest(model, messages.map(toChatMessage), secret.value, _options, token, this.diagnostics);

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
	const body = getApertureRequestBody(model.model, messages, apiMode);
	const sessionId = deriveApertureSessionId(options);
	const requestDetails = {
		modelId: model.id,
		configId: model.configId,
		apiMode,
		endpointPath: endpoint.pathname,
		hasApiKey: Boolean(apiKey),
	};
	diagnostics.log("Sending Aperture request.", requestDetails);

	try {
		const response = await fetchApertureEndpoint(endpoint, apiKey, apiMode, sessionId, body, token);
		if (apiMode === "openai" && (await shouldRetryWithOpenAiResponses(response))) {
			const retryApiMode: NonNullable<HFModelItem["apiMode"]> = "openai-responses";
			const retryEndpoint = new URL(getApertureEndpoint(model.baseUrl!, model.model, retryApiMode));
			const retryBody = getApertureRequestBody(model.model, messages, retryApiMode);
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
		let tokenCount = 0;
		await streamChatResponse(response.body!, (value) => {
			tokenCount += 1;
			progress.report(new vscode.LanguageModelTextPart(value));
		});
		return tokenCount > 0;
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

	const text = parseJsonResponseText(body);
	if (text) {
		progress.report(new vscode.LanguageModelTextPart(text));
		return true;
	}

	diagnostics.log("Aperture response JSON had no supported text content.", {
		contentType,
		bodySummary: summarizeUnknown(body),
	});
	return false;
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
