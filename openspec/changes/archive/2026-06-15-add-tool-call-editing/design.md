## Context

Aperture Copilot implements VS Code's `LanguageModelChatProvider` and currently advertises `toolCalling: true` for every discovered Aperture model. The provider converts VS Code request messages into simplified role/content messages, sends those messages to the configured Aperture endpoint, and reports only `LanguageModelTextPart` response chunks back to VS Code.

That is enough for chat, but not for file editing. VS Code makes tools available to providers through `ProvideLanguageModelChatResponseOptions.tools` and expects providers to return `LanguageModelToolCallPart` instances when the model requests a tool. Without that bridge, provider-native tool calls are either omitted from the request or rendered as text, so tools such as file reads and edits never run.

## Goals / Non-Goals

**Goals:**

- Convert VS Code tool definitions into provider-native request fields for supported Aperture API modes.
- Preserve prior `LanguageModelToolCallPart` and `LanguageModelToolResultPart` content when sending follow-up messages back to Aperture.
- Parse provider-native tool-call responses and report `LanguageModelToolCallPart` values to VS Code.
- Preserve existing streamed and non-streamed text behavior for normal chat responses.
- Add focused tests for request conversion, response parsing, and tool-call reporting.

**Non-Goals:**

- Implement file editing inside Aperture Copilot itself; VS Code remains responsible for invoking registered tools.
- Add new custom tools contributed by this extension.
- Guarantee tool calling for upstream providers or models that do not return structured tool-call response shapes.
- Redesign model discovery or secret storage.

## Decisions

1. Use VS Code's native tool-call API as the execution boundary.

   The provider will emit `LanguageModelToolCallPart` and let VS Code or the calling extension invoke the tool. Alternative considered: parse model-emitted XML or text such as `<function_calls>` and execute file edits directly. That would bypass VS Code's tool authorization and confirmation flow, be fragile across model families, and increase the extension's security surface.

2. Add provider-neutral internal message parts, then map them to each API mode.

   The current `ChatMessage` shape only supports string content. The implementation should introduce a small internal representation for text, tool calls, and tool results so `toChatMessage`, request building, and response parsing do not lose structured parts. Alternative considered: pass VS Code classes through to routing code. That would couple provider-native request construction to VS Code object instances and make tests harder to express.

3. Support structured OpenAI-compatible and Anthropic-compatible tool shapes first.

   OpenAI chat completions, OpenAI Responses, Anthropic Messages, and Bedrock Anthropic all have structured tool-use concepts, but their request and stream formats differ. The implementation should support the request/response shapes Aperture already routes, with graceful diagnostics when a mode cannot represent tools or Aperture returns an unsupported tool-call shape. Alternative considered: disable tool calling for non-OpenAI modes. That would make Anthropic and Bedrock file-editing models appear less capable even when they can produce structured tool calls.

4. Treat tool calls as response content, not text.

   Response parsing should return typed response parts and `reportApertureResponse` should report text and tool calls through the matching VS Code classes. Alternative considered: preserve current string parser and add a best-effort text-to-tool parser. That would keep the bug class where rendered text looks actionable but no tool actually executes.

5. Keep capability advertisement honest.

   Models should only advertise `toolCalling` when the extension can pass available tools and parse structured tool-call responses for the model's API mode. If a mode is temporarily unsupported during implementation, its model information should not claim full tool-call support. Alternative considered: keep advertising tool support globally. That reproduces the current mismatch and user confusion.

## Risks / Trade-offs

- [Risk] Provider-native tool schemas may not map perfectly from VS Code tool metadata. -> Mitigation: preserve tool name, description, and input schema where available; add tests for the shapes emitted by current VS Code typings.
- [Risk] Streaming tool-call deltas can arrive across multiple chunks. -> Mitigation: parse with accumulated stream state and emit the final tool call only after the provider-native event indicates the call is complete.
- [Risk] Tool result content may include non-text parts. -> Mitigation: preserve known text/data parts where possible and convert unknown content into safe JSON/text summaries rather than dropping the result.
- [Risk] Some Aperture models may emit legacy XML-like tool-call text despite structured tools being supplied. -> Mitigation: do not execute text-markup tool calls directly; surface them as model text and rely on diagnostics/tests for structured paths.
- [Risk] More request metadata increases the chance of logging sensitive information. -> Mitigation: keep existing diagnostics sanitization and avoid logging tool inputs, tool results, prompt text, or full request bodies.

## Migration Plan

No user migration is required. Existing configured Aperture models continue to work for plain chat. After the implementation ships, models whose API mode supports the bridge can execute VS Code-provided tools through the normal VS Code tool invocation flow.

Rollback is to stop advertising `toolCalling` for affected model modes and fall back to text-only request/response handling.

## Open Questions

- Does Aperture normalize provider-native tool calls or pass through exact OpenAI/Anthropic event shapes for every API mode?
- Should model discovery eventually expose per-model tool support so the extension can advertise `toolCalling` more precisely than by API mode?
