import { ApertureModelConfig, HFModelItem } from "./types";
import { getUserAgent } from "./userAgent";

export const APERTURE_PROVIDER_ID = "aperture";
export const APERTURE_SECRET_KEY = "oaicopilot.apiKey.aperture";
export const MODELS_SETTING = "models";
export const APERTURE_BASE_URL_SETTING = "aperture.baseUrl";
export const APERTURE_PROVIDER_ID_SETTING = "aperture.providerId";
export const SETTINGS_NAMESPACE = "oaicopilot";

type FetchLike = typeof fetch;

type UnknownRecord = Record<string, unknown>;

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
): Promise<ApertureModelConfig[]> {
	const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
	const paths = ["/ui/api/model/config", "/ui/api/models", "/v1/models"];

	let lastError: Error | undefined;
	for (const path of paths) {
		try {
			const response = await fetchImpl(`${normalizedBaseUrl}${path}`, {
				headers: buildHeaders(apiKey, userAgent),
			});
			if (!response.ok) {
				lastError = new Error(`Aperture model discovery failed at ${path}: ${response.status} ${response.statusText}`);
				continue;
			}

			const body = (await response.json()) as unknown;
			const models = parseApertureModels(body);
			if (models.length > 0) {
				return models;
			}
			lastError = new Error(`Aperture model discovery at ${path} returned no models.`);
		} catch (error) {
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
		apiMode: model.apiMode ?? inferApertureApiMode(model.id),
	}));
}

export function mergeModelSettings(
	existing: readonly HFModelItem[],
	discovered: readonly HFModelItem[],
): HFModelItem[] {
	const result = [...existing];
	const indexByIdentity = new Map<string, number>();

	result.forEach((model, index) => {
		indexByIdentity.set(modelIdentity(model), index);
	});

	for (const model of discovered) {
		const identity = modelIdentity(model);
		const existingIndex = indexByIdentity.get(identity);
		if (existingIndex === undefined) {
			indexByIdentity.set(identity, result.length);
			result.push(model);
			continue;
		}

		result[existingIndex] = {
			...result[existingIndex],
			...model,
		};
	}

	return result;
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
	const explicit = getString(record, "apiMode") ?? getString(record, "api_mode");
	if (explicit === "anthropic" || explicit === "bedrock" || explicit === "openai") {
		return explicit;
	}

	if (isRecord(record.compatibility)) {
		if (record.compatibility.openai_chat === true) {
			return "openai";
		}
		if (record.compatibility.anthropic_messages === true) {
			return "anthropic";
		}
		if (record.compatibility.bedrock_model_invoke === true || record.compatibility.bedrock_converse === true) {
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

	return "openai";
}

function isRecord(value: unknown): value is UnknownRecord {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function modelIdentity(model: HFModelItem): string {
	return `${model.provider}:${model.configId || model.id}`;
}
