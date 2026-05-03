## ADDED Requirements

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
- **WHEN** a request is sent through OpenAI, Anthropic, or Bedrock Aperture routing
- **THEN** the extension includes the session id header with the request
