import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

type PackageJson = {
	activationEvents?: string[];
	icon?: string;
	contributes?: {
		languageModelChatProviders?: Array<{
			vendor?: string;
			displayName?: string;
		}>;
		configuration?: {
			properties?: Record<string, unknown>;
		};
	};
	commands?: unknown;
};

test("manifest contributes canonical aperture.models setting", () => {
	const manifest = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as PackageJson;
	const properties = manifest.contributes?.configuration?.properties ?? {};
	const modelsSetting = properties["aperture.models"] as {
		type?: string;
		description?: string;
		items?: { additionalProperties?: boolean; properties?: Record<string, { enum?: string[] }> };
	};

	assert.equal(modelsSetting.type, "array");
	assert.equal(modelsSetting.items?.additionalProperties, true);
	assert.deepEqual(modelsSetting.items?.properties?.apiMode?.enum, ["openai", "openai-responses", "anthropic", "bedrock"]);
	assert.doesNotMatch(modelsSetting.description ?? "", /OpenAI-style/);
});

test("manifest exposes only Aperture-named model settings", () => {
	const manifest = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as PackageJson;
	const properties = manifest.contributes?.configuration?.properties ?? {};

	assert.ok(properties["aperture.models"]);
	assert.equal(properties["oaicopilot.models"], undefined);
});

test("README documents canonical Aperture model settings without legacy namespace leaks", () => {
	const readme = readFileSync(join(process.cwd(), "README.md"), "utf8");

	assert.match(readme, /aperture\.models/);
	assert.doesNotMatch(readme, /oaicopilot/i);
	assert.doesNotMatch(readme, /OAI Compatible Provider/i);
	assert.match(readme, /legacy model list/);
});

test("manifest uses Aperture command and configuration namespaces", () => {
	const manifest = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as PackageJson;
	const properties = manifest.contributes?.configuration?.properties ?? {};
	const serialized = JSON.stringify(manifest);

	assert.ok(properties["aperture.baseUrl"]);
	assert.ok(properties["aperture.providerId"]);
	assert.match(serialized, /aperture\.configure/);
	assert.match(serialized, /aperture\.refreshModels/);
	assert.match(serialized, /aperture\.showRegisteredModels/);
	assert.doesNotMatch(serialized, /oaicopilot/);
});

test("manifest contributes the chat model provider used at runtime", () => {
	const manifest = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as PackageJson;
	const providers = manifest.contributes?.languageModelChatProviders ?? [];

	assert.deepEqual(providers, [
		{
			vendor: "aperture-copilot",
			displayName: "Aperture",
		},
	]);
	assert.ok(manifest.activationEvents?.includes("onLanguageModelChatProvider:aperture-copilot"));
});

test("manifest declares packaged Aperture logo icon", () => {
	const manifest = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as PackageJson;

	assert.equal(manifest.icon, "logo-light.png");
	assert.ok(existsSync(join(process.cwd(), manifest.icon)));
	assert.ok(existsSync(join(process.cwd(), "logo-light.svg")));
});

test("package ignore rules do not exclude manifest icon", () => {
	const manifest = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as PackageJson;
	const vscodeIgnore = readFileSync(join(process.cwd(), ".vscodeignore"), "utf8");
	const ignoreRules = vscodeIgnore
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line && !line.startsWith("#"));

	assert.equal(manifest.icon, "logo-light.png");
	assert.ok(!ignoreRules.includes(manifest.icon));
	assert.ok(!ignoreRules.includes("*.svg"));
	assert.ok(!ignoreRules.includes("*.png"));
	assert.ok(!ignoreRules.includes("logo-light.svg"));
});
