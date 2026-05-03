## 1. Session Helper

- [x] 1.1 Add a helper module for deriving opaque Aperture session ids from VS Code request or option metadata
- [x] 1.2 Detect stable metadata fields such as session id, conversation id, thread id, request id, or parent request id without depending on a single undocumented shape
- [x] 1.3 Add fallback session id generation for requests without stable metadata
- [x] 1.4 Ensure generated or derived session ids do not include prompt text, API keys, or user secrets

## 2. Provider Integration

- [x] 2.1 Pass request options into the Aperture request construction path
- [x] 2.2 Add the derived session id to Aperture request headers for OpenAI, Anthropic, and Bedrock API modes
- [x] 2.3 Preserve existing user-agent, authorization, content type, and accept headers
- [x] 2.4 Keep existing request routing and response parsing behavior unchanged

## 3. Tests

- [x] 3.1 Add tests for session id extraction from common metadata field names
- [x] 3.2 Add tests for fallback session id stability
- [x] 3.3 Add tests that request headers include the session id for all API modes
- [x] 3.4 Add tests that session ids do not include prompt text or secret values

## 4. Documentation and Verification

- [x] 4.1 Update README notes to mention Aperture session grouping support
- [x] 4.2 Run `npm run compile`
- [x] 4.3 Run `npm run lint`
- [x] 4.4 Run `npm run test`
- [x] 4.5 Run `npm run build`
