import assert from "node:assert/strict";
import test from "node:test";
import { getApertureRequestFailureMessage, parseJsonResponseParts, parseJsonResponseText, parseSseLine } from "../src/response";

test("parses streamed OpenAI response content", () => {
	const parts = parseSseLine("data: {\"choices\":[{\"delta\":{\"content\":\"hello\"}}]}");

	assert.deepEqual(parts, [{ type: "text", text: "hello" }]);
});

test("parses streamed OpenAI Responses API content", () => {
	const parts = parseSseLine("data: {\"type\":\"response.output_text.delta\",\"delta\":\"hello\"}");

	assert.deepEqual(parts, [{ type: "text", text: "hello" }]);
});

test("parses completed OpenAI Responses stream items", () => {
	const parts = parseSseLine("data: {\"type\":\"response.output_item.done\",\"item\":{\"content\":[{\"text\":\"done\"}]}}");

	assert.deepEqual(parts, [{ type: "text", text: "done" }]);
});

test("does not duplicate completed OpenAI Responses stream items after text deltas", () => {
	const state = {};

	assert.deepEqual(parseSseLine("data: {\"type\":\"response.output_text.delta\",\"delta\":\"hel\"}", state), [
		{ type: "text", text: "hel" },
	]);
	assert.deepEqual(parseSseLine("data: {\"type\":\"response.output_text.delta\",\"delta\":\"lo\"}", state), [
		{ type: "text", text: "lo" },
	]);
	assert.deepEqual(
		parseSseLine("data: {\"type\":\"response.output_item.done\",\"item\":{\"content\":[{\"text\":\"hello\"}]}}", state),
		[],
	);
});

test("parses streamed Anthropic content deltas", () => {
	const parts = parseSseLine("data: {\"type\":\"content_block_delta\",\"delta\":{\"text\":\"hi\"}}");

	assert.deepEqual(parts, [{ type: "text", text: "hi" }]);
});

test("ignores unsupported or malformed stream lines", () => {
	assert.deepEqual(parseSseLine("event: ping"), []);
	assert.deepEqual(parseSseLine("data: [DONE]"), []);
	assert.deepEqual(parseSseLine("data: nope"), []);
	assert.deepEqual(parseSseLine("data: {\"choices\":[]}"), []);
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

test("parses OpenAI chat completions tool calls", () => {
	assert.deepEqual(
		parseJsonResponseParts({
			choices: [
				{
					message: {
						content: "I will edit it.",
						tool_calls: [
							{
								id: "call-1",
								type: "function",
								function: {
									name: "replace_string_in_file",
									arguments: "{\"filePath\":\"/tmp/README.md\",\"newString\":\"Hello World\"}",
								},
							},
						],
					},
				},
			],
		}),
		[
			{ type: "text", text: "I will edit it." },
			{
				type: "tool_call",
				callId: "call-1",
				name: "replace_string_in_file",
				input: { filePath: "/tmp/README.md", newString: "Hello World" },
			},
		],
	);
});

test("parses streamed OpenAI chat completions tool calls", () => {
	const state = {};

	assert.deepEqual(
		parseSseLine(
			"data: {\"choices\":[{\"delta\":{\"tool_calls\":[{\"index\":0,\"id\":\"call-1\",\"type\":\"function\",\"function\":{\"name\":\"replace_string_in_file\",\"arguments\":\"{\\\"filePath\\\":\"}}]}}]}",
			state,
		),
		[],
	);
	assert.deepEqual(
		parseSseLine(
			"data: {\"choices\":[{\"delta\":{\"tool_calls\":[{\"index\":0,\"function\":{\"arguments\":\"\\\"/tmp/README.md\\\"}\"}}]},\"finish_reason\":\"tool_calls\"}]}",
			state,
		),
		[
			{
				type: "tool_call",
				callId: "call-1",
				name: "replace_string_in_file",
				input: { filePath: "/tmp/README.md" },
			},
		],
	);
});

test("parses OpenAI Responses tool calls", () => {
	assert.deepEqual(
		parseJsonResponseParts({
			output: [
				{
					type: "function_call",
					call_id: "call-1",
					name: "replace_string_in_file",
					arguments: "{\"filePath\":\"/tmp/README.md\"}",
				},
			],
		}),
		[
			{
				type: "tool_call",
				callId: "call-1",
				name: "replace_string_in_file",
				input: { filePath: "/tmp/README.md" },
			},
		],
	);
	assert.deepEqual(
		parseSseLine(
			"data: {\"type\":\"response.output_item.done\",\"item\":{\"type\":\"function_call\",\"call_id\":\"call-2\",\"name\":\"read_file\",\"arguments\":\"{\\\"filePath\\\":\\\"/tmp/README.md\\\"}\"}}",
		),
		[
			{
				type: "tool_call",
				callId: "call-2",
				name: "read_file",
				input: { filePath: "/tmp/README.md" },
			},
		],
	);
});

test("parses Anthropic tool use responses", () => {
	assert.deepEqual(
		parseJsonResponseParts({
			content: [
				{ type: "text", text: "I will read it." },
				{ type: "tool_use", id: "call-1", name: "read_file", input: { filePath: "/tmp/README.md" } },
			],
		}),
		[
			{ type: "text", text: "I will read it." },
			{ type: "tool_call", callId: "call-1", name: "read_file", input: { filePath: "/tmp/README.md" } },
		],
	);
});

test("parses streamed Anthropic tool use responses", () => {
	const state = {};

	assert.deepEqual(
		parseSseLine(
			"data: {\"type\":\"content_block_start\",\"index\":1,\"content_block\":{\"type\":\"tool_use\",\"id\":\"call-1\",\"name\":\"read_file\",\"input\":{}}}",
			state,
		),
		[],
	);
	assert.deepEqual(
		parseSseLine(
			"data: {\"type\":\"content_block_delta\",\"index\":1,\"delta\":{\"type\":\"input_json_delta\",\"partial_json\":\"{\\\"filePath\\\":\\\"/tmp/README.md\\\"}\"}}",
			state,
		),
		[],
	);
	assert.deepEqual(parseSseLine("data: {\"type\":\"content_block_stop\",\"index\":1}", state), [
		{ type: "tool_call", callId: "call-1", name: "read_file", input: { filePath: "/tmp/README.md" } },
	]);
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
