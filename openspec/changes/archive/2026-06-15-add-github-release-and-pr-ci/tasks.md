## 1. Pull Request Test Workflow

- [x] 1.1 Create `.github/workflows/pr-tests.yml` with pull request triggers.
- [x] 1.2 Configure the PR workflow to check out the repository, set up Node.js, run `npm ci`, and run `npm test`.
- [x] 1.3 Keep the PR workflow permissions read-only or default-limited so it cannot write release assets.

## 2. Tag Release Workflow

- [x] 2.1 Create `.github/workflows/release-vsix.yml` with a version tag trigger such as `v*`.
- [x] 2.2 Configure the release workflow to check out the repository, set up Node.js, run `npm ci`, run `npm test`, and run `npm run build`.
- [x] 2.3 Configure the release workflow to create or update the matching GitHub Release and upload the generated `*.vsix` artifact.
- [x] 2.4 Request only the GitHub token permissions needed to write release contents.

## 3. Documentation

- [x] 3.1 Update README publishing or release instructions to explain PR checks and tag-based GitHub Release VSIX publication.
- [x] 3.2 Document that GitHub Release publication does not require VS Code Marketplace credentials or a stable Marketplace publisher decision.

## 4. Verification

- [x] 4.1 Add tests that inspect the PR workflow for `npm ci` and `npm test`.
- [x] 4.2 Add tests that inspect the release workflow for the version tag trigger, `npm test`, `npm run build`, GitHub Release upload, and `contents: write` permissions.
- [x] 4.3 Run `npm test`.
- [x] 4.4 Run `openspec validate add-github-release-and-pr-ci --strict`.
