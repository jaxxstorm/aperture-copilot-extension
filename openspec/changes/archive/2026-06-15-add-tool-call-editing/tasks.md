## 1. Internal Tool-Call Model

- [x] 1.1 Extend internal chat message types to represent text, tool calls, and tool results without depending on VS Code class instances.
- [x] 1.2 Update VS Code request message conversion to preserve `LanguageModelTextPart`, `LanguageModelToolCallPart`, and `LanguageModelToolResultPart`.
- [x] 1.3 Update token counting and message stringification helpers so structured parts do not crash or lose relevant text.

## 2. Provider-Native Request Routing

- [x] 2.1 Convert VS Code tool definitions from `ProvideLanguageModelChatResponseOptions.tools` into OpenAI-compatible chat completions tool definitions.
- [x] 2.2 Convert available tools and structured message parts into OpenAI Responses request fields.
- [x] 2.3 Convert available tools and structured message parts into Anthropic Messages request fields.
- [x] 2.4 Convert available tools and structured message parts into Bedrock Anthropic request fields where the existing Bedrock route can represent them.
- [x] 2.5 Make model capability advertisement reflect the API modes that the extension can actually bridge for structured tool calls.

## 3. Response Parsing and Reporting

- [x] 3.1 Replace text-only response parsing with typed parsed response parts for text and tool calls.
- [x] 3.2 Parse OpenAI-compatible chat completions streamed and JSON tool-call responses into internal tool-call parts.
- [x] 3.3 Parse OpenAI Responses streamed and JSON tool-call responses into internal tool-call parts.
- [x] 3.4 Parse Anthropic and Bedrock Anthropic structured tool-use responses into internal tool-call parts.
- [x] 3.5 Report parsed text as `LanguageModelTextPart` and parsed tool calls as `LanguageModelToolCallPart` from the provider.
- [x] 3.6 Add sanitized diagnostics for unsupported structured tool-call response shapes without logging prompt text, tool inputs, tool results, or secrets.

## 4. Documentation

- [x] 4.1 Update README behavior or troubleshooting notes to describe VS Code tool-call support and the requirement for structured provider-native tool responses.

## 5. Verification

- [x] 5.1 Add request routing tests that verify tool definitions and structured message parts are sent for supported API modes.
- [x] 5.2 Add response parsing tests that verify structured provider-native tool calls produce the expected call id, name, and input.
- [x] 5.3 Add provider/reporting tests that verify `LanguageModelToolCallPart` is emitted instead of rendering tool payloads as text.
- [x] 5.4 Add regression tests that verify ordinary text-only streamed and JSON responses still work.
- [x] 5.5 Run `npm run compile`, `npm run lint`, and `npm run test`.
