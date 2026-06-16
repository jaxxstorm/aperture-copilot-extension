## Why

Aperture dashboard requests from this extension are appearing as separate conversations instead of grouping into the same session. The extension is currently able to derive session ids from per-request metadata, so each turn can receive a unique opaque id even when it belongs to the same VS Code chat.

## What Changes

- Ensure every Aperture chat request includes a stable, opaque session id.
- Preserve and broaden session id HTTP headers for OpenAI Codex-style grouping without adding provider-invalid request body fields.
- Ignore per-request identifiers such as `requestId` and `parentRequestId` when deriving a session id.
- Keep session ids free of prompt text, secrets, and raw VS Code metadata values.
- Add regression tests covering stable header session id behavior across supported API modes.

## Capabilities

### New Capabilities

### Modified Capabilities
- `aperture-extension-bootstrap`: Strengthen chat request session identity requirements so Aperture can group related requests reliably across client identification methods.

## Impact

- Affects request construction in `src/provider.ts`, header creation in `src/apertureHeaders.ts`, and session id derivation in `src/session.ts`.
- Affects session id derivation and header behavior in `src/session.ts` and `src/apertureHeaders.ts`.
- Adds or updates tests for request routing and session headers.
- No runtime model behavior changes beyond session grouping metadata.
