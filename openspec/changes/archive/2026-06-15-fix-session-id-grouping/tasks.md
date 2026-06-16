## 1. Session ID Request Plumbing

- [x] 1.1 Ignore request-scoped metadata such as `requestId` and `parentRequestId` when deriving session ids.
- [x] 1.2 Keep provider-native request bodies valid by avoiding unsupported `session_id` fields.
- [x] 1.3 Preserve existing Aperture session headers.
- [x] 1.4 Add common session header aliases for Aperture/OpenAI Codex-style grouping.

## 2. Verification

- [x] 2.1 Add routing tests that verify provider-native request bodies do not include unsupported session fields.
- [x] 2.2 Add header tests that verify all session header aliases carry the same stable session id.
- [x] 2.3 Add regression tests that verify request-scoped ids, raw prompt text, secrets, and raw VS Code metadata values are not used as session ids.
- [x] 2.4 Run `npm test`.
- [x] 2.5 Run `openspec validate fix-session-id-grouping --strict`.
