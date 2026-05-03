import * as vscode from "vscode";
import { HFModelItem } from "./types";
import { getUserAgent } from "./userAgent";
export {
	APERTURE_BASE_URL_SETTING,
	APERTURE_PROVIDER_ID,
	APERTURE_PROVIDER_ID_SETTING,
	APERTURE_SECRET_KEY,
	discoverApertureModels,
	inferApertureApiMode,
	mergeModelSettings,
	MODELS_SETTING,
	normalizeBaseUrl,
	parseApertureModels,
	SETTINGS_NAMESPACE,
	toHFModelItems,
} from "./apertureModels";
import {
	APERTURE_BASE_URL_SETTING,
	APERTURE_PROVIDER_ID,
	APERTURE_PROVIDER_ID_SETTING,
	APERTURE_SECRET_KEY,
	discoverApertureModels,
	mergeModelSettings,
	MODELS_SETTING,
	normalizeBaseUrl,
	SETTINGS_NAMESPACE,
	toHFModelItems,
} from "./apertureModels";

export async function refreshApertureModels(context: vscode.ExtensionContext): Promise<number> {
	const config = vscode.workspace.getConfiguration(SETTINGS_NAMESPACE);
	const baseUrl = config.get<string>(APERTURE_BASE_URL_SETTING, "");
	const providerId = config.get<string>(APERTURE_PROVIDER_ID_SETTING, APERTURE_PROVIDER_ID);
	const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
	const apiKey = await context.secrets.get(APERTURE_SECRET_KEY);
	const discovered = toHFModelItems(
		await discoverApertureModels(normalizedBaseUrl, apiKey, fetch, getUserAgent(vscode.version)),
		normalizedBaseUrl,
		providerId,
	);
	const existing = config.get<HFModelItem[]>(MODELS_SETTING, []);
	const merged = mergeModelSettings(existing, discovered);

	await config.update(MODELS_SETTING, merged, vscode.ConfigurationTarget.Global);
	return discovered.length;
}
