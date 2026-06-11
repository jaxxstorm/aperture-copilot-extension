import assert from "node:assert/strict";
import test from "node:test";
import {
	APERTURE_SESSION_HEADER,
	APERTURE_SESSION_HEADER_ALIASES,
	getApertureRequestHeaders,
} from "../src/apertureHeaders";
import { deriveApertureSessionId } from "../src/session";
import { HFModelItem } from "../src/types";

test("derives opaque session ids from common metadata field names", () => {
	const fromSession = deriveApertureSessionId({ sessionId: "session-123" });
	const fromConversation = deriveApertureSessionId({ modelOptions: { conversation_id: "conversation-123" } });
	const fromThread = deriveApertureSessionId({ request: { threadId: "thread-123" } });
	const fromParentRequest = deriveApertureSessionId({ parentRequestId: "parent-123" });

	assert.match(fromSession, /^aperture-vscode-metadata-[a-f0-9]{32}$/);
	assert.match(fromConversation, /^aperture-vscode-metadata-[a-f0-9]{32}$/);
	assert.match(fromThread, /^aperture-vscode-metadata-[a-f0-9]{32}$/);
	assert.match(fromParentRequest, /^aperture-vscode-metadata-[a-f0-9]{32}$/);
	assert.notEqual(fromSession, fromConversation);
	assert.notEqual(fromConversation, fromThread);
});

test("uses a stable extension-host fallback session id", () => {
	const first = deriveApertureSessionId({});
	const second = deriveApertureSessionId({ modelOptions: {} });

	assert.equal(first, second);
	assert.match(first, /^aperture-vscode-fallback-[a-f0-9]{32}$/);
});

test("adds session headers for all Aperture API modes while preserving existing headers", () => {
	const apiModes: Array<NonNullable<HFModelItem["apiMode"]>> = ["openai", "openai-responses", "anthropic", "bedrock"];

	for (const apiMode of apiModes) {
		const headers = getApertureRequestHeaders("secret", apiMode, "aperture-copilot-extension/test", "session-123") as Record<
			string,
			string
		>;

		assert.equal(headers[APERTURE_SESSION_HEADER], "session-123");
		for (const alias of APERTURE_SESSION_HEADER_ALIASES) {
			assert.equal(headers[alias], "session-123");
		}

		assert.equal(headers["Content-Type"], "application/json");
		assert.equal(headers["User-Agent"], "aperture-copilot-extension/test");
		assert.equal(headers.Authorization, "Bearer secret");
		assert.equal(headers.Accept, apiMode === "openai" || apiMode === "openai-responses" ? "text/event-stream" : "application/json");
	}
});

test("does not expose prompt text or secret values in derived session ids", () => {
	const sessionId = deriveApertureSessionId({
		content: "please do not leak this prompt",
		apiKey: "super-secret-key",
		modelOptions: {
			sessionId: "stable-runtime-id",
		},
	});

	assert.doesNotMatch(sessionId, /please do not leak this prompt/);
	assert.doesNotMatch(sessionId, /super-secret-key/);
	assert.doesNotMatch(sessionId, /stable-runtime-id/);
	assert.match(sessionId, /^aperture-vscode-metadata-[a-f0-9]{32}$/);
});
