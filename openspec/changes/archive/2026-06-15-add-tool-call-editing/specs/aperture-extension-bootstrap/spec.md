## ADDED Requirements

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
