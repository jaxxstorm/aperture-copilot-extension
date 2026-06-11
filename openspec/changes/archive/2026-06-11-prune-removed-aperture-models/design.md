## Context

The refresh command currently merges newly discovered Aperture models into `oaicopilot.models`, updating matches and appending new entries, but it never removes previously discovered entries. That behavior was safe for preserving user settings, but it now leaves stale Aperture-owned models visible after the upstream model has been removed.

The extension already writes discovered entries with a provider-owned identity: `provider` comes from `oaicopilot.aperture.providerId`, `configId` is `${providerId}:${model.id}`, and the entry includes the configured Aperture base URL and Aperture secret key name. Those fields give us enough signal to distinguish extension-managed discovered entries from unrelated provider entries.

## Goals / Non-Goals

**Goals:**

- Make refresh reconcile extension-managed Aperture discoveries to the latest Aperture response.
- Remove stale discovered entries for the configured Aperture provider when they no longer appear in discovery.
- Preserve non-Aperture entries and manual entries that do not match the extension-managed Aperture identity convention.
- Emit sanitized diagnostics with enough counts to understand what refresh changed.

**Non-Goals:**

- Add a separate user interface for choosing individual stale models to remove.
- Remove models from unrelated providers or different Aperture provider ids.
- Delete credentials or other secret storage when a model disappears.
- Change the `oaicopilot.models` schema.

## Decisions

1. Treat discovered Aperture entries as a provider-scoped managed set.

   Rationale: Discovery writes entries with stable `provider` and `configId` values. Refresh can compute the discovered identities for the current Aperture response, keep current discoveries, and drop previous managed entries for the same provider that are absent.

   Alternative considered: delete any entry with the same base URL that is not rediscovered. That risks deleting manually configured entries that happen to use Aperture but were intentionally maintained by the user.

2. Keep unrelated entries before merging current discoveries.

   Rationale: Users may have OpenAI, Ollama, Anthropic, Gemini, or manually configured entries in `oaicopilot.models`. The refresh command should only reconcile the current Aperture provider's managed entries and then append/update current discoveries.

   Alternative considered: replace the whole model setting with discovery output. That would be simpler but destructive.

3. Return merge diagnostics in addition to the merged list.

   Rationale: Refresh diagnostics should explain whether a stale model was pruned. A small merge result object can expose counts for added, updated, preserved, and pruned entries without logging model prompts or credentials.

   Alternative considered: infer counts in `refreshApertureModels` after the fact. That spreads identity logic across modules and is easier to get subtly wrong.

## Risks / Trade-offs

- A manually edited entry may still match the managed `provider:configId` convention -> Preserve the existing convention as ownership signal; document that manually overriding the same config identity means refresh owns that entry.
- Existing stale entries created before `configId` was reliable may not be pruned -> Only prune entries with strong managed identity to avoid deleting user data unexpectedly.
- Refresh failure after discovery should not remove models -> Keep current behavior: only update settings after discovery succeeds and merge completes.

## Migration Plan

1. Add a managed-entry predicate and merge result shape to model settings merge logic.
2. Update refresh to use the merge result, write the merged setting, and log pruned/added/updated/preserved counts.
3. Add tests for pruning removed Aperture discoveries, preserving unrelated entries, preserving manual entries, and logging counts.
4. Run lint and test commands.
