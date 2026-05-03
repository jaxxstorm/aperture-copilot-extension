# Aperture Copilot

Aperture Copilot is a VS Code extension for using Tailscale Aperture-served models in VS Code Chat and Copilot Chat.

Unlike OpenAI-compatible Copilot extensions that require manually editing VS Code model settings, this extension lets you provide an Aperture base URL, discovers the available models from Aperture, and populates `oaicopilot.models` for you.

## Configure Aperture

1. Run **Aperture Copilot: Configure Aperture** from the Command Palette.
2. Enter the Aperture base URL, for example `http://ai`.
3. Optionally enter an API key or credential if your Aperture endpoint requires one.
4. The extension refreshes available models and writes discovered entries to `oaicopilot.models`.

Use **Aperture Copilot: Refresh Aperture Models** whenever Aperture models change.

## Aperture Sessions

Every chat request includes an opaque session header so Aperture can group related VS Code Chat and Copilot Chat requests into one conversation in the Aperture dashboard. When VS Code exposes stable chat metadata, the extension derives the session from that metadata; otherwise it uses an extension-host fallback id without including prompt text or secrets.

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

Publishing to the VS Code Marketplace requires a publisher account, a personal access token, and marketplace approval for any proposed API usage declared by the extension.
