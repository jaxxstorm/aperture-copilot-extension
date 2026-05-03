## ADDED Requirements

### Requirement: Extension registers Aperture chat provider

The extension SHALL register an Aperture-backed chat model provider with VS Code Chat and Copilot Chat during activation.

#### Scenario: Provider registration on activation

- **WHEN** the extension activates
- **THEN** it registers a chat model provider under the `oaicopilot` vendor id

#### Scenario: Existing provider modules remain available

- **WHEN** the Aperture bootstrap is added
- **THEN** existing OpenAI, Ollama, Anthropic, and Gemini provider modules remain usable through their configured models

### Requirement: User configures Aperture base URL

The extension SHALL provide a VS Code-native setup path for users to configure the Aperture base URL without manually editing model settings JSON.

#### Scenario: User provides base URL

- **WHEN** a user runs the Aperture setup command and enters a valid base URL
- **THEN** the extension stores the base URL in extension configuration

#### Scenario: User provides invalid base URL

- **WHEN** a user enters an invalid Aperture base URL
- **THEN** the extension rejects the value and shows an actionable error message

### Requirement: Secrets are stored securely

The extension SHALL store API keys or other secret material in `vscode.SecretStorage`.

#### Scenario: User provides credential

- **WHEN** a user provides an Aperture credential during setup
- **THEN** the extension stores it using the existing `oaicopilot.apiKey` or provider-scoped secret key convention

#### Scenario: Settings are inspected

- **WHEN** VS Code settings are inspected after setup
- **THEN** secret material is not present in plain text settings

### Requirement: Models are discovered from Aperture

The extension SHALL fetch available models from the configured Aperture API and convert them into the extension model configuration shape.

#### Scenario: Discovery succeeds

- **WHEN** the configured Aperture API returns available models
- **THEN** the extension maps each available model into an `HFModelItem`-compatible configuration entry

#### Scenario: Discovery fails

- **WHEN** the configured Aperture API cannot be reached or returns an unsupported response
- **THEN** the extension shows an actionable error and preserves existing model configuration

### Requirement: Discovered models populate model settings

The extension SHALL merge discovered Aperture models into the `oaicopilot.models` setting without requiring the user to edit that setting manually.

#### Scenario: New Aperture models discovered

- **WHEN** discovery returns models that are not already configured
- **THEN** the extension adds those models to `oaicopilot.models`

#### Scenario: Existing unrelated models are present

- **WHEN** `oaicopilot.models` already contains non-Aperture models
- **THEN** the extension preserves those model entries

#### Scenario: Existing Aperture model changes

- **WHEN** discovery returns an Aperture model that already exists with the same provider/config identity
- **THEN** the extension updates that Aperture model entry without duplicating it

### Requirement: Chat requests route to Aperture

The extension SHALL send chat requests for selected Aperture models to the configured Aperture-compatible API endpoint.

#### Scenario: User sends chat request

- **WHEN** a user selects an Aperture-discovered model and sends a chat prompt
- **THEN** the extension forwards the request to the configured Aperture base URL using the selected model id

#### Scenario: Aperture returns streamed content

- **WHEN** Aperture returns streamed chat content
- **THEN** the extension relays the streamed content back to VS Code Chat

#### Scenario: Aperture returns an error

- **WHEN** Aperture returns an authentication, network, or model error
- **THEN** the extension reports the failure through VS Code without exposing secret material

### Requirement: README documents local operation

The README SHALL include instructions for running, testing, packaging, and publishing the extension.

#### Scenario: Developer runs locally

- **WHEN** a developer follows the README local run instructions
- **THEN** they can install dependencies, compile the extension, launch an extension development host, and configure an Aperture base URL

#### Scenario: Developer runs tests

- **WHEN** a developer follows the README test instructions
- **THEN** they can run compile, lint, format, test, and package commands

#### Scenario: Maintainer prepares publishing

- **WHEN** a maintainer follows the README publishing instructions
- **THEN** they can build a VSIX and understand the marketplace publishing prerequisites

### Requirement: Bootstrap behavior is verified

The project SHALL include focused verification for the bootstrap behavior.

#### Scenario: Model discovery is tested

- **WHEN** tests run with a mocked Aperture model response
- **THEN** they verify model entries are created in the expected configuration shape

#### Scenario: Configuration merge is tested

- **WHEN** tests run with existing model settings
- **THEN** they verify Aperture model updates preserve unrelated entries

#### Scenario: Request routing is tested

- **WHEN** tests run for an Aperture model chat request
- **THEN** they verify the request is sent to the configured Aperture base URL with the selected model id
