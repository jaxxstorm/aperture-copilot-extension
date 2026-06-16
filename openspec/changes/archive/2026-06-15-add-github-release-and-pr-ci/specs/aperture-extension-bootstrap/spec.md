## ADDED Requirements

### Requirement: Pull requests run unit tests
The repository SHALL run the extension unit test suite automatically for pull requests.

#### Scenario: Pull request test workflow runs
- **WHEN** a pull request targets the repository
- **THEN** GitHub Actions installs dependencies with a reproducible install command and runs `npm test`

#### Scenario: Pull request workflow uses limited permissions
- **WHEN** the pull request test workflow runs
- **THEN** it does not request release-writing permissions

### Requirement: Tags publish VSIX artifacts to GitHub Releases
The repository SHALL publish a packaged VSIX extension artifact to the GitHub Release associated with a version tag.

#### Scenario: Version tag is pushed
- **WHEN** a maintainer pushes a version tag matching the release workflow trigger
- **THEN** GitHub Actions installs dependencies, runs the test suite, builds the VSIX with `npm run build`, and uploads the generated `.vsix` file to the matching GitHub Release

#### Scenario: Release workflow has release permissions
- **WHEN** the tag release workflow runs
- **THEN** it requests the minimum GitHub token permission needed to create or update release assets

#### Scenario: Publisher identity is not required for GitHub Release publishing
- **WHEN** the tag release workflow publishes the VSIX artifact
- **THEN** it does not require VS Code Marketplace credentials or a Marketplace publisher token

### Requirement: Release automation is documented and verified
The project SHALL document or test the GitHub Actions release and pull request automation.

#### Scenario: Maintainer reviews release instructions
- **WHEN** a maintainer reads the repository documentation
- **THEN** they can identify how to run pull request checks and how to publish a VSIX to a GitHub Release by pushing a version tag

#### Scenario: Workflow files are inspected by tests
- **WHEN** the unit tests run
- **THEN** they verify that the pull request workflow runs `npm test` and the tag release workflow builds and uploads a VSIX artifact
