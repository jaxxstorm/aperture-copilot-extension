## Why

Aperture Copilot currently advertises tool-calling support, but it only forwards plain chat text and only relays text responses back to VS Code. When a model tries to edit files, tool-call markup is rendered as assistant text and no VS Code file-editing tool runs, leaving users with a false success message and unchanged files.

## What Changes

- Forward VS Code-provided tool definitions to Aperture requests for provider API modes that can express tools.
- Preserve prior tool calls and tool results when converting VS Code chat messages into provider-native request messages.
- Parse provider-native tool-call responses and emit `LanguageModelToolCallPart` instances so VS Code can invoke the requested tools.
- Keep text streaming behavior intact alongside tool calls and report unsupported tool-call response shapes through sanitized diagnostics.
- Document and test the file-editing/tool-calling behavior so the advertised capability matches runtime behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `aperture-extension-bootstrap`: Chat request routing and response parsing now include VS Code tool-calling behavior for Aperture-served models, including file-editing tool calls.

## Impact

- Affected code: `src/provider.ts`, `src/apertureRouting.ts`, `src/response.ts`, `src/types.ts`, and focused tests.
- Affected APIs: VS Code `LanguageModelChatProvider`, `ProvideLanguageModelChatResponseOptions.tools`, `LanguageModelToolCallPart`, and provider-native OpenAI/Anthropic tool-call request and response shapes.
- Documentation: README troubleshooting or behavior notes should clarify that Aperture Copilot supports VS Code tool calls when the selected upstream API mode and model return structured tool-call responses.
