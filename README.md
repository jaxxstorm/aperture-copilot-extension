# Aperture Copilot

Aperture Copilot is a VS Code extension for using Tailscale Aperture-served models in VS Code Chat and Copilot Chat.

Unlike generic compatible-provider extensions that require manually editing VS Code model settings, this extension lets you provide an Aperture base URL, discovers the available models from Aperture, and populates `aperture.models` for you.

Aperture Copilot is standalone and registers its own Aperture language model provider.

## Configure Aperture

1. Run **Aperture Copilot: Configure Aperture** from the Command Palette.
2. Enter the Aperture base URL, for example `http://ai`.
3. Optionally enter an API key or credential if your Aperture endpoint requires one.
4. The extension refreshes available models and writes discovered entries to `aperture.models`.

Use **Aperture Copilot: Refresh Aperture Models** whenever Aperture models change.

## Provider-Native Modes

Aperture-served models can use different upstream API modes. The extension keeps one Aperture model picker category, then routes each model according to its configured `apiMode`:

- `openai`: OpenAI-compatible chat completions
- `openai-responses`: OpenAI Responses API
- `anthropic`: Anthropic Messages API
- `bedrock`: AWS Bedrock model invoke

Discovered model metadata is preferred when Aperture provides it. If older discovery responses do not include an API mode, the extension infers one from the model id and still allows manual `apiMode` overrides in `aperture.models`.

## Model Settings Migration

`aperture.models` is the canonical model setting. Builds that used the older compatibility-era model setting continue to work: when `aperture.models` is empty, the extension reads the legacy model list as a fallback and writes refreshed model entries to `aperture.models`.

## Troubleshooting

Open **Output: Aperture Copilot** from the Command Palette to inspect setup, model discovery, settings update, and chat request diagnostics. The log is designed to omit API keys, authorization headers, prompt text, and full request bodies. When filing an issue, include the failing command or model name, the sanitized output-channel entries, whether the model was discovered by Aperture or configured manually, and the API mode shown in diagnostics.

If model refresh fails with a settings error, confirm you are running a build that contributes `aperture.models`. Aperture Copilot owns that setting and should not need another extension to register it.

GitHub Copilot enterprise BYOK is a separate GitHub-managed model surface, not a dependency of Aperture Copilot. GitHub currently documents BYOK as public preview, lists OpenAI-compatible providers as supported, and requires the enterprise **Bring Your Own Language Model Key in VS Code** policy for VS Code use. See GitHub's BYOK documentation for current enterprise requirements: https://docs.github.com/en/copilot/how-tos/administer-copilot/manage-for-enterprise/use-your-own-api-keys

## Aperture Sessions

Every chat request includes an opaque session header so Aperture can group related VS Code Chat and Copilot Chat requests into one conversation in the Aperture dashboard. When VS Code exposes stable chat metadata, the extension derives the session from that metadata; otherwise it uses an extension-host fallback id without including prompt text or secrets.

## Tool Calls and File Editing

Aperture Copilot forwards VS Code-provided language model tools to supported Aperture API modes and relays structured model tool-call responses back to VS Code. File edits, reads, and other tool actions are still executed by VS Code's normal tool invocation flow; Aperture Copilot does not edit files directly.

If a model prints tool-like XML or JSON as assistant text instead of returning a structured provider-native tool call, VS Code will display that text and no tool will run. Check **Output: Aperture Copilot** for sanitized response-shape diagnostics when a model appears to claim an edit but the workspace is unchanged.

## Run Locally

```bash
npm install
npm run compile
```

Open this folder in VS Code, press `F5`, and choose **Run Extension**. In the Extension Development Host, run **Aperture Copilot: Configure Aperture** and provide your Aperture base URL.

## Test and Build

```bash
npm run compile
npm run lint
npm run format
npm run test
npm run build
```

If VS Code proposed API typings need to be refreshed, run:

```bash
npm run download-api
```

## Package and Publish

Create a VSIX package:

```bash
npm run build
```

Pull requests run the unit test suite in GitHub Actions using `npm ci` and `npm test`.

To publish an installable VSIX through GitHub Releases, push a version tag such as `v0.0.3`. The release workflow runs `npm ci`, `npm test`, and `npm run build`, then creates or updates the matching GitHub Release and uploads the generated `*.vsix` artifact. Repository Actions settings must allow the workflow token to write release contents.

GitHub Release publication does not require VS Code Marketplace credentials, a Marketplace publisher token, or a final Marketplace publisher identity.

Publishing to the VS Code Marketplace requires a publisher account, a personal access token, and marketplace approval for any proposed API usage declared by the extension.
