import { HFModelItem } from "./types";

export const APERTURE_SESSION_HEADER = "x-aperture-session-id";
export const APERTURE_SESSION_HEADER_ALIASES = ["x-codex-window-id", "x-client-request-id"];

export function getApertureRequestHeaders(
	apiKey: string | undefined,
	apiMode: NonNullable<HFModelItem["apiMode"]>,
	userAgent: string,
	sessionId: string,
): HeadersInit {
	return {
		Accept: apiMode === "openai" ? "text/event-stream" : "application/json",
		"Content-Type": "application/json",
		"User-Agent": userAgent,
		...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
		...getApertureSessionHeaders(sessionId),
	};
}

function getApertureSessionHeaders(sessionId: string): Record<string, string> {
	return [APERTURE_SESSION_HEADER, ...APERTURE_SESSION_HEADER_ALIASES].reduce<Record<string, string>>(
		(headers, name) => {
			headers[name] = sessionId;
			return headers;
		},
		{},
	);
}
