import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const readWorkflow = (name: string): string => readFileSync(join(process.cwd(), ".github", "workflows", name), "utf8");

test("pull request workflow installs dependencies and runs tests", () => {
	const workflow = readWorkflow("pr-tests.yml");

	assert.match(workflow, /^\s*pull_request:\s*$/m);
	assert.match(workflow, /uses:\s*actions\/checkout@v4/);
	assert.match(workflow, /uses:\s*actions\/setup-node@v4/);
	assert.match(workflow, /run:\s*npm ci/);
	assert.match(workflow, /run:\s*npm test/);
	assert.match(workflow, /^\s*contents:\s*read\s*$/m);
	assert.doesNotMatch(workflow, /^\s*contents:\s*write\s*$/m);
});

test("release workflow builds and uploads VSIX artifacts for version tags", () => {
	const workflow = readWorkflow("release-vsix.yml");

	assert.match(workflow, /^\s*push:\s*$/m);
	assert.match(workflow, /^\s*tags:\s*$/m);
	assert.match(workflow, /-\s*"v\*"/);
	assert.match(workflow, /run:\s*npm ci/);
	assert.match(workflow, /run:\s*npm test/);
	assert.match(workflow, /run:\s*npm run build/);
	assert.match(workflow, /^\s*contents:\s*write\s*$/m);
	assert.match(workflow, /GH_TOKEN:\s*\$\{\{\s*github\.token\s*\}\}/);
	assert.match(workflow, /gh release create/);
	assert.match(workflow, /gh release upload/);
	assert.match(workflow, /\*\.vsix/);
});
