## 1. Canonical Settings

- [x] 1.1 Add canonical Aperture settings constants for `aperture.models` and any Aperture-named secret keys while retaining legacy `oaicopilot` constants.
- [x] 1.2 Update model reads to prefer `aperture.models` and fall back to legacy `oaicopilot.models` only when the canonical setting is empty or absent.
- [x] 1.3 Update refresh writes to persist reconciled model entries to `aperture.models`.
- [x] 1.4 Update provider model listing to read from the effective Aperture model setting.

## 2. Compatibility and Secrets

- [x] 2.1 Update setup/storage flow to store new credentials under Aperture-named secret keys.
- [x] 2.2 Update request credential lookup to prefer Aperture-named secret keys and fall back to legacy `oaicopilot` secret keys.
- [x] 2.3 Add diagnostics that identify canonical versus legacy setting/secret source without exposing values.
- [x] 2.4 Keep provider vendor id and command ids compatible unless implementation verifies safe aliases.

## 3. User-Facing Rename

- [x] 3.1 Update `package.json` configuration contributions to include `aperture.models` and describe legacy `oaicopilot.models` as migration fallback if it remains contributed.
- [x] 3.2 Update README setup and troubleshooting text to refer to `aperture.models` and explain legacy fallback.
- [x] 3.3 Rename internal constants, helper names, and diagnostics wording where practical so code refers to Aperture models instead of `oaicopilot` models.

## 4. Verification

- [x] 4.1 Add tests for canonical `aperture.models` reads and refresh writes.
- [x] 4.2 Add tests for legacy `oaicopilot.models` fallback and migration to canonical settings.
- [x] 4.3 Add tests for canonical secret preference and legacy secret fallback.
- [x] 4.4 Add manifest and documentation tests covering Aperture-named settings and legacy descriptions.
- [x] 4.5 Run `npm run lint` and `npm test`.
