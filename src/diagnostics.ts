export interface DiagnosticChannel {
	appendLine(value: string): void;
}

export interface ApertureDiagnostics {
	log(message: string, details?: Record<string, unknown>): void;
}

export class OutputChannelDiagnostics implements ApertureDiagnostics {
	public constructor(private readonly channel: DiagnosticChannel) {}

	public log(message: string, details: Record<string, unknown> = {}): void {
		const timestamp = new Date().toISOString();
		const sanitized = sanitizeDiagnosticValue(details);
		const hasDetails = typeof sanitized === "object" && sanitized !== null && Object.keys(sanitized).length > 0;
		const suffix = hasDetails ? ` ${JSON.stringify(sanitized)}` : "";
		this.channel.appendLine(`[${timestamp}] ${message}${suffix}`);
	}
}

export class NoopDiagnostics implements ApertureDiagnostics {
	public log(_message: string, _details?: Record<string, unknown>): void {}
}

export const noopDiagnostics = new NoopDiagnostics();

const SECRET_KEY_PATTERN = /(?:api[-_ ]?key|authorization|token|secret|credential|password)/i;
const PROMPT_KEY_PATTERN = /^(?:prompt|messages?|content|request[-_ ]?body|body)$/i;
const MAX_STRING_LENGTH = 1000;

export function sanitizeDiagnosticValue(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map((item) => sanitizeDiagnosticValue(item));
	}

	if (typeof value === "object" && value !== null) {
		const sanitized: Record<string, unknown> = {};
		for (const [key, nestedValue] of Object.entries(value)) {
			if (SECRET_KEY_PATTERN.test(key) || PROMPT_KEY_PATTERN.test(key)) {
				sanitized[key] = "[redacted]";
				continue;
			}

			sanitized[key] = sanitizeDiagnosticValue(nestedValue);
		}
		return sanitized;
	}

	if (typeof value === "string") {
		return redactDiagnosticString(value);
	}

	return value;
}

export function sanitizeError(error: unknown): string {
	const message = error instanceof Error ? error.message : String(error);
	return redactDiagnosticString(message);
}

export function summarizeUnknown(value: unknown): string {
	const sanitized = sanitizeDiagnosticValue(value);
	try {
		return truncate(JSON.stringify(sanitized));
	} catch {
		return truncate(String(sanitized));
	}
}

export function sanitizeBodyExcerpt(body: string): string {
	return truncate(redactDiagnosticString(body.replace(/\s+/g, " ").trim()));
}

function redactDiagnosticString(value: string): string {
	return truncate(
		value
			.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
			.replace(/("?(?:api[-_ ]?key|authorization|token|secret|credential|password)"?\s*[:=]\s*)("[^"]+"|[^\s,}]+)/gi, "$1[redacted]"),
	);
}

function truncate(value: string): string {
	if (value.length <= MAX_STRING_LENGTH) {
		return value;
	}

	return `${value.slice(0, MAX_STRING_LENGTH)}...`;
}
