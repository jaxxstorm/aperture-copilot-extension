## Context

Aperture Copilot already registers a VS Code language model provider under `oaicopilot`, discovers Aperture models, and writes discovered entries into `oaicopilot.models`. The reported failure comes from VS Code rejecting writes to `oaicopilot.models` because this extension does not contribute that configuration property; users can work around it only by installing another extension that contributes the same setting.

The extension also surfaces many failures only as short VS Code error messages. That leaves users without enough context to distinguish configuration-registration problems, Aperture discovery failures, GitHub Copilot provider policy limitations, upstream model API errors such as missing Azure `api-version`, or empty provider responses.

GitHub's BYOK documentation currently describes OpenAI-compatible providers as a supported enterprise BYOK provider type, notes that BYOK is public preview, and says VS Code use requires the enterprise "Bring Your Own Language Model Key in VS Code" policy. Aperture Copilot should be clear that it is a standalone VS Code language model provider, while GitHub-managed enterprise BYOK models are a separate GitHub Copilot surface with separate policy controls.

## Goals / Non-Goals

**Goals:**
- Make Aperture Copilot installable and usable without the OAI Compatible Provider for Copilot extension.
- Own the `oaicopilot.models` configuration schema needed by setup and model refresh.
- Preserve existing provider/model item shape so discovered models continue to flow into the current provider implementation.
- Add sanitized diagnostic logging for model discovery, settings updates, provider requests, upstream error bodies, response parsing, and empty responses.
- Improve README troubleshooting for standalone setup, VS Code proposed API requirements, and GitHub Copilot BYOK/enterprise caveats.
- Add focused tests that would have caught the unregistered-setting failure and the common silent failure modes.

**Non-Goals:**
- Implement GitHub enterprise BYOK administration or write directly to GitHub Copilot enterprise model settings.
- Guarantee all third-party Copilot provider paths behave identically; the extension can only control its own VS Code language model provider and its Aperture API calls.
- Add new model provider backends beyond Aperture's current OpenAI, Anthropic, and Bedrock-compatible routing.
- Remove the `oaicopilot` setting namespace in this change; keeping it avoids unnecessary migration churn.

## Decisions

1. Contribute `oaicopilot.models` in `package.json`.

   The extension will define the setting schema for its persisted model entries, including the fields used by `HFModelItem`: `id`, `name`, `model`, `provider`, `configId`, `baseUrl`, `apiKeyName`, and `apiMode`. This directly fixes the VS Code "not a registered configuration" error. Alternative considered: switch to `ExtensionContext.globalState` and avoid settings entirely. That would reduce visible settings surface, but it would require broader provider changes and would make model configuration harder to inspect or preserve alongside existing local settings.

2. Keep provider registration under `oaicopilot` for compatibility.

   The vendor id and setting namespace remain unchanged so existing local entries and command names keep working. Alternative considered: rename everything to `apertureCopilot`. That would be cleaner branding, but it introduces migration work unrelated to the bug and risks breaking users who already configured the extension.

3. Add a shared output channel and sanitized diagnostic helpers.

   Runtime code will write detailed diagnostic entries to an "Aperture Copilot" output channel and show shorter actionable messages in VS Code notifications. Logs must include endpoint path, provider mode, model/config id, status code, and sanitized response details, but must not include API keys, authorization headers, prompt text, or full request bodies. Alternative considered: only expand thrown error messages. That helps notifications but still leaves users without durable troubleshooting context.

4. Treat empty responses as failures with context.

   When an upstream provider returns a successful HTTP response but no stream body or no parsed text, the provider should log the response metadata and throw an actionable error instead of silently returning. Alternative considered: keep returning no output because the HTTP request technically succeeded. That matches the current behavior but causes the "Sorry, no response was returned" class of failures.

5. Document GitHub Copilot BYOK as adjacent, not a dependency.

   README troubleshooting should mention that GitHub enterprise BYOK supports OpenAI-compatible providers in public preview and has separate enterprise policy requirements for VS Code, but Aperture Copilot itself should not require those settings or the external OAI-compatible extension. Alternative considered: guide users to GitHub BYOK as the primary path. That would not satisfy the standalone extension goal and would not help personal/local Aperture use.

## Risks / Trade-offs

- [Risk] Contributing `oaicopilot.models` may overlap with another installed extension that already contributes the same setting. -> Mitigation: document that Aperture Copilot no longer requires the other extension, keep the schema permissive enough to preserve unrelated entries, and avoid claiming ownership over non-Aperture models at runtime.
- [Risk] More detailed logs can accidentally expose sensitive data. -> Mitigation: centralize redaction and avoid logging headers, secret storage values, prompt text, or full request JSON.
- [Risk] GitHub Copilot BYOK behavior may change while it remains public preview. -> Mitigation: phrase README guidance as current troubleshooting context and link to GitHub's docs instead of encoding enterprise behavior in runtime assumptions.
- [Risk] Some providers legitimately return non-stream JSON or partial content variants. -> Mitigation: retain support for streamed OpenAI responses and known JSON response shapes while logging unsupported shapes for future parser updates.

## Migration Plan

1. Add the `oaicopilot.models` configuration contribution.
2. Add output-channel diagnostics and route refresh/request failures through it.
3. Update response handling so empty or unsupported responses fail clearly.
4. Update README standalone setup and troubleshooting guidance.
5. Add tests for settings schema presence, merge preservation, refresh failure logging, request error logging, and empty-response handling.
6. Rollback is limited to reverting this change; existing user settings remain compatible because the namespace and model item shape do not change.

## Open Questions

- Should a future change migrate the public namespace from `oaicopilot` to an Aperture-branded namespace with backwards compatibility?
- Should Aperture expose richer model capability metadata so the provider can advertise tool calling, image input, token limits, and API mode more accurately?
