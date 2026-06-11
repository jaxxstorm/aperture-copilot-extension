## MODIFIED Requirements

### Requirement: Discovered models populate model settings
The extension SHALL reconcile discovered Aperture models into the `oaicopilot.models` setting without requiring the user to edit that setting manually.

#### Scenario: New Aperture models discovered
- **WHEN** discovery returns models that are not already configured
- **THEN** the extension adds those models to `oaicopilot.models`

#### Scenario: Existing unrelated models are present
- **WHEN** `oaicopilot.models` already contains non-Aperture models or entries for a different provider identity
- **THEN** the extension preserves those model entries

#### Scenario: Existing Aperture model changes
- **WHEN** discovery returns an Aperture model that already exists with the same provider/config identity
- **THEN** the extension updates that Aperture model entry without duplicating it

#### Scenario: Previously discovered Aperture model is removed upstream
- **WHEN** `oaicopilot.models` contains an extension-managed Aperture model entry for the configured provider identity
- **AND** the latest successful Aperture discovery response no longer includes that model identity
- **THEN** the extension removes that stale Aperture model entry from `oaicopilot.models`

#### Scenario: Manual Aperture-like entry is present
- **WHEN** `oaicopilot.models` contains an entry that uses the Aperture base URL but does not match the extension-managed provider/config identity convention
- **THEN** the extension preserves that entry during refresh

#### Scenario: Discovery fails during refresh
- **WHEN** refresh cannot successfully discover models from Aperture
- **THEN** the extension preserves the existing `oaicopilot.models` value without pruning stale entries
