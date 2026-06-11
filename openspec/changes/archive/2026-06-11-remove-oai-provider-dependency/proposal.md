## Why

Users can currently install and configure Aperture Copilot, but model refresh can fail because `oaicopilot.models` is not contributed by this extension and is only registered when a separate OAI-compatible provider extension is installed. The extension should be standalone, and failures during model refresh or chat request handling should produce actionable diagnostics for personal and enterprise GitHub Copilot users.

## What Changes

- Register the `oaicopilot.models` configuration owned by Aperture Copilot so discovered models can be written without requiring another extension.
- Ensure Aperture-discovered models are exposed through this extension's own VS Code language model provider and do not depend on the OAI Compatible Provider for Copilot extension.
- Improve model refresh and chat request error handling with sanitized output-channel logs, actionable user-facing messages, and clearer handling for empty or unsupported provider responses.
- Document standalone setup, troubleshooting, and known GitHub Copilot BYOK and enterprise policy considerations.
- Add verification that setup, model refresh, and chat failures behave correctly without the external provider installed.

## Capabilities

### New Capabilities

### Modified Capabilities
- `aperture-extension-bootstrap`: The bootstrap contract changes from populating an uncontributed compatibility setting to providing a standalone model configuration and diagnostics path owned by this extension.

## Impact

- Affected extension manifest: `package.json` configuration contributions and README setup/troubleshooting guidance.
- Affected runtime code: activation, Aperture model refresh, language model provider registration, request routing, response parsing, and error reporting.
- Affected settings: `oaicopilot.models`, `oaicopilot.aperture.baseUrl`, and `oaicopilot.aperture.providerId`.
- Affected verification: unit tests for configuration registration/merge behavior, refresh failures, request failures, empty responses, and standalone operation without external extension dependencies.
