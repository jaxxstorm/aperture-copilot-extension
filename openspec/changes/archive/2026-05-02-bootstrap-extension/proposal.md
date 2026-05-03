## Why

VS Code users should be able to use Tailscale Aperture-served language models in Chat and Copilot Chat without hand-editing VS Code model settings. Bootstrapping the extension establishes the publishable extension surface, Aperture configuration flow, model discovery behavior, and local development/testing documentation needed to make the project usable end to end.

## What Changes

- Add a VS Code extension provider that registers Aperture-backed chat models for VS Code Chat and Copilot Chat.
- Add user configuration for an Aperture base URL and any required secret material through extension-managed flows.
- Discover available models from the Aperture API and populate the extension model settings automatically.
- Route chat requests for selected models through the Aperture-compatible API surface.
- Document local development, test, package, and marketplace publishing workflows in the README.
- Add verification coverage for model discovery, configuration handling, provider registration, and request routing.

## Capabilities

### New Capabilities

- `aperture-extension-bootstrap`: Covers extension activation, provider registration, Aperture configuration, model discovery, chat request routing, local run instructions, testing instructions, packaging, and publishing readiness.

### Modified Capabilities

- None.

## Impact

- Affected code includes extension activation, provider implementation, model configuration types, Aperture/OpenAI-compatible API client code, package metadata, README documentation, and tests.
- The extension depends on VS Code proposed chat provider APIs and should keep generated/proposed API typings up to date.
- Users will interact with VS Code extension settings and secret storage rather than manually editing model configuration JSON.
