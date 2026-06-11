## ADDED Requirements

### Requirement: Model metadata distinguishes upstream API modes
The extension SHALL expose Aperture model entries with provider-neutral ownership and provider-native API mode metadata.

#### Scenario: Aperture model metadata is displayed
- **WHEN** VS Code asks the extension for available chat model information
- **THEN** each Aperture model entry identifies Aperture as the model picker category while including upstream API mode details that do not label Anthropic or Bedrock-backed models as OpenAI models

#### Scenario: Manual model configuration declares API mode
- **WHEN** a manually configured `oaicopilot.models` entry includes an API mode for OpenAI-compatible chat, OpenAI Responses, Anthropic Messages, or Bedrock
- **THEN** the extension uses that API mode for routing and diagnostics without changing the model entry provider identity

## MODIFIED Requirements

### Requirement: Models are discovered from Aperture
The extension SHALL fetch available models from the configured Aperture API and convert them into the extension model configuration shape with upstream API mode metadata.

#### Scenario: Discovery succeeds
- **WHEN** the configured Aperture API returns available models with provider or compatibility metadata
- **THEN** the extension maps each available model into an `HFModelItem`-compatible configuration entry that preserves the model id, display name, Aperture base URL, provider-owned config identity, and upstream API mode

#### Scenario: Discovery infers missing API mode
- **WHEN** the configured Aperture API returns available models without explicit provider or compatibility metadata
- **THEN** the extension infers a compatible API mode from the model identifier and keeps that mode overridable by future discovery metadata or manual configuration

#### Scenario: Discovery fails
- **WHEN** the configured Aperture API cannot be reached or returns an unsupported response
- **THEN** the extension shows an actionable error and preserves existing model configuration

### Requirement: Discovered models populate model settings
The extension SHALL merge discovered Aperture models into the `oaicopilot.models` setting without requiring the user to edit that setting manually.

#### Scenario: New Aperture models discovered
- **WHEN** discovery returns models that are not already configured
- **THEN** the extension adds those models to `oaicopilot.models` with provider-native API mode metadata when available

#### Scenario: Existing unrelated models are present
- **WHEN** `oaicopilot.models` already contains non-Aperture models
- **THEN** the extension preserves those model entries

#### Scenario: Existing Aperture model changes
- **WHEN** discovery returns an Aperture model that already exists with the same provider/config identity
- **THEN** the extension updates that Aperture model entry, including API mode metadata, without duplicating it

### Requirement: Chat requests route to Aperture
The extension SHALL send chat requests for selected Aperture models to the configured Aperture endpoint that matches the model's upstream API mode.

#### Scenario: User sends OpenAI-compatible chat request
- **WHEN** a user selects an Aperture-discovered model whose API mode is OpenAI-compatible chat and sends a chat prompt
- **THEN** the extension forwards the request to the configured Aperture base URL using the OpenAI-compatible chat completions endpoint and request shape

#### Scenario: User sends OpenAI Responses request
- **WHEN** a user selects an Aperture-discovered model whose API mode is OpenAI Responses and sends a chat prompt
- **THEN** the extension forwards the request to the configured Aperture base URL using the OpenAI Responses endpoint and request shape

#### Scenario: User sends Anthropic Messages request
- **WHEN** a user selects an Aperture-discovered model whose API mode is Anthropic Messages and sends a chat prompt
- **THEN** the extension forwards the request to the configured Aperture base URL using the Anthropic Messages endpoint and request shape

#### Scenario: User sends Bedrock-backed request
- **WHEN** a user selects an Aperture-discovered model whose API mode is Bedrock and sends a chat prompt
- **THEN** the extension forwards the request to the configured Aperture base URL using the Bedrock model invoke endpoint and request shape

#### Scenario: Aperture returns provider-native streamed content
- **WHEN** Aperture returns streamed content for a supported provider-native API mode
- **THEN** the extension parses the matching stream event shape and relays the text content back to VS Code Chat

#### Scenario: Aperture returns provider-native JSON content
- **WHEN** Aperture returns non-streamed JSON content for a supported provider-native API mode
- **THEN** the extension parses the matching response shape and relays the text content back to VS Code Chat

#### Scenario: Aperture returns an error
- **WHEN** Aperture returns an authentication, network, model, or provider-compatibility error
- **THEN** the extension reports the failure through VS Code without exposing secret material and includes sanitized API mode and endpoint details in diagnostics

### Requirement: Chat requests preserve Aperture session identity
The extension SHALL send a stable, opaque session identifier with every Aperture model request so Aperture can group related requests into the same session.

#### Scenario: Request metadata has session id
- **WHEN** VS Code request or option metadata contains a stable chat session, conversation, thread, or request parent identifier
- **THEN** the extension sends an Aperture session header derived from that identifier

#### Scenario: Request metadata lacks session id
- **WHEN** VS Code request or option metadata does not expose a stable chat session identifier
- **THEN** the extension sends a generated opaque fallback session id

#### Scenario: Related requests reuse session id
- **WHEN** multiple model requests belong to the same observed VS Code chat context
- **THEN** the extension sends the same session id on each request

#### Scenario: Unrelated requests do not expose content
- **WHEN** the extension generates or derives a session id
- **THEN** the session id does not contain prompt text, API keys, or user secrets

#### Scenario: Session header is sent for all API modes
- **WHEN** a request is sent through OpenAI-compatible chat, OpenAI Responses, Anthropic Messages, or Bedrock Aperture routing
- **THEN** the extension includes the session id header with the request

### Requirement: README documents local operation
The README SHALL include instructions for running, testing, packaging, publishing, and troubleshooting the extension with provider-native Aperture models.

#### Scenario: Developer runs locally
- **WHEN** a developer follows the README local run instructions
- **THEN** they can install dependencies, compile the extension, launch an extension development host, and configure an Aperture base URL

#### Scenario: Developer runs tests
- **WHEN** a developer follows the README test instructions
- **THEN** they can run compile, lint, format, test, and package commands

#### Scenario: Maintainer prepares publishing
- **WHEN** a maintainer follows the README publishing instructions
- **THEN** they can build a VSIX and understand the marketplace publishing prerequisites

#### Scenario: User reviews provider-native model guidance
- **WHEN** a user reads README setup or troubleshooting guidance
- **THEN** the README describes models as Aperture-served and explains that upstream API modes may be OpenAI-compatible, OpenAI Responses, Anthropic Messages, or Bedrock-backed

### Requirement: Bootstrap behavior is verified
The project SHALL include focused verification for the bootstrap behavior and provider-native Aperture routing.

#### Scenario: Model discovery is tested
- **WHEN** tests run with mocked Aperture model responses
- **THEN** they verify model entries are created with the expected configuration shape and API mode metadata

#### Scenario: Configuration merge is tested
- **WHEN** tests run with existing model settings
- **THEN** they verify Aperture model updates preserve unrelated entries and update API mode metadata for matching Aperture entries

#### Scenario: Request routing is tested
- **WHEN** tests run for Aperture model chat requests across supported API modes
- **THEN** they verify each request is sent to the configured Aperture base URL with the selected model id, matching endpoint, and provider-native request shape

#### Scenario: Response parsing is tested
- **WHEN** tests run with provider-native streamed and JSON responses
- **THEN** they verify supported text content is relayed to VS Code Chat and unsupported shapes produce sanitized diagnostics

#### Scenario: User-facing metadata is tested
- **WHEN** tests inspect contributed settings or model information
- **THEN** they verify supported API modes are accepted and non-OpenAI upstreams are not described as OpenAI models
