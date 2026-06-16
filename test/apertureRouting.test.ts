import assert from "node:assert/strict";
import test from "node:test";
import { getApertureApiModeLabel, getApertureEndpoint, getApertureRequestBody } from "../src/apertureRouting";
import { ChatMessage, ChatTool, HFModelItem } from "../src/types";

const messages: ChatMessage[] = [
	{ role: "system", content: [{ type: "text", text: "system context" }] },
	{ role: "user", content: [{ type: "text", text: "hello" }] },
	{ role: "assistant", content: [{ type: "text", text: "hi" }] },
];

const tools: ChatTool[] = [
	{
		name: "replace_string_in_file",
		description: "Replace text in a file.",
		inputSchema: {
			type: "object",
			properties: {
				filePath: { type: "string" },
				oldString: { type: "string" },
				newString: { type: "string" },
			},
			required: ["filePath", "oldString", "newString"],
		},
	},
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
		messages: [
			{ role: "system", content: "system context" },
			{ role: "user", content: "hello" },
			{ role: "assistant", content: "hi" },
		],
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
			{ role: "user", content: [{ type: "text", text: "hello" }] },
			{ role: "assistant", content: [{ type: "text", text: "hi" }] },
		],
		stream: false,
	});
	assert.deepEqual(getApertureRequestBody("us.anthropic.claude:0", messages, "bedrock"), {
		anthropic_version: "bedrock-2023-05-31",
		max_tokens: 8192,
		messages: [
			{ role: "user", content: [{ type: "text", text: "hello" }] },
			{ role: "assistant", content: [{ type: "text", text: "hi" }] },
		],
	});
});

test("builds provider-native request bodies with tools", () => {
	const schema = tools[0].inputSchema;

	assert.deepEqual(getApertureRequestBody("gpt-4.1", messages, "openai", tools), {
		model: "gpt-4.1",
		messages: [
			{ role: "system", content: "system context" },
			{ role: "user", content: "hello" },
			{ role: "assistant", content: "hi" },
		],
		stream: true,
		tools: [
			{
				type: "function",
				function: {
					name: "replace_string_in_file",
					description: "Replace text in a file.",
					parameters: schema,
				},
			},
		],
	});

	assert.deepEqual(getApertureRequestBody("gpt-5", messages, "openai-responses", tools), {
		model: "gpt-5",
		input: [
			{ role: "system", content: "system context" },
			{ role: "user", content: "hello" },
			{ role: "assistant", content: "hi" },
		],
		stream: true,
		tools: [
			{
				type: "function",
				name: "replace_string_in_file",
				description: "Replace text in a file.",
				parameters: schema,
			},
		],
	});

	for (const apiMode of ["anthropic", "bedrock"] as const) {
		const body = getApertureRequestBody("claude", messages, apiMode, tools);
		assert.deepEqual(body.tools, [
			{
				name: "replace_string_in_file",
				description: "Replace text in a file.",
				input_schema: schema,
			},
		]);
	}
});

test("preserves structured tool calls and results in request bodies", () => {
	const structuredMessages: ChatMessage[] = [
		{
			role: "assistant",
			content: [
				{ type: "text", text: "I will edit it." },
				{
					type: "tool_call",
					callId: "call-1",
					name: "replace_string_in_file",
					input: { filePath: "/tmp/README.md", oldString: "# README", newString: "Hello World" },
				},
			],
		},
		{
			role: "user",
			content: [{ type: "tool_result", callId: "call-1", content: "ok" }],
		},
	];

	assert.deepEqual(getApertureRequestBody("gpt-4.1", structuredMessages, "openai").messages, [
		{
			role: "assistant",
			content: "I will edit it.",
			tool_calls: [
				{
					id: "call-1",
					type: "function",
					function: {
						name: "replace_string_in_file",
						arguments: JSON.stringify({
							filePath: "/tmp/README.md",
							oldString: "# README",
							newString: "Hello World",
						}),
					},
				},
			],
		},
		{ role: "tool", tool_call_id: "call-1", content: "ok" },
	]);

	assert.deepEqual(getApertureRequestBody("gpt-5", structuredMessages, "openai-responses").input, [
		{ role: "assistant", content: "I will edit it." },
		{
			type: "function_call",
			call_id: "call-1",
			name: "replace_string_in_file",
			arguments: JSON.stringify({
				filePath: "/tmp/README.md",
				oldString: "# README",
				newString: "Hello World",
			}),
		},
		{ type: "function_call_output", call_id: "call-1", output: "ok" },
	]);

	assert.deepEqual(getApertureRequestBody("claude", structuredMessages, "anthropic").messages, [
		{
			role: "assistant",
			content: [
				{ type: "text", text: "I will edit it." },
				{
					type: "tool_use",
					id: "call-1",
					name: "replace_string_in_file",
					input: { filePath: "/tmp/README.md", oldString: "# README", newString: "Hello World" },
				},
			],
		},
		{
			role: "user",
			content: [{ type: "tool_result", tool_use_id: "call-1", content: "ok" }],
		},
	]);
});

test("does not inject session ids into strict provider-native request bodies", () => {
	const apiModes: Array<NonNullable<HFModelItem["apiMode"]>> = ["openai", "openai-responses", "anthropic", "bedrock"];

	for (const apiMode of apiModes) {
		const body = getApertureRequestBody("model-id", messages, apiMode);

		assert.equal(body.session_id, undefined);
		assert.equal(body.sessionId, undefined);
	}
});

test("labels API modes without calling every upstream OpenAI", () => {
	assert.equal(getApertureApiModeLabel("openai"), "OpenAI-compatible chat");
	assert.equal(getApertureApiModeLabel("openai-responses"), "OpenAI Responses");
	assert.equal(getApertureApiModeLabel("anthropic"), "Anthropic Messages");
	assert.equal(getApertureApiModeLabel("bedrock"), "Bedrock");
});
