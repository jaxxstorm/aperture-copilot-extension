## 1. Merge Semantics

- [x] 1.1 Add a provider-scoped managed Aperture entry predicate based on `provider` and `configId` identity convention.
- [x] 1.2 Update model settings merge logic to remove stale managed Aperture entries for the configured provider when discovery no longer returns them.
- [x] 1.3 Preserve unrelated provider entries, different Aperture provider identities, and manual Aperture-like entries that do not match the managed identity convention.
- [x] 1.4 Return merge counts for added, updated, preserved, and pruned entries.

## 2. Refresh Diagnostics

- [x] 2.1 Update `refreshApertureModels` to use the merge result object when writing `oaicopilot.models`.
- [x] 2.2 Log refresh diagnostics with discovered, existing, merged, added, updated, preserved, and pruned counts.
- [x] 2.3 Ensure failed discovery still preserves existing model settings without pruning.

## 3. Verification

- [x] 3.1 Add tests for pruning stale managed Aperture entries after successful refresh discovery.
- [x] 3.2 Add tests for preserving unrelated provider entries, different Aperture provider identities, and manual Aperture-like entries.
- [x] 3.3 Add tests for updating existing managed Aperture entries without duplication.
- [x] 3.4 Add tests for merge/refresh diagnostics counts.
- [x] 3.5 Run `npm run lint` and `npm test`.
