## Context

The extension needs to make Aperture-served models available to VS Code Chat and Copilot Chat through the proposed `chatProvider` API. The current project shape already separates activation, provider logic, model types, and provider-specific API clients, so the bootstrap should use those boundaries instead of introducing a separate extension architecture.

Users should only need to provide an Aperture base URL and any required credentials. The extension will discover models from Aperture, map them into the existing `HFModelItem` model configuration shape, store secrets in `vscode.SecretStorage`, and register the discovered models under the existing `oaicopilot` vendor id.

## Goals / Non-Goals

**Goals:**

- Register an Aperture-backed chat provider during extension activation.
- Provide commands or settings for configuring the Aperture base URL and required credentials.
- Fetch available models from the Aperture API and persist/update model settings for the user.
- Route chat requests for selected Aperture models through the existing OpenAI-compatible provider path where possible.
- Document local development, testing, packaging, and marketplace publishing workflows.
- Add focused tests for configuration, discovery, provider registration, and request routing behavior.

**Non-Goals:**

- Implement a new model-serving backend.
- Replace support for existing OpenAI, Ollama, Anthropic, or Gemini provider modules.
- Require users to manually edit VS Code settings JSON to add models.
- Build a custom UI beyond normal VS Code commands, prompts, settings, and secret storage.

## Decisions

1. Use Aperture as an OpenAI-compatible provider variant.

   Rationale: Aperture-served models are intended to work like OpenAI-compatible chat models, and the repository already contains provider-specific code for OpenAI-compatible request routing. Reusing that path reduces bootstrap complexity and keeps behavior aligned with the similar upstream extension.

   Alternative considered: create a wholly separate Aperture provider stack. That would isolate Aperture concerns, but it would duplicate request conversion, streaming, and error handling that should remain shared.

2. Keep user-facing setup centered on a base URL.

   Rationale: The distinguishing user experience is that the extension discovers models after the user provides the Aperture base URL. This avoids forcing users to copy model definitions into VS Code settings.

   Alternative considered: require users to configure `oaicopilot.models` manually. That would be simpler internally but defeats the purpose of the extension.

3. Store credentials through `vscode.SecretStorage`.

   Rationale: The repository already uses `oaicopilot.apiKey` and `oaicopilot.apiKey.{provider}` keys for secrets. Aperture configuration should follow that convention so credentials are not written into settings files.

   Alternative considered: store credentials alongside the base URL in workspace or user settings. That would be easier to inspect but is not appropriate for secret material.

4. Persist discovered models into the existing model configuration shape.

   Rationale: The provider already expects configured models via `oaicopilot.models` and `HFModelItem`. Updating that setting after discovery lets the rest of the extension use the normal model selection path.

   Alternative considered: keep discovered models only in memory. That avoids settings writes but makes model availability less predictable across reloads and prevents users from inspecting or adjusting discovered entries.

## Risks / Trade-offs

- Aperture API shape may differ from the assumed `GetConfigBody` endpoint -> Isolate discovery parsing behind a small client function and handle missing/unknown fields with clear user errors.
- VS Code proposed chat provider APIs may change -> Keep proposed API typings current with `npm run download-api` and cover provider registration with compile-time checks.
- Writing discovered models to settings could overwrite user edits -> Merge by provider/config id and preserve unrelated models.
- Network or auth failures during discovery could leave no models available -> Surface actionable VS Code errors and leave existing model configuration intact.
- Marketplace publishing may reject proposed API usage without the right metadata -> Document package requirements and validate packaging with `npm run build`.

## Migration Plan

1. Add the Aperture configuration and discovery code behind extension activation and explicit setup commands.
2. Merge discovered model entries into `oaicopilot.models` without deleting unrelated provider entries.
3. Keep existing provider behavior working for manually configured models.
4. Document local run, test, package, and publish flows in the README.
5. Roll back by removing the Aperture-specific commands/discovery code and leaving existing provider modules unchanged.

## Open Questions

- What is the final stable Aperture model discovery endpoint and response schema?
- Does Aperture require an API key, Tailscale identity, or another authentication mechanism from VS Code extension requests?
- Should discovered model settings be global user settings only, or should workspace settings be supported as an opt-in?
