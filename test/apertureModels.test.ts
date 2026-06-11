import assert from "node:assert/strict";
import test from "node:test";
import {
	APERTURE_SECRET_KEY,
	discoverApertureModels,
	getEffectiveModelSettings,
	inferApertureApiMode,
	LEGACY_APERTURE_SECRET_KEY,
	mergeModelSettings,
	mergeModelSettingsWithResult,
	normalizeBaseUrl,
	parseApertureModels,
	resolveApertureSecret,
	toHFModelItems,
} from "../src/apertureModels";
import { HFModelItem } from "../src/types";

test("normalizes valid Aperture base URLs", () => {
	assert.equal(normalizeBaseUrl(" http://ai/ "), "http://ai");
	assert.equal(normalizeBaseUrl("https://ai.example.com/path/"), "https://ai.example.com/path");
});

test("rejects invalid Aperture base URLs", () => {
	assert.throws(() => normalizeBaseUrl(""), /required/);
	assert.throws(() => normalizeBaseUrl("ai"), /valid URL/);
	assert.throws(() => normalizeBaseUrl("file:///tmp/models"), /http or https/);
});

test("parses Aperture model arrays", () => {
	const models = parseApertureModels({
		models: [
			{ id: "gpt-4.1", name: "GPT 4.1", model: "gpt-4.1" },
			{ id: "claude", name: "Claude" },
			{ id: "gpt-5", name: "GPT 5", api_mode: "openai_responses" },
			{ id: "claude-provider", name: "Claude Provider", provider: "anthropic_messages" },
			{ id: "bedrock-compat", name: "Bedrock Compat", compatibility: { bedrock_model_invoke: true } },
		],
	});

	assert.deepEqual(models, [
		{ id: "gpt-4.1", name: "GPT 4.1", model: "gpt-4.1", apiMode: "openai" },
		{ id: "claude", name: "Claude", model: "claude", apiMode: "anthropic" },
		{ id: "gpt-5", name: "GPT 5", model: "gpt-5", apiMode: "openai-responses" },
		{ id: "claude-provider", name: "Claude Provider", model: "claude-provider", apiMode: "anthropic" },
		{ id: "bedrock-compat", name: "Bedrock Compat", model: "bedrock-compat", apiMode: "bedrock" },
	]);
});

test("parses object-shaped Aperture model maps", () => {
	const models = parseApertureModels({
		models: {
			"aperture-small": { name: "Aperture Small", model: "small" },
			"aperture-large": "Aperture Large",
		},
	});

	assert.deepEqual(models, [
		{ id: "aperture-small", name: "Aperture Small", model: "small", apiMode: "openai" },
		{ id: "aperture-large", name: "Aperture Large", model: "aperture-large", apiMode: "openai" },
	]);
});

test("discovers models with fallback endpoints and authorization", async () => {
	const calls: Array<{ url: string; authorization?: string; userAgent?: string }> = [];
	const logs: Array<{ message: string; details?: Record<string, unknown> }> = [];
	const fetchImpl: typeof fetch = async (url, init) => {
		const headers = init?.headers as HeadersInit;
		calls.push({
			url: String(url),
			authorization: headers && !Array.isArray(headers) ? (headers as Record<string, string>).Authorization : undefined,
			userAgent: headers && !Array.isArray(headers) ? (headers as Record<string, string>)["User-Agent"] : undefined,
		});

		if (String(url).endsWith("/ui/api/model/config")) {
			return new Response("not found", {
				status: 404,
				statusText: "Not Found",
			});
		}

		return Response.json({
			data: [{ id: "aperture-code", name: "Aperture Code" }],
		});
	};

	const models = await discoverApertureModels("http://ai", "secret", fetchImpl, "aperture-copilot-extension/test", {
		log(message, details): void {
			logs.push({ message, details });
		},
	});

	assert.equal(calls.length, 2);
	assert.equal(calls[0].url, "http://ai/ui/api/model/config");
	assert.equal(calls[1].url, "http://ai/ui/api/models");
	assert.equal(calls[1].authorization, "Bearer secret");
	assert.equal(calls[1].userAgent, "aperture-copilot-extension/test");
	assert.deepEqual(models, [{ id: "aperture-code", name: "Aperture Code", model: "aperture-code", apiMode: "openai" }]);
	assert.ok(logs.some((entry) => entry.message === "Aperture model discovery endpoint failed."));
	assert.ok(logs.some((entry) => entry.message === "Aperture model discovery endpoint returned models."));
});

test("discovery diagnostics summarize no-model responses without secrets", async () => {
	const logs: Array<{ message: string; details?: Record<string, unknown> }> = [];
	const fetchImpl: typeof fetch = async () =>
		Response.json({
			models: [],
			apiKey: "secret",
		});

	await assert.rejects(
		() =>
			discoverApertureModels("http://ai", "secret", fetchImpl, "aperture-copilot-extension/test", {
				log(message, details): void {
					logs.push({ message, details });
				},
			}),
		/returned no models/,
	);

	const serializedLogs = JSON.stringify(logs);
	assert.match(serializedLogs, /returned no models/);
	assert.doesNotMatch(serializedLogs, /secret/);
});

test("maps discovered models into HFModelItem-compatible settings", () => {
	const models = toHFModelItems(
		[{ id: "aperture-code", name: "Aperture Code", model: "aperture-code", apiMode: "openai" }],
		"http://ai/",
		"aperture",
	);

	assert.deepEqual(models, [
		{
			id: "aperture-code",
			name: "Aperture Code",
			model: "aperture-code",
			provider: "aperture",
			configId: "aperture:aperture-code",
			baseUrl: "http://ai",
			apiKeyName: APERTURE_SECRET_KEY,
			apiMode: "openai",
		},
	]);
});

test("selects canonical Aperture model settings before legacy fallback", () => {
	const canonical = toHFModelItems([{ id: "canonical", name: "Canonical", model: "canonical" }], "http://ai");
	const legacy = toHFModelItems([{ id: "legacy", name: "Legacy", model: "legacy" }], "http://ai");

	assert.deepEqual(getEffectiveModelSettings(canonical, legacy), {
		models: canonical,
		source: "canonical",
	});
	assert.deepEqual(getEffectiveModelSettings([], legacy), {
		models: legacy,
		source: "legacy",
	});
	assert.deepEqual(getEffectiveModelSettings([], []), {
		models: [],
		source: "empty",
	});
});

test("resolves Aperture secrets with canonical preference and legacy fallback", async () => {
	const canonicalOnly = await resolveApertureSecret({
		get(key): PromiseLike<string | undefined> {
			return Promise.resolve(key === APERTURE_SECRET_KEY ? "canonical-secret" : undefined);
		},
	});
	const legacyOnly = await resolveApertureSecret({
		get(key): PromiseLike<string | undefined> {
			return Promise.resolve(key === LEGACY_APERTURE_SECRET_KEY ? "legacy-secret" : undefined);
		},
	});
	const empty = await resolveApertureSecret({
		get(): PromiseLike<string | undefined> {
			return Promise.resolve(undefined);
		},
	});

	assert.deepEqual(canonicalOnly, { value: "canonical-secret", source: "canonical" });
	assert.deepEqual(legacyOnly, { value: "legacy-secret", source: "legacy" });
	assert.deepEqual(empty, { value: undefined, source: "empty" });
});

test("maps inferred API mode from provider model id", () => {
	const models = toHFModelItems([{ id: "friendly-name", name: "Friendly", model: "gpt-5.1" }], "http://ai/", "aperture");

	assert.equal(models[0].apiMode, "openai-responses");
});

test("infers non-OpenAI Aperture API modes from model ids", () => {
	assert.equal(inferApertureApiMode("gpt-4.1"), "openai");
	assert.equal(inferApertureApiMode("gpt-5.4"), "openai-responses");
	assert.equal(inferApertureApiMode("o4-mini"), "openai-responses");
	assert.equal(inferApertureApiMode("claude-sonnet-4-5"), "anthropic");
	assert.equal(inferApertureApiMode("us.anthropic.claude-sonnet-4-5-20250929-v1:0"), "bedrock");
});

test("merges discovered Aperture models without removing unrelated models", () => {
	const existing: HFModelItem[] = [
		{
			id: "manual-openai",
			name: "Manual OpenAI",
			model: "gpt-4",
			provider: "openai",
			configId: "openai:manual",
			baseUrl: "https://api.openai.com/v1",
		},
		{
			id: "aperture-code",
			name: "Old Name",
			model: "old",
			provider: "aperture",
			configId: "aperture:aperture-code",
			baseUrl: "http://old",
		},
	];
	const discovered = toHFModelItems(
		[
			{ id: "aperture-code", name: "Aperture Code", model: "aperture-code" },
			{ id: "aperture-chat", name: "Aperture Chat", model: "aperture-chat" },
		],
		"http://ai",
	);

	const merged = mergeModelSettings(existing, discovered);

	assert.equal(merged.length, 3);
	assert.equal(merged[0].name, "Manual OpenAI");
	assert.equal(merged[1].name, "Aperture Code");
	assert.equal(merged[1].baseUrl, "http://ai");
	assert.equal(merged[1].apiMode, "openai");
	assert.equal(merged[2].id, "aperture-chat");
});

test("prunes stale managed Aperture models during refresh merge", () => {
	const existing: HFModelItem[] = [
		{
			id: "aperture-code",
			name: "Aperture Code",
			model: "aperture-code",
			provider: "aperture",
			configId: "aperture:aperture-code",
			baseUrl: "http://ai",
		},
		{
			id: "aperture-stale",
			name: "Aperture Stale",
			model: "aperture-stale",
			provider: "aperture",
			configId: "aperture:aperture-stale",
			baseUrl: "http://ai",
		},
	];
	const discovered = toHFModelItems([{ id: "aperture-code", name: "Aperture Code", model: "aperture-code" }], "http://ai");

	const result = mergeModelSettingsWithResult(existing, discovered);

	assert.deepEqual(
		result.models.map((model) => model.id),
		["aperture-code"],
	);
	assert.equal(result.updated, 1);
	assert.equal(result.pruned, 1);
});

test("preserves unrelated and manual Aperture-like entries during refresh merge", () => {
	const existing: HFModelItem[] = [
		{
			id: "manual-openai",
			name: "Manual OpenAI",
			model: "gpt-4",
			provider: "openai",
			configId: "openai:manual",
			baseUrl: "https://api.openai.com/v1",
		},
		{
			id: "different-provider",
			name: "Different Provider",
			model: "different-provider",
			provider: "other-aperture",
			configId: "other-aperture:different-provider",
			baseUrl: "http://ai",
		},
		{
			id: "manual-aperture",
			name: "Manual Aperture",
			model: "manual-aperture",
			provider: "aperture",
			configId: "manual:aperture",
			baseUrl: "http://ai",
		},
		{
			id: "managed-stale",
			name: "Managed Stale",
			model: "managed-stale",
			provider: "aperture",
			configId: "aperture:managed-stale",
			baseUrl: "http://ai",
		},
	];
	const discovered = toHFModelItems([{ id: "aperture-chat", name: "Aperture Chat", model: "aperture-chat" }], "http://ai");

	const result = mergeModelSettingsWithResult(existing, discovered);

	assert.deepEqual(
		result.models.map((model) => model.id),
		["manual-openai", "different-provider", "manual-aperture", "aperture-chat"],
	);
	assert.equal(result.added, 1);
	assert.equal(result.preserved, 3);
	assert.equal(result.pruned, 1);
});

test("merge result reports added updated preserved and pruned counts", () => {
	const existing: HFModelItem[] = [
		{
			id: "unrelated",
			name: "Unrelated",
			model: "unrelated",
			provider: "openai",
			configId: "openai:unrelated",
		},
		{
			id: "existing",
			name: "Old Existing",
			model: "old-existing",
			provider: "aperture",
			configId: "aperture:existing",
		},
		{
			id: "stale",
			name: "Stale",
			model: "stale",
			provider: "aperture",
			configId: "aperture:stale",
		},
	];
	const discovered = toHFModelItems(
		[
			{ id: "existing", name: "New Existing", model: "new-existing" },
			{ id: "added", name: "Added", model: "added" },
		],
		"http://ai",
	);

	const result = mergeModelSettingsWithResult(existing, discovered);

	assert.equal(result.added, 1);
	assert.equal(result.updated, 1);
	assert.equal(result.preserved, 1);
	assert.equal(result.pruned, 1);
	assert.deepEqual(
		result.models.map((model) => model.id),
		["unrelated", "existing", "added"],
	);
	assert.equal(result.models[1].name, "New Existing");
});
