import assert from "node:assert/strict";
import test from "node:test";
import { getLanguageModelChatId } from "../src/languageModelIdentity";

test("scopes VS Code chat model ids to Aperture Copilot", () => {
	assert.equal(
		getLanguageModelChatId({
			id: "claude-sonnet-4-6",
			name: "Claude Sonnet 4.6",
			model: "claude-sonnet-4-6",
			provider: "aperture",
			configId: "aperture:claude-sonnet-4-6",
		}),
		"aperture-copilot:aperture:claude-sonnet-4-6",
	);
});

test("falls back to provider and model id when configId is absent", () => {
	assert.equal(
		getLanguageModelChatId({
			id: "manual",
			name: "Manual",
			model: "manual",
			provider: "aperture",
			configId: "",
		}),
		"aperture-copilot:aperture:manual",
	);
});
