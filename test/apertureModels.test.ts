import assert from "node:assert/strict";
import test from "node:test";
import {
	APERTURE_SECRET_KEY,
	discoverApertureModels,
	inferApertureApiMode,
	mergeModelSettings,
	normalizeBaseUrl,
	parseApertureModels,
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
		],
	});

	assert.deepEqual(models, [
		{ id: "gpt-4.1", name: "GPT 4.1", model: "gpt-4.1", apiMode: "openai" },
		{ id: "claude", name: "Claude", model: "claude", apiMode: "anthropic" },
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

	const models = await discoverApertureModels("http://ai", "secret", fetchImpl, "aperture-copilot-extension/test");

	assert.equal(calls.length, 2);
	assert.equal(calls[0].url, "http://ai/ui/api/model/config");
	assert.equal(calls[1].url, "http://ai/ui/api/models");
	assert.equal(calls[1].authorization, "Bearer secret");
	assert.equal(calls[1].userAgent, "aperture-copilot-extension/test");
	assert.deepEqual(models, [{ id: "aperture-code", name: "Aperture Code", model: "aperture-code", apiMode: "openai" }]);
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

test("infers non-OpenAI Aperture API modes from model ids", () => {
	assert.equal(inferApertureApiMode("gpt-5.4"), "openai");
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
	assert.equal(merged[2].id, "aperture-chat");
});
