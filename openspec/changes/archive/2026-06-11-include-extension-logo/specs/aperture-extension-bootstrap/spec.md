## ADDED Requirements

### Requirement: Extension package declares Aperture logo
The extension SHALL declare a package-compatible Aperture logo image as its VS Code extension icon and include the SVG source logo in the package.

#### Scenario: Manifest declares logo
- **WHEN** the extension manifest is inspected
- **THEN** it declares `logo-light.png` as the extension icon

#### Scenario: Package includes logo
- **WHEN** a VSIX package is built
- **THEN** the package includes the `logo-light.png` file at the manifest-referenced path
- **AND** the package includes the source `logo-light.svg` file
