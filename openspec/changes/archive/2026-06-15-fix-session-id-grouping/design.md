## Context

Aperture Copilot currently derives an opaque session id and sends it as HTTP headers with chat requests. The dashboard behavior shows requests are still not grouped correctly for this extension. One likely cause is that VS Code request metadata can include per-request identifiers such as `requestId`, and the current derivation treats those as stable session metadata.

The extension also routes to provider-native APIs that reject unknown top-level body fields. Therefore the fix must keep request bodies provider-valid and send the stable session id through Aperture-facing headers.

## Goals / Non-Goals

**Goals:**
- Include the same stable, opaque session id in every Aperture chat request header.
- Keep the session id stable across related VS Code chat requests even when VS Code metadata is sparse.
- Ignore metadata keys known to be request-scoped rather than session-scoped.
- Avoid exposing prompt text, secrets, or raw VS Code identifiers in the session id.
- Verify header session id propagation for all supported API modes.

**Non-Goals:**
- Change how Aperture itself groups requests server-side.
- Add user-facing session controls or settings.
- Change model routing, tool-call conversion, or response parsing behavior except where tests need session-aware request bodies.
- Add provider-invalid request body fields to strict upstream payloads.
- Encode conversation content into session ids.

## Decisions

1. Ignore request-scoped metadata keys when deriving session ids.
   Rationale: `requestId` and similar values can change every turn, so hashing them creates a unique dashboard row per request.
   Alternative considered: continue using all id-like metadata. That preserves more apparent signal but reproduces the grouping bug.

2. Keep session metadata in headers only for this extension.
   Rationale: Anthropic and Bedrock Anthropic request schemas reject unknown top-level fields such as `session_id`, while Aperture can inspect HTTP headers before proxying upstream.
   Alternative considered: add `session_id` to every request body. That breaks strict provider-native APIs.

3. Preserve existing headers and add common session header aliases.
   Rationale: OpenAI Codex-style grouping uses HTTP headers, and broader aliases improve the chance Aperture recognizes the session id without changing provider bodies.
   Alternative considered: move entirely to body fields. That would regress header-based grouping.

4. Test derivation and headers together.
   Rationale: the regression is caused by unstable derivation as much as transport, so tests must prove per-request ids are ignored and headers remain stable.

## Risks / Trade-offs

- [Risk] Aperture may only recognize a different header name. -> Mitigation: send the canonical Aperture header plus several common session header aliases.
- [Risk] VS Code may not expose stable conversation metadata for every request. -> Mitigation: keep the extension-host fallback id and document that it is stable but not content-derived.
- [Risk] Header values could accidentally be derived from request-scoped metadata. -> Mitigation: ignore request id keys and recurse only through object values, not arbitrary primitive strings.
