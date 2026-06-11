## ADDED Requirements

### Requirement: Extension owns model configuration
The extension SHALL contribute the `oaicopilot.models` configuration property required for storing discovered model entries.

#### Scenario: Model setting is registered
- **WHEN** Aperture Copilot is installed without any external OAI-compatible provider extension
- **THEN** VS Code recognizes `oaicopilot.models` as a registered configuration property

#### Scenario: Model refresh writes settings standalone
- **WHEN** a user refreshes Aperture models after configuring a valid Aperture base URL
- **THEN** the extension writes discovered models to `oaicopilot.models` without requiring another extension to be installed

#### Scenario: Existing non-Aperture entries remain valid
- **WHEN** `oaicopilot.models` contains entries from another provider
- **THEN** the extension preserves those entries and does not require their provider extension to be installed

### Requirement: Diagnostics are logged safely
The extension SHALL write detailed diagnostics for setup, model discovery, settings updates, chat requests, and response parsing to an Aperture Copilot output channel without exposing secret material or prompt content.

#### Scenario: Model refresh fails
- **WHEN** Aperture model refresh fails because discovery, parsing, or settings update fails
- **THEN** the extension logs the failing operation, endpoint path or setting key, status details when available, and a sanitized error summary

#### Scenario: Chat request fails
- **WHEN** an Aperture chat request fails because of network, authentication, provider, or model API errors
- **THEN** the extension logs the selected model identity, API mode, endpoint path, status details when available, and a sanitized error summary

#### Scenario: Secrets are present
- **WHEN** diagnostics are written for a request that used an API key or credential
- **THEN** the output channel does not include the API key, authorization header value, prompt text, or full request body

### Requirement: Provider failures are actionable
The extension SHALL surface concise actionable errors to users and include enough logged detail to troubleshoot provider compatibility failures.

#### Scenario: Upstream error response includes body
- **WHEN** Aperture or an upstream provider returns a non-successful HTTP response with an error body
- **THEN** the user-facing error includes the status and a short summary while the output channel logs a sanitized body excerpt

#### Scenario: Upstream response has no usable content
- **WHEN** Aperture returns a successful response that has no stream body, no parsed text, or an unsupported response shape
- **THEN** the extension reports an explicit empty or unsupported response error instead of silently returning no content

#### Scenario: Provider requires additional parameters
- **WHEN** an upstream provider reports a compatibility error such as a missing required query parameter
- **THEN** the diagnostics preserve the provider's sanitized error detail so users can identify whether the Aperture route or provider configuration is missing required data

## MODIFIED Requirements

### Requirement: Extension registers Aperture chat provider
The extension SHALL register an Aperture-backed chat model provider with VS Code Chat and Copilot Chat during activation without depending on a separate OAI-compatible provider extension.

#### Scenario: Provider registration on activation
- **WHEN** the extension activates
- **THEN** it registers a chat model provider under the `oaicopilot` vendor id

#### Scenario: External provider extension is absent
- **WHEN** Aperture Copilot activates and the OAI Compatible Provider for Copilot extension is not installed
- **THEN** Aperture Copilot still registers its provider and can expose configured Aperture models through VS Code Chat

#### Scenario: Existing provider modules remain available
- **WHEN** the Aperture bootstrap is added
- **THEN** existing OpenAI, Ollama, Anthropic, and Gemini provider modules remain usable through their configured models

### Requirement: Discovered models populate model settings
The extension SHALL merge discovered Aperture models into the registered `oaicopilot.models` setting without requiring the user to edit that setting manually or install another provider extension.

#### Scenario: New Aperture models discovered
- **WHEN** discovery returns models that are not already configured
- **THEN** the extension adds those models to `oaicopilot.models`

#### Scenario: Existing unrelated models are present
- **WHEN** `oaicopilot.models` already contains non-Aperture models
- **THEN** the extension preserves those model entries

#### Scenario: Existing Aperture model changes
- **WHEN** discovery returns an Aperture model that already exists with the same provider/config identity
- **THEN** the extension updates that Aperture model entry without duplicating it

#### Scenario: Model setting update fails
- **WHEN** VS Code rejects an update to `oaicopilot.models`
- **THEN** the extension reports an actionable refresh failure and logs the rejected setting key and sanitized error detail

### Requirement: Chat requests route to Aperture
The extension SHALL send chat requests for selected Aperture models to the configured Aperture-compatible API endpoint and report provider failures with sanitized diagnostics.

#### Scenario: User sends chat request
- **WHEN** a user selects an Aperture-discovered model and sends a chat prompt
- **THEN** the extension forwards the request to the configured Aperture base URL using the selected model id

#### Scenario: Aperture returns streamed content
- **WHEN** Aperture returns streamed chat content
- **THEN** the extension relays the streamed content back to VS Code Chat

#### Scenario: Aperture returns an error
- **WHEN** Aperture returns an authentication, network, model, or provider-compatibility error
- **THEN** the extension reports the failure through VS Code and logs sanitized diagnostics without exposing secret material

#### Scenario: Aperture returns no content
- **WHEN** Aperture returns a successful response with no usable response content
- **THEN** the extension reports an explicit empty response failure through VS Code

### Requirement: README documents local operation
The README SHALL include instructions for running, testing, packaging, publishing, standalone setup, and troubleshooting the extension.

#### Scenario: Developer runs locally
- **WHEN** a developer follows the README local run instructions
- **THEN** they can install dependencies, compile the extension, launch an extension development host, and configure an Aperture base URL

#### Scenario: Developer runs tests
- **WHEN** a developer follows the README test instructions
- **THEN** they can run compile, lint, format, test, and package commands

#### Scenario: Maintainer prepares publishing
- **WHEN** a maintainer follows the README publishing instructions
- **THEN** they can build a VSIX and understand the marketplace publishing prerequisites

#### Scenario: User installs standalone extension
- **WHEN** a user follows the README setup instructions
- **THEN** they understand that Aperture Copilot does not require the OAI Compatible Provider for Copilot extension

#### Scenario: Enterprise Copilot user troubleshoots model availability
- **WHEN** a user is using GitHub Copilot enterprise BYOK or organization-managed models
- **THEN** the README explains that GitHub Copilot BYOK is a separate GitHub-managed model surface with its own policy requirements and links to the relevant GitHub documentation

#### Scenario: User investigates failures
- **WHEN** setup, model refresh, or chat prompts fail
- **THEN** the README tells the user where to find the Aperture Copilot output channel and what details are safe to share in an issue

### Requirement: Bootstrap behavior is verified
The project SHALL include focused verification for the bootstrap behavior, standalone model configuration, and diagnostics behavior.

#### Scenario: Model discovery is tested
- **WHEN** tests run with a mocked Aperture model response
- **THEN** they verify model entries are created in the expected configuration shape

#### Scenario: Configuration merge is tested
- **WHEN** tests run with existing model settings
- **THEN** they verify Aperture model updates preserve unrelated entries

#### Scenario: Request routing is tested
- **WHEN** tests run for an Aperture model chat request
- **THEN** they verify the request is sent to the configured Aperture base URL with the selected model id

#### Scenario: Manifest configuration is tested
- **WHEN** tests inspect the extension manifest
- **THEN** they verify `oaicopilot.models` is contributed by Aperture Copilot

#### Scenario: Refresh diagnostics are tested
- **WHEN** tests simulate discovery or settings update failures
- **THEN** they verify the extension emits sanitized diagnostics and actionable user-facing errors

#### Scenario: Empty response handling is tested
- **WHEN** tests simulate successful provider responses with no usable content
- **THEN** they verify the provider reports an explicit empty response failure
