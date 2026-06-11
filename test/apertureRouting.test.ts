import assert from "node:assert/strict";
import test from "node:test";
import { getApertureApiModeLabel, getApertureEndpoint, getApertureRequestBody } from "../src/apertureRouting";
import { ChatMessage, HFModelItem } from "../src/types";

const messages: ChatMessage[] = [
	{ role: "system", content: "system context" },
	{ role: "user", content: "hello" },
	{ role: "assistant", content: "hi" },
];

test("selects provider-native Aperture endpoints", () => {
	const cases: Array<[NonNullable<HFModelItem["apiMode"]>, string]> = [
		["openai", "http://ai/v1/chat/completions"],
		["openai-responses", "http://ai/v1/responses"],
		["anthropic", "http://ai/v1/messages"],
		["bedrock", "http://ai/bedrock/model/us.anthropic.claude%3A0/invoke"],
	];

	for (const [apiMode, endpoint] of cases) {
		assert.equal(getApertureEndpoint("http://ai", "us.anthropic.claude:0", apiMode), endpoint);
	}
});

test("builds provider-native request bodies", () => {
	assert.deepEqual(getApertureRequestBody("gpt-4.1", messages, "openai"), {
		model: "gpt-4.1",
		messages,
		stream: true,
	});
	assert.deepEqual(getApertureRequestBody("gpt-5", messages, "openai-responses"), {
		model: "gpt-5",
		input: [
			{ role: "system", content: "system context" },
			{ role: "user", content: "hello" },
			{ role: "assistant", content: "hi" },
		],
		stream: true,
	});
	assert.deepEqual(getApertureRequestBody("claude", messages, "anthropic"), {
		model: "claude",
		max_tokens: 8192,
		messages: [
			{ role: "user", content: "hello" },
			{ role: "assistant", content: "hi" },
		],
		stream: false,
	});
	assert.deepEqual(getApertureRequestBody("us.anthropic.claude:0", messages, "bedrock"), {
		anthropic_version: "bedrock-2023-05-31",
		max_tokens: 8192,
		messages: [
			{ role: "user", content: "hello" },
			{ role: "assistant", content: "hi" },
		],
	});
});

test("labels API modes without calling every upstream OpenAI", () => {
	assert.equal(getApertureApiModeLabel("openai"), "OpenAI-compatible chat");
	assert.equal(getApertureApiModeLabel("openai-responses"), "OpenAI Responses");
	assert.equal(getApertureApiModeLabel("anthropic"), "Anthropic Messages");
	assert.equal(getApertureApiModeLabel("bedrock"), "Bedrock");
});
