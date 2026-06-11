## Why

Aperture can expose models backed by OpenAI-compatible APIs, OpenAI Responses, Anthropic Messages, and AWS Bedrock routes, but the extension currently presents and routes them too much like generic OpenAI chat models. This causes incorrect labeling, brittle endpoint selection, and confusing behavior when upstream models require provider-native request and response shapes.

## What Changes

- Distinguish model provider identity from request API mode so configured and discovered models can be clearly described as OpenAI-compatible, OpenAI Responses, Anthropic Messages, or Bedrock-backed.
- Preserve the single VS Code chat provider experience while routing each selected Aperture model through the appropriate Aperture upstream endpoint and payload shape.
- Parse provider-native response shapes and streamed events for supported API modes instead of assuming OpenAI chat completion chunks everywhere.
- Update discovery, settings schema, diagnostics, and README language so non-OpenAI upstreams are not referred to as OpenAI models.
- Add focused verification for discovery mapping, endpoint routing, headers/session preservation, response parsing, and user-facing metadata across provider-native modes.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `aperture-extension-bootstrap`: Model discovery, model settings, request routing, diagnostics, documentation, and verification requirements now cover provider-native API modes for OpenAI-compatible, OpenAI Responses, Anthropic Messages, and Bedrock-backed models.

## Impact

- Affected code includes `src/types.ts`, `src/apertureModels.ts`, `src/provider.ts`, `src/apertureHeaders.ts`, `src/response.ts`, extension configuration in `package.json`, and related tests.
- The `oaicopilot.models` setting schema may accept additional API-mode metadata, but existing model entries remain compatible.
- README and diagnostics should use provider-neutral language where the model is Aperture-served and provider-specific language only when describing the selected upstream API mode.
