## Purpose
Aperture Copilot provides a standalone VS Code chat model provider for Aperture-served models, including setup, discovery, provider-native request routing, diagnostics, documentation, packaging, and verification behavior.

## Requirements

### Requirement: Extension registers Aperture chat provider
The extension SHALL register an Aperture-backed chat model provider with VS Code Chat and Copilot Chat during activation without depending on a separate OAI-compatible provider extension.

#### Scenario: Provider registration on activation
- **WHEN** the extension activates
- **THEN** it registers a chat model provider under a globally unique Aperture Copilot vendor id

#### Scenario: External provider extension is absent
- **WHEN** Aperture Copilot activates and the OAI Compatible Provider for Copilot extension is not installed
- **THEN** Aperture Copilot still registers its provider and can expose configured Aperture models through VS Code Chat

#### Scenario: Provider model information changes
- **WHEN** Aperture model settings change after configuration or refresh
- **THEN** the extension notifies VS Code that language model chat information changed

### Requirement: User configures Aperture base URL
The extension SHALL provide a VS Code-native setup path for users to configure the Aperture base URL without manually editing model settings JSON.

#### Scenario: User provides base URL
- **WHEN** a user runs the Aperture setup command and enters a valid base URL
- **THEN** the extension stores the base URL in Aperture-named extension configuration

#### Scenario: User provides invalid base URL
- **WHEN** a user enters an invalid Aperture base URL
- **THEN** the extension rejects the value and shows an actionable error message

#### Scenario: Legacy base URL exists
- **WHEN** an Aperture-named base URL is not present
- **AND** a legacy compatibility-era base URL exists
- **THEN** the extension uses the legacy base URL as a fallback

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

### Requirement: Model metadata distinguishes upstream API modes
The extension SHALL expose Aperture model entries with provider-neutral ownership and provider-native API mode metadata.

#### Scenario: Aperture model metadata is displayed
- **WHEN** VS Code asks the extension for available chat model information
- **THEN** each Aperture model entry identifies Aperture as the model picker category while including upstream API mode details that do not label Anthropic or Bedrock-backed models as OpenAI models

#### Scenario: Manual model configuration declares API mode
- **WHEN** a manually configured Aperture model entry includes an API mode for OpenAI-compatible chat, OpenAI Responses, Anthropic Messages, or Bedrock
- **THEN** the extension uses that API mode for routing and diagnostics without changing the model entry provider identity

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
The extension SHALL reconcile discovered Aperture models into the canonical `aperture.models` setting without requiring the user to edit that setting manually.

#### Scenario: New Aperture models discovered
- **WHEN** discovery returns models that are not already configured
- **THEN** the extension adds those models to `aperture.models` with provider-native API mode metadata when available

#### Scenario: Existing canonical models are present
- **WHEN** `aperture.models` already contains Aperture model entries
- **THEN** the extension reads and updates those entries as the canonical model list

#### Scenario: Legacy models are present
- **WHEN** `aperture.models` is empty or absent
- **AND** `oaicopilot.models` contains existing model entries
- **THEN** the extension reads `oaicopilot.models` as the legacy model list and writes the refreshed result to `aperture.models`

#### Scenario: Existing unrelated models are present
- **WHEN** the effective model list contains non-Aperture models or entries for a different provider identity
- **THEN** the extension preserves those model entries

#### Scenario: Existing Aperture model changes
- **WHEN** discovery returns an Aperture model that already exists with the same provider/config identity
- **THEN** the extension updates that Aperture model entry, including API mode metadata, without duplicating it

#### Scenario: Previously discovered Aperture model is removed upstream
- **WHEN** `aperture.models` contains an extension-managed Aperture model entry for the configured provider identity
- **AND** the latest successful Aperture discovery response no longer includes that model identity
- **THEN** the extension removes that stale Aperture model entry from `aperture.models`

#### Scenario: Manual Aperture-like entry is present
- **WHEN** the effective model list contains an entry that uses the Aperture base URL but does not match the extension-managed provider/config identity convention
- **THEN** the extension preserves that entry during refresh

#### Scenario: Discovery fails during refresh
- **WHEN** refresh cannot successfully discover models from Aperture
- **THEN** the extension preserves the existing effective model list without pruning stale entries

#### Scenario: Model setting update fails
- **WHEN** VS Code rejects an update to `aperture.models`
- **THEN** the extension reports an actionable refresh failure and logs the rejected setting key and sanitized error detail

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

#### Scenario: Aperture returns no content
- **WHEN** Aperture returns a successful response with no usable response content
- **THEN** the extension reports an explicit empty response failure through VS Code

### Requirement: Chat requests support VS Code tool calls
The extension SHALL bridge VS Code language model tools to Aperture-served models when the selected model's API mode supports structured tool calls.

#### Scenario: Request includes available tools
- **WHEN** VS Code sends a chat request with language model tools available
- **AND** the selected Aperture model uses an API mode with structured tool-call request support
- **THEN** the extension forwards the tools to Aperture using the provider-native tool definition shape

#### Scenario: Request preserves previous tool calls
- **WHEN** a follow-up chat request includes a previous assistant tool call
- **THEN** the extension includes that tool call in the provider-native request message shape instead of flattening it into plain text

#### Scenario: Request preserves tool results
- **WHEN** a follow-up chat request includes a tool result
- **THEN** the extension includes that tool result in the provider-native request message shape associated with the original tool call id

#### Scenario: Model requests a tool
- **WHEN** Aperture returns a structured provider-native tool-call response
- **THEN** the extension reports a `LanguageModelToolCallPart` with the tool call id, tool name, and parsed input so VS Code can invoke the tool

#### Scenario: Model returns text and tool calls
- **WHEN** Aperture returns text content and structured tool calls in the same response
- **THEN** the extension reports text as `LanguageModelTextPart` and tool calls as `LanguageModelToolCallPart` without rendering tool-call payloads as assistant text

#### Scenario: Unsupported tool-call shape
- **WHEN** Aperture returns a successful response with a tool-call shape the extension cannot parse
- **THEN** the extension reports an explicit unsupported response failure or sanitized diagnostic instead of claiming the tool was executed

#### Scenario: API mode cannot represent tools
- **WHEN** VS Code sends a chat request with language model tools available
- **AND** the selected Aperture model uses an API mode that the extension cannot map to structured tool calls
- **THEN** the extension does not advertise tool-calling support for that model mode or omits unsupported tools without claiming file-editing capability

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

### Requirement: README documents local operation
The README SHALL include instructions for running, testing, packaging, publishing, standalone setup, troubleshooting, and provider-native Aperture model behavior.

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

#### Scenario: User reviews settings documentation
- **WHEN** a user reads setup or troubleshooting documentation
- **THEN** the README refers to the canonical `aperture.models` setting and explains legacy model-list fallback behavior

#### Scenario: User reviews provider-native model guidance
- **WHEN** a user reads README setup or troubleshooting guidance
- **THEN** the README describes models as Aperture-served and explains that upstream API modes may be OpenAI-compatible, OpenAI Responses, Anthropic Messages, or Bedrock-backed

#### Scenario: Enterprise Copilot user troubleshoots model availability
- **WHEN** a user is using GitHub Copilot enterprise BYOK or organization-managed models
- **THEN** the README explains that GitHub Copilot BYOK is a separate GitHub-managed model surface with its own policy requirements and links to the relevant GitHub documentation

#### Scenario: User investigates failures
- **WHEN** setup, model refresh, or chat prompts fail
- **THEN** the README tells the user where to find the Aperture Copilot output channel and what details are safe to share in an issue

### Requirement: Pull requests run unit tests
The repository SHALL run the extension unit test suite automatically for pull requests.

#### Scenario: Pull request test workflow runs
- **WHEN** a pull request targets the repository
- **THEN** GitHub Actions installs dependencies with a reproducible install command and runs `npm test`

#### Scenario: Pull request workflow uses limited permissions
- **WHEN** the pull request test workflow runs
- **THEN** it does not request release-writing permissions

### Requirement: Tags publish VSIX artifacts to GitHub Releases
The repository SHALL publish a packaged VSIX extension artifact to the GitHub Release associated with a version tag.

#### Scenario: Version tag is pushed
- **WHEN** a maintainer pushes a version tag matching the release workflow trigger
- **THEN** GitHub Actions installs dependencies, runs the test suite, builds the VSIX with `npm run build`, and uploads the generated `.vsix` file to the matching GitHub Release

#### Scenario: Release workflow has release permissions
- **WHEN** the tag release workflow runs
- **THEN** it requests the minimum GitHub token permission needed to create or update release assets

#### Scenario: Publisher identity is not required for GitHub Release publishing
- **WHEN** the tag release workflow publishes the VSIX artifact
- **THEN** it does not require VS Code Marketplace credentials or a Marketplace publisher token

### Requirement: Release automation is documented and verified
The project SHALL document or test the GitHub Actions release and pull request automation.

#### Scenario: Maintainer reviews release instructions
- **WHEN** a maintainer reads the repository documentation
- **THEN** they can identify how to run pull request checks and how to publish a VSIX to a GitHub Release by pushing a version tag

#### Scenario: Workflow files are inspected by tests
- **WHEN** the unit tests run
- **THEN** they verify that the pull request workflow runs `npm test` and the tag release workflow builds and uploads a VSIX artifact

### Requirement: Extension package declares Aperture logo
The extension SHALL declare a package-compatible Aperture logo image as its VS Code extension icon and include the SVG source logo in the package.

#### Scenario: Manifest declares logo
- **WHEN** the extension manifest is inspected
- **THEN** it declares `logo-light.png` as the extension icon

#### Scenario: Package includes logo
- **WHEN** a VSIX package is built
- **THEN** the package includes the `logo-light.png` file at the manifest-referenced path
- **AND** the package includes the source `logo-light.svg` file

### Requirement: Bootstrap behavior is verified
The project SHALL include focused verification for bootstrap behavior, standalone model configuration, provider-native routing, Aperture-named settings, logo packaging, and diagnostics behavior.

#### Scenario: Model discovery is tested
- **WHEN** tests run with mocked Aperture model responses
- **THEN** they verify model entries are created with the expected configuration shape and API mode metadata

#### Scenario: Canonical configuration merge is tested
- **WHEN** tests run with existing `aperture.models` settings
- **THEN** they verify Aperture model updates preserve unrelated entries and write refreshed values to `aperture.models`

#### Scenario: Legacy configuration fallback is tested
- **WHEN** tests run with only legacy `oaicopilot.models` settings
- **THEN** they verify the extension reads legacy entries and writes refreshed values to `aperture.models`

#### Scenario: Pruning stale models is tested
- **WHEN** tests run after successful discovery removes a previously managed Aperture model
- **THEN** they verify stale managed entries are pruned while unrelated and manual entries are preserved

#### Scenario: Request routing is tested
- **WHEN** tests run for Aperture model chat requests across supported API modes
- **THEN** they verify each request is sent to the configured Aperture base URL with the selected model id, matching endpoint, and provider-native request shape

#### Scenario: Response parsing is tested
- **WHEN** tests run with provider-native streamed and JSON responses
- **THEN** they verify supported text content is relayed to VS Code Chat and unsupported shapes produce sanitized diagnostics

#### Scenario: User-facing metadata is tested
- **WHEN** tests inspect contributed settings or model information
- **THEN** they verify supported API modes are accepted and non-OpenAI upstreams are not described as OpenAI models

#### Scenario: Secret fallback is tested
- **WHEN** tests run with legacy and canonical secret storage states
- **THEN** they verify canonical secrets are preferred and legacy secrets are used only as fallback

#### Scenario: Refresh diagnostics are tested
- **WHEN** tests simulate discovery or settings update failures
- **THEN** they verify the extension emits sanitized diagnostics and actionable user-facing errors

#### Scenario: Empty response handling is tested
- **WHEN** tests simulate successful provider responses with no usable content
- **THEN** they verify the provider reports an explicit empty response failure

#### Scenario: Manifest packaging is tested
- **WHEN** tests inspect the extension manifest and package ignore rules
- **THEN** they verify Aperture-named settings, the Aperture chat provider contribution, and packaged logo icon assets are declared

### Requirement: Tool-calling behavior is verified
The project SHALL include focused verification for VS Code tool-call request conversion, provider-native response parsing, and model capability advertisement.

#### Scenario: Tool definitions are tested
- **WHEN** tests run with mocked VS Code tool definitions
- **THEN** they verify supported Aperture API modes receive provider-native tool definition fields

#### Scenario: Tool response parsing is tested
- **WHEN** tests run with mocked provider-native tool-call responses
- **THEN** they verify the extension emits `LanguageModelToolCallPart` values with the expected call id, name, and input

#### Scenario: Tool result conversion is tested
- **WHEN** tests run with prior tool call and tool result message parts
- **THEN** they verify follow-up Aperture requests preserve those structured parts

#### Scenario: Text fallback is tested
- **WHEN** tests run with ordinary provider-native text responses
- **THEN** they verify existing text-only chat behavior remains unchanged
