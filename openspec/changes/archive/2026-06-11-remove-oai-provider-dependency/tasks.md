## 1. Manifest and Configuration

- [x] 1.1 Add an `oaicopilot.models` configuration contribution to `package.json` with a permissive schema for the persisted model item fields.
- [x] 1.2 Verify the setting can be updated by the extension without the OAI Compatible Provider for Copilot extension installed.
- [x] 1.3 Keep existing command names, vendor id, and setting namespace unchanged to avoid migration churn.

## 2. Diagnostics Infrastructure

- [x] 2.1 Add a shared Aperture Copilot output channel or diagnostics helper that can be used from activation, model refresh, and provider request code.
- [x] 2.2 Add sanitization utilities that redact API keys, authorization header values, prompt content, and full request bodies from diagnostics.
- [x] 2.3 Route configure and refresh failures through diagnostics while keeping user-facing notifications concise and actionable.

## 3. Model Discovery and Settings Updates

- [x] 3.1 Log discovery attempts by endpoint path and summarize non-successful responses without leaking secrets.
- [x] 3.2 Log no-model and unsupported discovery response shapes with enough detail to troubleshoot Aperture API compatibility.
- [x] 3.3 Wrap `oaicopilot.models` update failures so the rejected setting key and sanitized error detail are recorded.
- [x] 3.4 Confirm non-Aperture entries in `oaicopilot.models` are preserved during refresh.

## 4. Chat Request and Response Handling

- [x] 4.1 Log request metadata for selected model identity, API mode, and endpoint path without logging prompt text or secret headers.
- [x] 4.2 Improve non-successful HTTP response handling so user-facing errors include status and output-channel logs include sanitized body excerpts.
- [x] 4.3 Treat successful responses with no stream body, no parsed text, or unsupported JSON shapes as explicit empty or unsupported response failures.
- [x] 4.4 Preserve existing streamed OpenAI response handling and known JSON response parsing behavior.

## 5. Documentation

- [x] 5.1 Update README setup instructions to state that Aperture Copilot is standalone and does not require the OAI Compatible Provider for Copilot extension.
- [x] 5.2 Add troubleshooting guidance for finding the Aperture Copilot output channel and sharing sanitized diagnostics in issues.
- [x] 5.3 Document GitHub Copilot enterprise BYOK as a separate GitHub-managed model surface, including public-preview and VS Code policy caveats with a link to GitHub documentation.

## 6. Verification

- [x] 6.1 Add manifest verification for the contributed `oaicopilot.models` setting.
- [x] 6.2 Add or update model refresh tests for standalone settings writes and preservation of unrelated model entries.
- [x] 6.3 Add tests for discovery/settings update failures producing sanitized diagnostics.
- [x] 6.4 Add provider tests for non-successful upstream responses, empty successful responses, and unsupported response shapes.
- [x] 6.5 Run `npm run compile`, `npm run lint`, and targeted tests for the changed behavior.
