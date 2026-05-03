import packageJson from "../package.json";

export function getUserAgent(vscodeVersion?: string): string {
	const parts = [`${packageJson.name}/${packageJson.version}`];
	if (vscodeVersion) {
		parts.push(`vscode/${vscodeVersion}`);
	}

	return parts.join(" ");
}
