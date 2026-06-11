## Why

The extension still exposes model configuration and user-facing text using the compatibility-era `oaicopilot` name even though the product is Aperture Copilot and the models are Aperture-served. This makes settings, diagnostics, and documentation harder to understand and keeps leaking implementation history into the user experience.

## What Changes

- Introduce Aperture-named model configuration as the canonical model setting.
- Migrate or mirror existing `oaicopilot.models` entries into the Aperture-named setting so existing users do not lose discovered or manually configured models.
- Keep read fallback for legacy `oaicopilot` settings and secret keys where needed during the migration.
- Update commands, diagnostics, README text, tests, and internal constants to refer to Aperture models/settings instead of `oaicopilot` models/settings where the name is user-facing.
- Preserve the VS Code chat provider vendor id only if the proposed API or compatibility surface still requires it; otherwise rename it with a compatibility fallback.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `aperture-extension-bootstrap`: Configuration, discovery, model settings, secret storage, provider registration, documentation, and verification requirements now cover the Aperture-named model setting and legacy `oaicopilot` migration/fallback behavior.

## Impact

- Affected code includes extension manifest configuration, settings constants, model refresh/merge reads and writes, provider registration, secret lookup, diagnostics, README, and tests.
- Existing users with `oaicopilot.models` should keep working after upgrade through migration or fallback.
- No model request protocol change is intended; this is a naming and compatibility migration.
