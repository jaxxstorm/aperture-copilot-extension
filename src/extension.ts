import * as vscode from "vscode";
import {
	APERTURE_BASE_URL_SETTING,
	APERTURE_SECRET_KEY,
	refreshApertureModels,
	SETTINGS_NAMESPACE,
	normalizeBaseUrl,
} from "./aperture";
import { HuggingFaceChatModelProvider } from "./provider";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
	const provider = new HuggingFaceChatModelProvider(context);

	context.subscriptions.push(
		vscode.lm.registerLanguageModelChatProvider("oaicopilot", provider),
		vscode.commands.registerCommand("oaicopilot.configureAperture", () => configureAperture(context)),
		vscode.commands.registerCommand("oaicopilot.refreshApertureModels", () =>
			refreshApertureModelsWithMessages(context),
		),
	);
}

export function deactivate(): void {}

async function configureAperture(context: vscode.ExtensionContext): Promise<void> {
	const config = vscode.workspace.getConfiguration(SETTINGS_NAMESPACE);
	const currentBaseUrl = config.get<string>(APERTURE_BASE_URL_SETTING, "");
	const baseUrlInput = await vscode.window.showInputBox({
		title: "Configure Aperture",
		prompt: "Enter the Aperture base URL.",
		placeHolder: "http://ai",
		value: currentBaseUrl,
		validateInput: (value) => {
			try {
				normalizeBaseUrl(value);
				return undefined;
			} catch (error) {
				return error instanceof Error ? error.message : String(error);
			}
		},
	});

	if (baseUrlInput === undefined) {
		return;
	}

	const baseUrl = normalizeBaseUrl(baseUrlInput);
	await config.update(APERTURE_BASE_URL_SETTING, baseUrl, vscode.ConfigurationTarget.Global);

	const apiKey = await vscode.window.showInputBox({
		title: "Configure Aperture",
		prompt: "Optional API key or credential for Aperture. Leave blank if Aperture does not require one.",
		password: true,
		ignoreFocusOut: true,
	});

	if (apiKey !== undefined) {
		if (apiKey.trim()) {
			await context.secrets.store(APERTURE_SECRET_KEY, apiKey.trim());
		} else {
			await context.secrets.delete(APERTURE_SECRET_KEY);
		}
	}

	await refreshApertureModelsWithMessages(context);
}

async function refreshApertureModelsWithMessages(context: vscode.ExtensionContext): Promise<void> {
	try {
		const count = await refreshApertureModels(context);
		await vscode.window.showInformationMessage(`Aperture Copilot discovered ${count} model${count === 1 ? "" : "s"}.`);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		await vscode.window.showErrorMessage(`Aperture Copilot could not refresh models: ${message}`);
	}
}
