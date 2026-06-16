import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const providerSource = readFileSync(join(process.cwd(), "src/provider.ts"), "utf8");

test("provider reports parsed tool calls as VS Code tool call parts", () => {
	assert.match(providerSource, /new vscode\.LanguageModelToolCallPart\(part\.callId, part\.name, part\.input\)/);
	assert.match(providerSource, /parseJsonResponseParts\(body\)/);
	assert.match(providerSource, /parseSseLine\(line, parseState\)/);
});

test("provider forwards request tools into Aperture request bodies", () => {
	assert.match(providerSource, /toChatTools\(options\.tools \?\? \[\]\)/);
	assert.match(providerSource, /getApertureRequestBody\(model\.model, messages, apiMode, tools\)/);
});
