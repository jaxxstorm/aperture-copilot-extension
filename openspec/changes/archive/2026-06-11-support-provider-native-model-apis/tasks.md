## 1. Model Metadata and Discovery

- [x] 1.1 Extend `HFModelItem` and `ApertureModelConfig` API mode types to include OpenAI-compatible chat, OpenAI Responses, Anthropic Messages, and Bedrock-backed routing.
- [x] 1.2 Update `package.json` configuration schema so `oaicopilot.models[*].apiMode` accepts every supported provider-native API mode.
- [x] 1.3 Update Aperture discovery parsing to prefer explicit `apiMode`, `api_mode`, and compatibility metadata before inference.
- [x] 1.4 Update API mode inference to classify known OpenAI Responses, Anthropic Messages, and Bedrock-backed model ids while preserving existing OpenAI-compatible behavior.
- [x] 1.5 Ensure discovered model entries retain Aperture provider ownership and include provider-native API mode metadata during settings merge.

## 2. Provider-Native Routing

- [x] 2.1 Update request endpoint selection for OpenAI-compatible chat, OpenAI Responses, Anthropic Messages, and Bedrock-backed API modes.
- [x] 2.2 Update request body construction for each supported API mode using provider-native request shapes.
- [x] 2.3 Update request headers so streaming preferences, content type, authorization, user agent, and Aperture session headers are correct for every API mode.
- [x] 2.4 Preserve manual `apiMode` overrides and include selected API mode plus endpoint path in sanitized diagnostics.
- [x] 2.5 Add fallback or actionable error handling for provider-compatibility failures such as a model requiring OpenAI Responses instead of chat completions.

## 3. Response Parsing and User-Facing Metadata

- [x] 3.1 Parse streamed OpenAI-compatible chat completion chunks.
- [x] 3.2 Parse streamed OpenAI Responses API output text deltas.
- [x] 3.3 Parse streamed Anthropic content deltas.
- [x] 3.4 Parse non-streamed JSON text from supported provider-native response shapes.
- [x] 3.5 Update model picker details, tooltips, diagnostics, and README wording so non-OpenAI upstreams are not called OpenAI models.

## 4. Verification

- [x] 4.1 Add discovery tests for explicit API mode metadata, compatibility metadata, and fallback inference.
- [x] 4.2 Add settings schema and merge tests covering provider-native API mode metadata.
- [x] 4.3 Add routing tests for endpoint, request body, and headers across all supported API modes.
- [x] 4.4 Add response parsing tests for streamed and JSON provider-native response shapes.
- [x] 4.5 Add diagnostics and model information tests that verify provider-neutral wording and secret redaction.
- [x] 4.6 Run `npm run lint` and `npm test`.
