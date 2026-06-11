## Why

The repository already has `logo-light.svg` in the project root, but the extension manifest does not declare an icon derived from it. Including the logo in extension metadata gives the VS Code extension and packaged VSIX a recognizable Aperture identity in extension listings and installed-extension views.

## What Changes

- Generate a package-compatible PNG icon from `logo-light.svg`.
- Declare the generated PNG as the extension icon in `package.json`.
- Ensure the SVG source and generated PNG remain included in the packaged VSIX.
- Add focused manifest/package verification so the icon declaration does not regress.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `aperture-extension-bootstrap`: Extension packaging and manifest behavior will require the bundled Aperture logo to be declared as the extension icon.

## Impact

- Affected files: `package.json`, `logo-light.svg`, generated PNG icon, manifest/package tests.
- No runtime API, settings, command, or model discovery behavior changes.
- No breaking changes.
