import { createHash, randomUUID } from "node:crypto";

type UnknownRecord = Record<string, unknown>;

const STABLE_SESSION_KEYS = [
	"sessionid",
	"session_id",
	"chatsessionid",
	"chat_session_id",
	"conversationid",
	"conversation_id",
	"threadid",
	"thread_id",
	"chatid",
	"chat_id",
];

const REDACTED_KEYS = new Set([
	"authorization",
	"apikey",
	"api_key",
	"content",
	"input",
	"messages",
	"prompt",
	"secret",
	"text",
	"token",
	"tools",
]);

let fallbackSessionId: string | undefined;

export function deriveApertureSessionId(...sources: unknown[]): string {
	const metadataValue = findSessionMetadataValue(sources);
	if (metadataValue) {
		return opaqueSessionId("metadata", metadataValue);
	}

	fallbackSessionId ??= opaqueSessionId("fallback", randomUUID());
	return fallbackSessionId;
}

function findSessionMetadataValue(sources: readonly unknown[]): string | undefined {
	for (const source of sources) {
		const value = findSessionValue(source);
		if (value) {
			return value;
		}
	}

	return undefined;
}

function findSessionValue(source: unknown, seen = new WeakSet<object>()): string | undefined {
	if (!isRecord(source)) {
		return primitiveSessionValue(source);
	}

	if (seen.has(source)) {
		return undefined;
	}
	seen.add(source);

	for (const key of STABLE_SESSION_KEYS) {
		const directValue = getCaseInsensitive(source, key);
		const primitiveValue = primitiveSessionValue(directValue);
		if (primitiveValue) {
			return primitiveValue;
		}
	}

	for (const [key, value] of Object.entries(source)) {
		if (shouldSkipKey(key)) {
			continue;
		}
		if (!isRecord(value)) {
			continue;
		}

		const nestedValue = findSessionValue(value, seen);
		if (nestedValue) {
			return nestedValue;
		}
	}

	return undefined;
}

function getCaseInsensitive(record: UnknownRecord, normalizedKey: string): unknown {
	for (const [key, value] of Object.entries(record)) {
		if (normalizeKey(key) === normalizedKey) {
			return value;
		}
	}

	return undefined;
}

function primitiveSessionValue(value: unknown): string | undefined {
	if (typeof value === "string") {
		const trimmed = value.trim();
		return trimmed ? trimmed : undefined;
	}

	if (typeof value === "number" || typeof value === "bigint") {
		return String(value);
	}

	return undefined;
}

function shouldSkipKey(key: string): boolean {
	return REDACTED_KEYS.has(normalizeKey(key));
}

function normalizeKey(key: string): string {
	return key.toLowerCase().replace(/[^a-z0-9_]/g, "");
}

function opaqueSessionId(source: "metadata" | "fallback", value: string): string {
	return `aperture-vscode-${source}-${createHash("sha256").update(value).digest("hex").slice(0, 32)}`;
}

function isRecord(value: unknown): value is UnknownRecord {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
