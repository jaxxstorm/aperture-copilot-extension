## Context

`logo-light.svg` already exists in the repository root and is currently included by VSIX packaging, but the extension manifest does not identify a logo-derived icon. VS Code and Marketplace tooling use the manifest `icon` field to display an extension image in extension lists and detail views, and `vsce` rejects SVG files for that field.

The existing build uses `vsce package`, which packages root assets unless they are ignored. This change needs to keep the existing SVG source asset, generate a package-compatible PNG, connect the PNG to the manifest, and verify that packaging includes the logo assets.

## Goals / Non-Goals

**Goals:**

- Generate a PNG icon from `logo-light.svg`.
- Declare the generated PNG as the extension icon in `package.json`.
- Keep using the existing root-level SVG source asset rather than creating a duplicate asset directory.
- Add verification that the manifest references the PNG icon and the packaged VSIX includes the logo assets.

**Non-Goals:**

- Redesign or modify the SVG artwork.
- Change runtime extension behavior, commands, provider registration, settings, or model discovery.
- Introduce new build-time image conversion tooling.

## Decisions

1. Use a generated root-level PNG as the manifest icon and keep `logo-light.svg` as the source asset.

   Rationale: `vsce package` rejects SVG manifest icons, so the manifest must point at a PNG. Keeping the generated PNG next to the SVG keeps the asset relationship obvious and avoids a new asset directory for two files.

   Alternative considered: Reference the SVG directly. That is simpler but fails packaging. Moving both files under an `assets/` directory can be cleaner for larger asset sets, but it creates unnecessary path churn for this small change.

2. Verify the icon through manifest/package tests rather than runtime tests.

   Rationale: The behavior is packaging metadata, not extension-host runtime logic. Manifest assertions and VSIX packaging checks cover the user-visible outcome more directly.

   Alternative considered: Add a VS Code integration test. That would be heavier and less focused because VS Code does not need to execute extension code to read the icon metadata.

## Risks / Trade-offs

- Generated PNG could drift from the SVG source over time -> Mitigation: keep both files in the repository and document the SVG as the source through naming and tests.
- Future `.vscodeignore` changes could exclude the icon or source logo -> Mitigation: add package-facing verification that checks the icon and SVG source are not ignored and remain included.
