## Why

When an upstream model is removed from Aperture, running the refresh command still leaves the stale model in `oaicopilot.models`. This makes the model picker show unavailable models and causes avoidable request failures after refresh appears to have succeeded.

## What Changes

- Reconcile extension-managed Aperture model entries against the latest discovery result during refresh.
- Remove stale Aperture-owned discovered model entries that are no longer returned by Aperture for the configured provider identity.
- Preserve unrelated model entries from other providers and preserve user/manual entries that are not identified as Aperture-discovered entries.
- Log refresh diagnostics that include discovered, updated, added, preserved, and pruned counts without exposing secrets.
- Add verification for stale model pruning, unrelated entry preservation, and refresh diagnostics.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `aperture-extension-bootstrap`: Model refresh and settings merge requirements now include pruning stale Aperture-discovered entries when Aperture no longer returns them.

## Impact

- Affected code includes Aperture model discovery/merge logic, refresh diagnostics, and tests around `oaicopilot.models` updates.
- Existing users keep unrelated configured models; only extension-managed Aperture discoveries that disappear from the current Aperture response are removed on refresh.
- No breaking configuration schema change is expected.
