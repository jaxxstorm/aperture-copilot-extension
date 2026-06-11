## Context

The extension began from compatibility with an OpenAI-compatible provider surface, so user-facing settings and some diagnostics still use `oaicopilot` names. The product is now Aperture Copilot, and model entries represent Aperture-served models, so the canonical setting should be Aperture-named.

The current model list lives under `oaicopilot.models`, while Aperture-specific settings already live in the `oaicopilot.aperture.*` namespace. Renaming without fallback would make existing users lose their discovered model list until they refresh or manually migrate settings. The migration should therefore be additive and conservative.

## Goals / Non-Goals

**Goals:**

- Make the canonical user-facing model setting `aperture.models`.
- Read legacy `oaicopilot.models` as a fallback when `aperture.models` is empty or absent.
- On refresh, write the reconciled model list to `aperture.models`.
- Keep existing users' model entries and secrets usable through migration/fallback.
- Update docs, manifest descriptions, diagnostics, and tests to use Aperture model terminology.

**Non-Goals:**

- Change the model request protocol or provider-native API mode behavior.
- Delete legacy user settings automatically.
- Require users to manually copy JSON between settings.
- Rename the extension id or marketplace publisher.

## Decisions

1. Introduce `aperture.models` as the canonical model setting.

   Rationale: The model list belongs to Aperture Copilot and should not expose the compatibility-era `oaicopilot` label. Keeping the value shape unchanged avoids a data model migration.

   Alternative considered: keep `oaicopilot.models` and only change labels. That reduces code churn but leaves the confusing setting name in place.

2. Read legacy `oaicopilot.models` as fallback, but write refresh output to `aperture.models`.

   Rationale: This preserves existing user state without requiring a destructive or automatic cleanup. After the first successful refresh, the canonical setting becomes populated and future reads use it.

   Alternative considered: copy legacy values during activation. That changes settings at startup without explicit user action and may surprise users who only wanted to inspect the extension.

3. Keep legacy secret keys available as fallback while using Aperture-named secret keys for new storage.

   Rationale: Existing credentials should continue to work. New setup should avoid writing more compatibility-era secret names.

   Alternative considered: force users to re-enter credentials. That would be a poor migration experience.

4. Treat provider vendor id and command ids separately from model setting names.

   Rationale: VS Code model provider vendor ids and command ids may be compatibility surfaces that users or VS Code proposed APIs rely on. Rename user-visible model settings first, then evaluate provider/command ids with explicit compatibility aliases if needed.

## Risks / Trade-offs

- Two model settings may temporarily exist -> Prefer canonical `aperture.models` when populated and document legacy fallback.
- Legacy and canonical settings may diverge -> Refresh writes canonical settings and diagnostics should indicate which source was read.
- Secret fallback can hide incomplete migration -> Diagnostics should report whether a credential came from canonical or legacy storage without exposing the value.
- Provider id rename may break model selection -> Do not rename provider vendor id unless tests and compatibility checks cover it.

## Migration Plan

1. Add canonical Aperture constants for settings namespace, model setting, and secret key.
2. Update model reads to prefer `aperture.models`, falling back to `oaicopilot.models`.
3. Update refresh to merge from the effective model list and write to `aperture.models`.
4. Update setup/secret lookup to prefer Aperture-named secrets with legacy fallback.
5. Update manifest settings, README, diagnostics, and tests.
6. Leave legacy setting contribution in place only if needed for discoverability/migration messaging; mark it as legacy in descriptions.
