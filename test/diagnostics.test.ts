import assert from "node:assert/strict";
import test from "node:test";
import {
	OutputChannelDiagnostics,
	sanitizeBodyExcerpt,
	sanitizeDiagnosticValue,
	sanitizeError,
} from "../src/diagnostics";

test("diagnostics redact secrets and prompt content", () => {
	const sanitized = sanitizeDiagnosticValue({
		apiKey: "super-secret",
		Authorization: "Bearer token-value",
		prompt: "please keep this private",
		modelId: "aperture-code",
		nested: {
			requestBody: {
				messages: [{ content: "hello" }],
			},
		},
	});

	assert.deepEqual(sanitized, {
		apiKey: "[redacted]",
		Authorization: "[redacted]",
		prompt: "[redacted]",
		modelId: "aperture-code",
		nested: {
			requestBody: "[redacted]",
		},
	});
});

test("diagnostic strings redact bearer tokens and credential-like fields", () => {
	const body = sanitizeBodyExcerpt("{\"error\":\"Missing required query parameter: api-version\",\"authorization\":\"Bearer abc123\"}");
	const error = sanitizeError(new Error("Authorization=Bearer secret-token"));

	assert.match(body, /Missing required query parameter/);
	assert.doesNotMatch(body, /abc123/);
	assert.doesNotMatch(error, /secret-token/);
});

test("output channel diagnostics writes sanitized details", () => {
	const lines: string[] = [];
	const diagnostics = new OutputChannelDiagnostics({
		appendLine(value: string): void {
			lines.push(value);
		},
	});

	diagnostics.log("Sending request.", {
		apiKey: "secret",
		modelId: "aperture-chat",
		messages: [{ content: "private prompt" }],
	});

	assert.equal(lines.length, 1);
	assert.match(lines[0], /Sending request/);
	assert.match(lines[0], /aperture-chat/);
	assert.doesNotMatch(lines[0], /secret/);
	assert.doesNotMatch(lines[0], /private prompt/);
});
