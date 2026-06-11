import * as vscode from "vscode";
import { ApertureDiagnostics, noopDiagnostics, sanitizeError } from "./diagnostics";
import { HFModelItem } from "./types";
import { getUserAgent } from "./userAgent";
export {
	APERTURE_BASE_URL_SETTING,
	APERTURE_CHAT_VENDOR_ID,
	APERTURE_PROVIDER_ID,
	APERTURE_PROVIDER_ID_SETTING,
	APERTURE_SECRET_KEY,
	discoverApertureModels,
	getEffectiveModelSettings,
	inferApertureApiMode,
	LEGACY_APERTURE_SECRET_KEY,
	LEGACY_APERTURE_BASE_URL_SETTING,
	LEGACY_APERTURE_PROVIDER_ID_SETTING,
	LEGACY_MODELS_SETTING,
	LEGACY_SETTINGS_NAMESPACE,
	mergeModelSettings,
	mergeModelSettingsWithResult,
	MODELS_SETTING,
	normalizeBaseUrl,
	parseApertureModels,
	resolveApertureSecret,
	SETTINGS_NAMESPACE,
	toHFModelItems,
} from "./apertureModels";
import {
	APERTURE_BASE_URL_SETTING,
	APERTURE_PROVIDER_ID,
	APERTURE_PROVIDER_ID_SETTING,
	discoverApertureModels,
	getEffectiveModelSettings,
	LEGACY_APERTURE_BASE_URL_SETTING,
	LEGACY_APERTURE_PROVIDER_ID_SETTING,
	LEGACY_MODELS_SETTING,
	LEGACY_SETTINGS_NAMESPACE,
	mergeModelSettingsWithResult,
	MODELS_SETTING,
	normalizeBaseUrl,
	resolveApertureSecret,
	SETTINGS_NAMESPACE,
	toHFModelItems,
} from "./apertureModels";

export async function refreshApertureModels(
	context: vscode.ExtensionContext,
	diagnostics: ApertureDiagnostics = noopDiagnostics,
): Promise<number> {
	const canonicalConfig = vscode.workspace.getConfiguration(SETTINGS_NAMESPACE);
	const legacyConfig = vscode.workspace.getConfiguration(LEGACY_SETTINGS_NAMESPACE);
	const baseUrl =
		canonicalConfig.get<string>(APERTURE_BASE_URL_SETTING, "") ||
		legacyConfig.get<string>(LEGACY_APERTURE_BASE_URL_SETTING, "");
	const providerId =
		canonicalConfig.get<string>(APERTURE_PROVIDER_ID_SETTING, "") ||
		legacyConfig.get<string>(LEGACY_APERTURE_PROVIDER_ID_SETTING, APERTURE_PROVIDER_ID);
	const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
	const secret = await resolveApertureSecret(context.secrets);
	diagnostics.log("Refreshing Aperture models.", {
		baseUrl: normalizedBaseUrl,
		providerId,
		setting: `${SETTINGS_NAMESPACE}.${MODELS_SETTING}`,
		legacySetting: `${LEGACY_SETTINGS_NAMESPACE}.${LEGACY_MODELS_SETTING}`,
		secretSource: secret.source,
	});
	const discovered = toHFModelItems(
		await discoverApertureModels(normalizedBaseUrl, secret.value, fetch, getUserAgent(vscode.version), diagnostics),
		normalizedBaseUrl,
		providerId,
	);
	const effectiveSettings = getEffectiveModelSettings(
		canonicalConfig.get<HFModelItem[]>(MODELS_SETTING, []),
		legacyConfig.get<HFModelItem[]>(LEGACY_MODELS_SETTING, []),
	);
	const existing = effectiveSettings.models;
	const mergeResult = mergeModelSettingsWithResult(existing, discovered, providerId);

	try {
		await canonicalConfig.update(MODELS_SETTING, mergeResult.models, vscode.ConfigurationTarget.Global);
	} catch (error) {
		diagnostics.log("Aperture model setting update failed.", {
			setting: `${SETTINGS_NAMESPACE}.${MODELS_SETTING}`,
			error: sanitizeError(error),
		});
		throw error;
	}

	diagnostics.log("Aperture model refresh completed.", {
		discovered: discovered.length,
		existing: existing.length,
		merged: mergeResult.models.length,
		modelSettingSource: effectiveSettings.source,
		added: mergeResult.added,
		updated: mergeResult.updated,
		preserved: mergeResult.preserved,
		pruned: mergeResult.pruned,
	});
	return discovered.length;
}
