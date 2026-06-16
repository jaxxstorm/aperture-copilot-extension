import { APERTURE_CHAT_VENDOR_ID } from "./apertureModels";
import { HFModelItem } from "./types";

export function getLanguageModelChatId(model: HFModelItem): string {
	const configuredId = model.configId || `${model.provider}:${model.id}`;
	return `${APERTURE_CHAT_VENDOR_ID}:${configuredId}`;
}
