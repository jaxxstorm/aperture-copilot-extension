## MODIFIED Requirements

### Requirement: Secrets are stored securely
The extension SHALL store API keys or other secret material in `vscode.SecretStorage` using Aperture-named secret keys for new credentials while retaining legacy secret fallback.

#### Scenario: User provides credential
- **WHEN** a user provides an Aperture credential during setup
- **THEN** the extension stores it using an Aperture-named secret key

#### Scenario: Legacy credential exists
- **WHEN** an Aperture-named credential is not present
- **AND** a legacy `oaicopilot` credential exists
- **THEN** the extension uses the legacy credential without exposing it in settings or diagnostics

#### Scenario: Settings are inspected
- **WHEN** VS Code settings are inspected after setup
- **THEN** secret material is not present in plain text settings

### Requirement: Discovered models populate model settings
The extension SHALL merge discovered Aperture models into the canonical `aperture.models` setting without requiring the user to edit that setting manually.

#### Scenario: New Aperture models discovered
- **WHEN** discovery returns models that are not already configured
- **THEN** the extension adds those models to `aperture.models`

#### Scenario: Existing canonical models are present
- **WHEN** `aperture.models` already contains Aperture model entries
- **THEN** the extension reads and updates those entries as the canonical model list

#### Scenario: Legacy models are present
- **WHEN** `aperture.models` is empty or absent
- **AND** `oaicopilot.models` contains existing model entries
- **THEN** the extension reads `oaicopilot.models` as the legacy model list and writes the refreshed result to `aperture.models`

#### Scenario: Existing unrelated models are present
- **WHEN** the effective model list already contains non-Aperture models
- **THEN** the extension preserves those model entries

#### Scenario: Existing Aperture model changes
- **WHEN** discovery returns an Aperture model that already exists with the same provider/config identity
- **THEN** the extension updates that Aperture model entry without duplicating it

### Requirement: README documents local operation
The README SHALL include instructions for running, testing, packaging, publishing, and configuring the extension with Aperture-named settings.

#### Scenario: Developer runs locally
- **WHEN** a developer follows the README local run instructions
- **THEN** they can install dependencies, compile the extension, launch an extension development host, and configure an Aperture base URL

#### Scenario: Developer runs tests
- **WHEN** a developer follows the README test instructions
- **THEN** they can run compile, lint, format, test, and package commands

#### Scenario: Maintainer prepares publishing
- **WHEN** a maintainer follows the README publishing instructions
- **THEN** they can build a VSIX and understand the marketplace publishing prerequisites

#### Scenario: User reviews settings documentation
- **WHEN** a user reads setup or troubleshooting documentation
- **THEN** the README refers to the canonical `aperture.models` setting and explains legacy `oaicopilot.models` fallback behavior

### Requirement: Bootstrap behavior is verified
The project SHALL include focused verification for bootstrap behavior, Aperture-named settings, and legacy compatibility.

#### Scenario: Model discovery is tested
- **WHEN** tests run with a mocked Aperture model response
- **THEN** they verify model entries are created in the expected configuration shape

#### Scenario: Canonical configuration merge is tested
- **WHEN** tests run with existing `aperture.models` settings
- **THEN** they verify Aperture model updates preserve unrelated entries and write refreshed values to `aperture.models`

#### Scenario: Legacy configuration fallback is tested
- **WHEN** tests run with only legacy `oaicopilot.models` settings
- **THEN** they verify the extension reads legacy entries and writes refreshed values to `aperture.models`

#### Scenario: Secret fallback is tested
- **WHEN** tests run with legacy and canonical secret storage states
- **THEN** they verify canonical secrets are preferred and legacy secrets are used only as fallback

#### Scenario: Request routing is tested
- **WHEN** tests run for an Aperture model chat request
- **THEN** they verify the request is sent to the configured Aperture base URL with the selected model id
