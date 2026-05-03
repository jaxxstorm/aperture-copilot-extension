## Context

Aperture tracks sessions by recognizing client-specific identifiers. For OpenAI Codex-style clients, the session id is sent as an HTTP header. This extension currently sends model requests with Aperture-specific routing and user-agent metadata, but it does not explicitly provide a session id. When Aperture cannot detect a known session identifier, it may assign random ids or fall back to content fingerprinting, which weakens conversation-level analysis.

VS Code's proposed chat provider API does not document a stable conversation id in the public type surface. The implementation therefore needs to inspect request/options metadata defensively and fall back to a local deterministic session id that remains stable across repeated requests in the same extension host when the same chat context is observed.

## Goals / Non-Goals

**Goals:**

- Send an Aperture-recognized session id with every model request from this extension.
- Preserve the same session id across repeated requests in the same VS Code chat conversation when VS Code exposes a stable request/thread/session identifier.
- Avoid leaking prompt content or user secrets in session identifiers.
- Keep request routing behavior for OpenAI, Anthropic, and Bedrock API modes intact.
- Add tests for session id derivation and header propagation.

**Non-Goals:**

- Recreate Aperture's full client-specific session detection logic inside the extension.
- Persist session ids permanently across VS Code restarts unless VS Code provides a stable conversation identifier.
- Add a user-facing setting for session ids.
- Change Aperture server-side session grouping behavior.

## Decisions

1. Send session ids as HTTP headers.

   Rationale: Aperture documents OpenAI Codex session tracking as header-based. The extension already controls request headers for all API modes, so this keeps the behavior independent of provider-specific request bodies.

   Alternative considered: Add session ids to request bodies. That would work for some clients, but it risks being forwarded to upstream providers and varies by API mode.

2. Use a helper module for session extraction and fallback generation.

   Rationale: VS Code request/options objects can change with proposed API updates. A small helper isolates defensive inspection and makes the behavior testable without running VS Code.

   Alternative considered: Inline session logic in `provider.ts`. That would be simpler initially but harder to test and easier to break as request metadata changes.

3. Prefer stable VS Code metadata when available, otherwise use extension-host fallback ids.

   Rationale: If VS Code exposes a `sessionId`, `conversationId`, `threadId`, or similar value, that should preserve real chat grouping. If it does not, a local fallback is still better than no explicit session id, and avoids exposing prompt text.

   Alternative considered: Hash full conversation content. That mirrors Aperture's OpenAI Chat fallback, but it would require handling sensitive prompt content in the extension and may change as context grows.

## Risks / Trade-offs

- VS Code may not expose a stable conversation id -> Use a local fallback and keep extraction logic easy to update when the API exposes better metadata.
- Header names may not match Aperture's preferred Codex header -> Send a primary documented-style session header plus conservative aliases until Aperture documents the exact extension client header.
- Fallback ids may group too broadly or too narrowly -> Scope fallback ids to observable request metadata and extension host lifetime, and avoid claiming cross-restart stability.
- Extra headers could be forwarded to upstream providers -> Session headers are non-secret opaque ids; still keep them free of user content.

## Migration Plan

1. Add a session helper that extracts or creates opaque session ids from request/options metadata.
2. Pass the session id into request header construction for all Aperture API modes.
3. Add tests for stable extraction, fallback generation, and header propagation.
4. Update README behavior notes so users know Aperture session grouping is supported.

## Open Questions

- What exact header name does Aperture prefer for Codex-style session tracking?
- Does the current VS Code proposed API expose a hidden but stable chat session field in request options at runtime?
- Should future versions persist session ids across Extension Development Host reloads if VS Code does not provide a stable id?
