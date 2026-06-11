import * as vscode from "vscode";
import {
	APERTURE_BASE_URL_SETTING,
	APERTURE_CHAT_VENDOR_ID,
	APERTURE_SECRET_KEY,
	LEGACY_APERTURE_SECRET_KEY,
	LEGACY_APERTURE_BASE_URL_SETTING,
	LEGACY_SETTINGS_NAMESPACE,
	refreshApertureModels,
	normalizeBaseUrl,
	SETTINGS_NAMESPACE,
} from "./aperture";
import { OutputChannelDiagnostics } from "./diagnostics";
import { HuggingFaceChatModelProvider } from "./provider";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
	const outputChannel = vscode.window.createOutputChannel("Aperture Copilot");
	const diagnostics = new OutputChannelDiagnostics(outputChannel);
	const provider = new HuggingFaceChatModelProvider(context, diagnostics);

	context.subscriptions.push(
		outputChannel,
		provider,
		vscode.lm.registerLanguageModelChatProvider(APERTURE_CHAT_VENDOR_ID, provider),
		vscode.commands.registerCommand("aperture.configure", () => configureAperture(context, diagnostics, provider)),
		vscode.commands.registerCommand("aperture.refreshModels", () =>
			refreshApertureModelsWithMessages(context, diagnostics, provider),
		),
		vscode.commands.registerCommand("aperture.showRegisteredModels", () => showRegisteredModels(diagnostics)),
		vscode.commands.registerCommand("oaicopilot.configureAperture", () => configureAperture(context, diagnostics, provider)),
		vscode.commands.registerCommand("oaicopilot.refreshApertureModels", () =>
			refreshApertureModelsWithMessages(context, diagnostics, provider),
		),
		vscode.workspace.onDidChangeConfiguration((event) => {
			if (
				event.affectsConfiguration("aperture.models") ||
				event.affectsConfiguration("aperture.baseUrl") ||
				event.affectsConfiguration("aperture.providerId")
			) {
				provider.notifyModelInformationChanged();
			}
		}),
	);
}

export function deactivate(): void {}

async function showRegisteredModels(diagnostics: OutputChannelDiagnostics): Promise<void> {
	const models = await vscode.lm.selectChatModels({ vendor: APERTURE_CHAT_VENDOR_ID });
	diagnostics.log("VS Code resolved Aperture Copilot chat models.", {
		vendor: APERTURE_CHAT_VENDOR_ID,
		count: models.length,
		models: models.map((model) => ({ id: model.id, name: model.name, vendor: model.vendor, family: model.family })),
	});
	await vscode.window.showInformationMessage(`VS Code resolved ${models.length} Aperture Copilot model${models.length === 1 ? "" : "s"}.`);
}

async function configureAperture(
	context: vscode.ExtensionContext,
	diagnostics: OutputChannelDiagnostics,
	provider: HuggingFaceChatModelProvider,
): Promise<void> {
	const config = vscode.workspace.getConfiguration(SETTINGS_NAMESPACE);
	const legacyConfig = vscode.workspace.getConfiguration(LEGACY_SETTINGS_NAMESPACE);
	const currentBaseUrl =
		config.get<string>(APERTURE_BASE_URL_SETTING, "") || legacyConfig.get<string>(LEGACY_APERTURE_BASE_URL_SETTING, "");
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
			await context.secrets.delete(LEGACY_APERTURE_SECRET_KEY);
		}
	}

	await refreshApertureModelsWithMessages(context, diagnostics, provider);
}

async function refreshApertureModelsWithMessages(
	context: vscode.ExtensionContext,
	diagnostics: OutputChannelDiagnostics,
	provider: HuggingFaceChatModelProvider,
): Promise<void> {
	try {
		const count = await refreshApertureModels(context, diagnostics);
		provider.notifyModelInformationChanged();
		await vscode.window.showInformationMessage(`Aperture Copilot discovered ${count} model${count === 1 ? "" : "s"}.`);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		diagnostics.log("Aperture model refresh failed.", { error: message });
		await vscode.window.showErrorMessage(`Aperture Copilot could not refresh models: ${message}`);
	}
}
