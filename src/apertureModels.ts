import { ApertureModelConfig, HFModelItem } from "./types";
import { ApertureDiagnostics, noopDiagnostics, sanitizeBodyExcerpt, sanitizeError, summarizeUnknown } from "./diagnostics";
import { getUserAgent } from "./userAgent";

export const APERTURE_PROVIDER_ID = "aperture";
export const APERTURE_CHAT_VENDOR_ID = "aperture-copilot";
export const APERTURE_SECRET_KEY = "aperture.apiKey";
export const LEGACY_APERTURE_SECRET_KEY = "oaicopilot.apiKey.aperture";
export const MODELS_SETTING = "models";
export const LEGACY_MODELS_SETTING = "models";
export const APERTURE_BASE_URL_SETTING = "baseUrl";
export const LEGACY_APERTURE_BASE_URL_SETTING = "aperture.baseUrl";
export const APERTURE_PROVIDER_ID_SETTING = "providerId";
export const LEGACY_APERTURE_PROVIDER_ID_SETTING = "aperture.providerId";
export const SETTINGS_NAMESPACE = "aperture";
export const LEGACY_SETTINGS_NAMESPACE = "oaicopilot";

type FetchLike = typeof fetch;

type UnknownRecord = Record<string, unknown>;

export interface ModelSettingsMergeResult {
	models: HFModelItem[];
	added: number;
	updated: number;
	preserved: number;
	pruned: number;
}

export interface EffectiveModelSettings {
	models: HFModelItem[];
	source: "canonical" | "legacy" | "empty";
}

export interface ResolvedApertureSecret {
	value: string | undefined;
	source: "canonical" | "legacy" | "empty";
}

export interface SecretStorageLike {
	get(key: string): PromiseLike<string | undefined>;
}

export function getEffectiveModelSettings(
	canonicalModels: readonly HFModelItem[] | undefined,
	legacyModels: readonly HFModelItem[] | undefined,
): EffectiveModelSettings {
	if (canonicalModels && canonicalModels.length > 0) {
		return {
			models: [...canonicalModels],
			source: "canonical",
		};
	}

	if (legacyModels && legacyModels.length > 0) {
		return {
			models: [...legacyModels],
			source: "legacy",
		};
	}

	return {
		models: [],
		source: "empty",
	};
}

export async function resolveApertureSecret(
	secrets: SecretStorageLike,
	canonicalKey = APERTURE_SECRET_KEY,
	legacyKey = LEGACY_APERTURE_SECRET_KEY,
): Promise<ResolvedApertureSecret> {
	const canonicalValue = await secrets.get(canonicalKey);
	if (canonicalValue) {
		return {
			value: canonicalValue,
			source: "canonical",
		};
	}

	const legacyValue = await secrets.get(legacyKey);
	if (legacyValue) {
		return {
			value: legacyValue,
			source: "legacy",
		};
	}

	return {
		value: undefined,
		source: "empty",
	};
}

export function normalizeBaseUrl(input: string): string {
	const trimmed = input.trim();
	if (!trimmed) {
		throw new Error("Aperture base URL is required.");
	}

	let url: URL;
	try {
		url = new URL(trimmed);
	} catch {
		throw new Error("Aperture base URL must be a valid URL, for example http://ai.");
	}

	if (url.protocol !== "http:" && url.protocol !== "https:") {
		throw new Error("Aperture base URL must use http or https.");
	}

	url.hash = "";
	url.search = "";
	return url.toString().replace(/\/$/, "");
}

export async function discoverApertureModels(
	baseUrl: string,
	apiKey?: string,
	fetchImpl: FetchLike = fetch,
	userAgent = getUserAgent(),
	diagnostics: ApertureDiagnostics = noopDiagnostics,
): Promise<ApertureModelConfig[]> {
	const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
	const paths = ["/ui/api/model/config", "/ui/api/models", "/v1/models"];

	let lastError: Error | undefined;
	for (const path of paths) {
		try {
			diagnostics.log("Discovering Aperture models.", { path });
			const response = await fetchImpl(`${normalizedBaseUrl}${path}`, {
				headers: buildHeaders(apiKey, userAgent),
			});
			if (!response.ok) {
				const body = await response.text();
				diagnostics.log("Aperture model discovery endpoint failed.", {
					path,
					status: response.status,
					statusText: response.statusText,
					bodyExcerpt: sanitizeBodyExcerpt(body),
				});
				lastError = new Error(`Aperture model discovery failed at ${path}: ${response.status} ${response.statusText}`);
				continue;
			}

			const body = (await response.json()) as unknown;
			const models = parseApertureModels(body);
			if (models.length > 0) {
				diagnostics.log("Aperture model discovery endpoint returned models.", {
					path,
					count: models.length,
				});
				return models;
			}
			diagnostics.log("Aperture model discovery endpoint returned no models.", {
				path,
				bodySummary: summarizeUnknown(body),
			});
			lastError = new Error(`Aperture model discovery at ${path} returned no models.`);
		} catch (error) {
			diagnostics.log("Aperture model discovery endpoint threw.", {
				path,
				error: sanitizeError(error),
			});
			lastError = error instanceof Error ? error : new Error(String(error));
		}
	}

	throw lastError ?? new Error("Aperture model discovery failed.");
}

export function parseApertureModels(body: unknown): ApertureModelConfig[] {
	const candidates = collectModelCandidates(body);
	const seen = new Set<string>();
	const models: ApertureModelConfig[] = [];

	for (const candidate of candidates) {
		const id = getString(candidate, "id") ?? getString(candidate, "model") ?? getString(candidate, "name");
		if (!id || seen.has(id)) {
			continue;
		}

		seen.add(id);
		models.push({
			id,
			name: getString(candidate, "name") ?? id,
			model: getString(candidate, "model") ?? id,
			apiMode: getApiMode(candidate, id),
		});
	}

	return models;
}

export function toHFModelItems(
	models: readonly ApertureModelConfig[],
	baseUrl: string,
	providerId = APERTURE_PROVIDER_ID,
): HFModelItem[] {
	const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
	return models.map((model) => ({
		id: model.id,
		name: model.name,
		model: model.model,
		provider: providerId,
		configId: `${providerId}:${model.id}`,
		baseUrl: normalizedBaseUrl,
		apiKeyName: APERTURE_SECRET_KEY,
		apiMode: model.apiMode ?? inferApertureApiMode(model.model),
	}));
}

export function mergeModelSettings(
	existing: readonly HFModelItem[],
	discovered: readonly HFModelItem[],
	providerId = APERTURE_PROVIDER_ID,
): HFModelItem[] {
	return mergeModelSettingsWithResult(existing, discovered, providerId).models;
}

export function mergeModelSettingsWithResult(
	existing: readonly HFModelItem[],
	discovered: readonly HFModelItem[],
	providerId = APERTURE_PROVIDER_ID,
): ModelSettingsMergeResult {
	const result: HFModelItem[] = [];
	const indexByIdentity = new Map<string, number>();
	const discoveredIdentities = new Set(discovered.map(modelIdentity));
	let added = 0;
	let updated = 0;
	let preserved = 0;
	let pruned = 0;

	for (const model of existing) {
		const identity = modelIdentity(model);
		if (isManagedApertureModel(model, providerId) && !discoveredIdentities.has(identity)) {
			pruned += 1;
			continue;
		}

		if (!discoveredIdentities.has(identity)) {
			preserved += 1;
		}

		const index = result.length;
		result.push(model);
		indexByIdentity.set(modelIdentity(model), index);
	}

	for (const model of discovered) {
		const identity = modelIdentity(model);
		const existingIndex = indexByIdentity.get(identity);
		if (existingIndex === undefined) {
			indexByIdentity.set(identity, result.length);
			result.push(model);
			added += 1;
			continue;
		}

		result[existingIndex] = {
			...result[existingIndex],
			...model,
		};
		updated += 1;
	}

	return {
		models: result,
		added,
		updated,
		preserved,
		pruned,
	};
}

function buildHeaders(apiKey?: string, userAgent = getUserAgent()): HeadersInit {
	const headers: HeadersInit = {
		Accept: "application/json",
		"User-Agent": userAgent,
	};

	if (apiKey) {
		headers.Authorization = `Bearer ${apiKey}`;
	}

	return headers;
}

function collectModelCandidates(body: unknown): UnknownRecord[] {
	if (Array.isArray(body)) {
		return body.filter(isRecord);
	}

	if (!isRecord(body)) {
		return [];
	}

	for (const key of ["models", "data", "configs", "items"]) {
		const value = body[key];
		if (Array.isArray(value)) {
			return value.filter(isRecord);
		}
	}

	if (isRecord(body.models)) {
		return Object.entries(body.models).map(([id, value]) => {
			if (isRecord(value)) {
				return { id, ...value };
			}
			return { id, name: String(value), model: id };
		});
	}

	return [body];
}

function getString(record: UnknownRecord, key: string): string | undefined {
	const value = record[key];
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getApiMode(record: UnknownRecord, modelId: string): ApertureModelConfig["apiMode"] {
	const explicit = normalizeApiMode(
		getString(record, "apiMode") ??
			getString(record, "api_mode") ??
			getString(record, "provider") ??
			getString(record, "upstreamProvider") ??
			getString(record, "upstream_provider") ??
			getString(record, "upstream"),
	);
	if (explicit) {
		return explicit;
	}

	if (isRecord(record.compatibility)) {
		if (
			record.compatibility.openai_responses === true ||
			record.compatibility.openai_response === true ||
			record.compatibility.openai_response_api === true
		) {
			return "openai-responses";
		}
		if (record.compatibility.openai_chat === true || record.compatibility.openai_chat_completions === true) {
			return "openai";
		}
		if (record.compatibility.anthropic_messages === true || record.compatibility.anthropic === true) {
			return "anthropic";
		}
		if (
			record.compatibility.bedrock === true ||
			record.compatibility.bedrock_model_invoke === true ||
			record.compatibility.bedrock_converse === true
		) {
			return "bedrock";
		}
	}

	return inferApertureApiMode(modelId);
}

export function inferApertureApiMode(modelId: string): ApertureModelConfig["apiMode"] {
	const normalized = modelId.toLowerCase();
	if (
		normalized.startsWith("us.anthropic.") ||
		normalized.startsWith("anthropic.") ||
		normalized.includes(".anthropic.")
	) {
		return "bedrock";
	}

	if (normalized.includes("claude") || normalized.includes("anthropic")) {
		return "anthropic";
	}

	if (/^(gpt-5|o[134]|codex)/.test(normalized)) {
		return "openai-responses";
	}

	return "openai";
}

function isRecord(value: unknown): value is UnknownRecord {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeApiMode(value: string | undefined): ApertureModelConfig["apiMode"] {
	if (!value) {
		return undefined;
	}

	const normalized = value.toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-");
	if (normalized === "anthropic" || normalized === "bedrock" || normalized === "openai") {
		return normalized;
	}

	if (normalized === "openai-chat" || normalized === "openai-compatible" || normalized === "chat-completions") {
		return "openai";
	}

	if (normalized === "openai-responses" || normalized === "openai-response" || normalized === "responses") {
		return "openai-responses";
	}

	if (normalized === "anthropic-messages") {
		return "anthropic";
	}

	if (normalized === "bedrock-model-invoke" || normalized === "bedrock-converse") {
		return "bedrock";
	}

	return undefined;
}

function modelIdentity(model: HFModelItem): string {
	return `${model.provider}:${model.configId || model.id}`;
}

function isManagedApertureModel(model: HFModelItem, providerId: string): boolean {
	return model.provider === providerId && typeof model.configId === "string" && model.configId.startsWith(`${providerId}:`);
}
