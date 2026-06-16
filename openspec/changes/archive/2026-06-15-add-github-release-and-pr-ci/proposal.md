## Why

The project currently has local commands for testing and packaging, but no repository automation to run them on pull requests or publish installable VSIX artifacts from release tags. Adding GitHub Actions makes regressions visible before merge and gives users a repeatable release artifact without requiring Marketplace publishing.

## What Changes

- Add a pull request workflow that installs dependencies and runs the unit test suite.
- Add a tag-triggered release workflow that builds the extension VSIX and uploads it to the matching GitHub Release.
- Keep release publishing scoped to GitHub Releases, not the VS Code Marketplace, so future publisher or owner changes do not block shipping a VSIX artifact.
- Document or verify the expected workflow behavior so maintainers know how to cut a release tag and where the VSIX appears.

## Capabilities

### New Capabilities

### Modified Capabilities
- `aperture-extension-bootstrap`: Add repository automation requirements for pull request test verification and tag-based VSIX release publication.

## Impact

- Adds GitHub Actions workflow files under `.github/workflows/`.
- Uses existing package scripts, especially `npm test` and `npm run build`.
- Requires GitHub Releases write permission for the tag publishing workflow.
- Does not change extension runtime behavior, model configuration, provider routing, or Marketplace publisher identity.
