## Context

Aperture-served models appear in one VS Code chat model picker, but they may be backed by different upstream APIs. The current implementation keeps a single provider surface and uses `apiMode` to choose OpenAI-compatible chat, OpenAI Responses, Anthropic Messages, or Bedrock routes, but the terminology and behavior still need to be made consistently provider-native.

The main constraint is compatibility: existing configured models should continue to work, while newly discovered models should carry enough metadata for the extension to route and describe them correctly. Aperture remains the configured base URL; upstream provider details are model metadata and request behavior, not separate VS Code providers.

## Goals / Non-Goals

**Goals:**

- Keep one Aperture chat provider registration while distinguishing upstream API mode per model.
- Support provider-native request body, endpoint, headers, response parsing, diagnostics, and tests for OpenAI-compatible chat, OpenAI Responses, Anthropic Messages, and Bedrock-backed models.
- Make model picker metadata, settings schema, README text, and diagnostics avoid calling Anthropic or Bedrock-backed models "OpenAI models".
- Preserve existing `oaicopilot.models` entries and continue to infer a reasonable mode when Aperture discovery does not provide explicit compatibility metadata.

**Non-Goals:**

- Implement a separate VS Code chat provider for every upstream vendor.
- Add direct Anthropic, AWS, or OpenAI credential management outside Aperture.
- Implement Bedrock Converse unless Aperture exposes and documents that route as the desired target.
- Build a full model capability taxonomy beyond the provider/API-mode fields needed for routing and presentation.

## Decisions

1. Store upstream route semantics as `apiMode` on each model entry.

   Rationale: `provider` identifies who owns the configured model entry in VS Code settings, while `apiMode` describes how to call Aperture for that selected model. Separating the two lets a model be `provider: "aperture"` and still route through Anthropic Messages or Bedrock without pretending the model is OpenAI-compatible.

   Alternative considered: encode upstream provider in `provider`. That would make discovery and merge identity harder because the extension is still the provider of the VS Code model entry, and it would blur settings ownership with upstream protocol.

2. Prefer explicit Aperture discovery metadata, then fall back to conservative inference.

   Rationale: Aperture is the source of truth when it returns compatibility fields or an `apiMode`/`api_mode`. Inference remains useful for legacy discovery responses and manually configured entries, but it should be a fallback and diagnostics should report the mode selected.

   Alternative considered: require users to edit `apiMode` manually. That is simpler internally but weakens the no-manual-settings setup path.

3. Keep provider-native adapters small and table-driven around endpoint, request body, headers, and response parsing.

   Rationale: The extension currently has compact routing helpers in `src/provider.ts`, `src/apertureHeaders.ts`, and `src/response.ts`. Extending that shape keeps the change focused while making each API mode explicit and testable.

   Alternative considered: split each mode into separate provider modules immediately. That may become useful if behavior grows, but today it risks moving code without improving correctness.

4. Use provider-neutral UI copy with provider-specific details.

   Rationale: Users choose Aperture-served models, but they need to see when a model is Anthropic Messages-backed, Bedrock-backed, or OpenAI Responses-backed for troubleshooting. The label should not call everything OpenAI, and diagnostics should include `apiMode` and endpoint path.

   Alternative considered: hide upstream mode completely. That keeps UI simpler but makes current failures like "model only supported in v1/responses" harder to understand.

## Risks / Trade-offs

- Discovery metadata may vary between Aperture versions -> Accept multiple explicit metadata names and keep inference as a fallback.
- Inference can misclassify unknown model ids -> Preserve manual `apiMode` override and log selected mode in diagnostics.
- Provider-native response shapes may evolve -> Keep response parsing tolerant of unsupported events and add tests for every supported shape.
- Bedrock route support may differ by model family -> Scope implementation to the existing Aperture Bedrock invoke route and document any unsupported modes in diagnostics.

## Migration Plan

1. Extend type definitions and settings schema to include the supported provider-native API modes.
2. Update model discovery to preserve explicit mode metadata and infer modes only when needed.
3. Update request routing, headers, and response parsing for each supported mode.
4. Update README and diagnostics language to refer to Aperture-served models and upstream API modes accurately.
5. Add tests for discovery, settings schema, endpoint routing, response parsing, session headers, and non-secret diagnostics.

Existing users do not need to migrate settings. If a model is misclassified, they can set `apiMode` manually until Aperture discovery returns explicit metadata or inference is updated.

## Open Questions

- What exact compatibility field names will Aperture standardize for OpenAI Responses, Anthropic Messages, and Bedrock routes?
- Should Bedrock Converse be added as a separate `apiMode` once Aperture exposes it, or should Aperture normalize it behind the existing Bedrock invoke route?
