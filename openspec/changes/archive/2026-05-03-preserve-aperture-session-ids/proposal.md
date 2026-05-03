## Why

Aperture groups related LLM requests into sessions so users can review a whole coding conversation instead of isolated events. Requests from this extension should preserve a stable session identifier across turns so Aperture can attribute costs, logs, and request flow to the same VS Code chat conversation.

## What Changes

- Generate or extract a stable session identifier for VS Code chat requests handled by the extension.
- Send the session identifier to Aperture on every model request using the session mechanism Aperture recognizes for OpenAI Codex-style clients.
- Preserve one session id across repeated requests in the same chat conversation while avoiding leakage between unrelated conversations.
- Add tests covering session id stability and request header/body propagation.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `aperture-extension-bootstrap`: Add requirements for preserving Aperture session identifiers across related VS Code Chat and Copilot Chat requests.

## Impact

- Affected code includes chat request routing in `src/provider.ts`, any new session helper module, model request headers/bodies, tests, and README troubleshooting or behavior notes.
- No user-facing setting is required unless implementation discovers that VS Code does not expose enough chat context to derive a stable conversation id automatically.
