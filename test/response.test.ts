import assert from "node:assert/strict";
import test from "node:test";
import { getApertureRequestFailureMessage, parseJsonResponseText, parseSseLine } from "../src/response";

test("parses streamed OpenAI response content", () => {
	const token = parseSseLine("data: {\"choices\":[{\"delta\":{\"content\":\"hello\"}}]}");

	assert.equal(token, "hello");
});

test("parses streamed OpenAI Responses API content", () => {
	const token = parseSseLine("data: {\"type\":\"response.output_text.delta\",\"delta\":\"hello\"}");

	assert.equal(token, "hello");
});

test("parses completed OpenAI Responses stream items", () => {
	const token = parseSseLine("data: {\"type\":\"response.output_item.done\",\"item\":{\"content\":[{\"text\":\"done\"}]}}");

	assert.equal(token, "done");
});

test("parses streamed Anthropic content deltas", () => {
	const token = parseSseLine("data: {\"type\":\"content_block_delta\",\"delta\":{\"text\":\"hi\"}}");

	assert.equal(token, "hi");
});

test("ignores unsupported or malformed stream lines", () => {
	assert.equal(parseSseLine("event: ping"), undefined);
	assert.equal(parseSseLine("data: [DONE]"), undefined);
	assert.equal(parseSseLine("data: nope"), undefined);
	assert.equal(parseSseLine("data: {\"choices\":[]}"), undefined);
});

test("parses known JSON response text shapes", () => {
	assert.equal(parseJsonResponseText({ content: [{ text: "hello" }, " world"] }), "hello world");
	assert.equal(parseJsonResponseText({ content: [{ type: "text", text: "anthropic" }] }), "anthropic");
	assert.equal(parseJsonResponseText({ choices: [{ message: { content: [{ text: "choice" }] } }] }), "choice");
	assert.equal(parseJsonResponseText({ output: { message: { text: "output" } } }), "output");
	assert.equal(parseJsonResponseText({ output_text: "responses" }), "responses");
	assert.equal(
		parseJsonResponseText({
			output: [{ content: [{ text: "response " }] }, { content: [{ text: "array" }] }],
		}),
		"response array",
	);
});

test("returns undefined for empty or unsupported JSON response shapes", () => {
	assert.equal(parseJsonResponseText({ content: [] }), undefined);
	assert.equal(parseJsonResponseText({ result: "not-supported" }), undefined);
	assert.equal(parseJsonResponseText(null), undefined);
});

test("request failure messages include status and sanitized body excerpt", () => {
	const message = getApertureRequestFailureMessage(
		400,
		"Bad Request",
		"{\"error\":\"Missing required query parameter: api-version\",\"apiKey\":\"secret\"}",
	);

	assert.match(message, /400 Bad Request/);
	assert.match(message, /api-version/);
	assert.doesNotMatch(message, /secret/);
});
