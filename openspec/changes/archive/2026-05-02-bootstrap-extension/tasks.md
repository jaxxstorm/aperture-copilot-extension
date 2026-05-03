## 1. Project Metadata and Activation

- [x] 1.1 Review `package.json` extension metadata, activation events, commands, configuration contributions, and proposed API declarations for Aperture bootstrap needs
- [x] 1.2 Ensure `src/extension.ts` registers the chat provider under the `oaicopilot` vendor id during activation
- [x] 1.3 Add or update VS Code commands for configuring Aperture and refreshing discovered models

## 2. Aperture Configuration

- [x] 2.1 Add configuration keys for the Aperture base URL and provider identity using existing extension configuration patterns
- [x] 2.2 Validate user-entered Aperture base URLs before storing them
- [x] 2.3 Store any Aperture credential or API key through `vscode.SecretStorage` using the existing secret key convention
- [x] 2.4 Surface actionable VS Code messages for missing, invalid, or incomplete Aperture configuration

## 3. Model Discovery

- [x] 3.1 Implement an Aperture API client for fetching available model configuration from the configured base URL
- [x] 3.2 Parse Aperture model responses into `HFModelItem`-compatible model entries
- [x] 3.3 Merge discovered Aperture models into `oaicopilot.models` while preserving unrelated models
- [x] 3.4 Update existing Aperture entries by provider/config identity without creating duplicates
- [x] 3.5 Preserve existing model settings when discovery fails

## 4. Chat Request Routing

- [x] 4.1 Route selected Aperture-discovered models through the OpenAI-compatible request path where possible
- [x] 4.2 Ensure requests use the configured Aperture base URL and selected model id
- [x] 4.3 Relay streamed Aperture responses back to VS Code Chat
- [x] 4.4 Report Aperture authentication, network, and model errors without exposing secret material

## 5. Documentation

- [x] 5.1 Update the README with extension purpose and Aperture setup instructions
- [x] 5.2 Document how to run the extension locally in an Extension Development Host
- [x] 5.3 Document compile, lint, format, test, package, and proposed API update commands
- [x] 5.4 Document VSIX packaging and VS Code marketplace publishing prerequisites

## 6. Tests and Verification

- [x] 6.1 Add tests for Aperture model discovery response parsing
- [x] 6.2 Add tests for merging discovered models into existing settings
- [x] 6.3 Add tests for preserving existing settings after discovery failures
- [x] 6.4 Add tests or compile-time coverage for provider registration and request routing
- [x] 6.5 Run `npm run compile`
- [x] 6.6 Run `npm run lint`
- [x] 6.7 Run `npm run test`
- [x] 6.8 Run `npm run build`
