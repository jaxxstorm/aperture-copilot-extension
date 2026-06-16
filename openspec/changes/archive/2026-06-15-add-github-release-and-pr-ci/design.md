## Context

The repository has local verification and packaging commands in `package.json`, but GitHub does not currently run them automatically. The extension also uses proposed VS Code chat provider APIs, so GitHub Release VSIX distribution is useful even when Marketplace publication is not the immediate release channel.

There are no existing workflow files under `.github/workflows/`. The new automation can therefore be introduced without preserving legacy job names or triggers.

## Goals / Non-Goals

**Goals:**
- Run the unit test suite automatically for pull requests.
- Build the extension VSIX automatically when a version tag is pushed.
- Attach the generated VSIX to the GitHub Release for that tag.
- Keep the release process independent of the VS Code Marketplace publisher identity.

**Non-Goals:**
- Publish to the VS Code Marketplace.
- Publish to Open VSX.
- Change the package name, publisher, versioning policy, or runtime extension behavior.
- Create releases from arbitrary branches without a tag.

## Decisions

1. Use separate workflow files for pull request checks and release publishing.
   Rationale: PR checks and release publishing have different permissions, triggers, and failure modes. Keeping them separate lets the PR workflow use default read-only permissions while the release workflow requests `contents: write`.
   Alternative considered: one workflow with conditional jobs. That would work, but mixes release permissions and PR validation in one file and makes the release path less obvious.

2. Use `npm ci` followed by existing package scripts.
   Rationale: `npm ci` gives reproducible dependency installation from `package-lock.json`, and existing scripts keep CI behavior aligned with local development.
   Alternative considered: invoke `tsc`, `node --test`, and `vsce` directly. That duplicates command knowledge already captured in `package.json`.

3. Trigger release publication on version tags.
   Rationale: Tags are the natural durable release boundary and work across future repository owner moves. The workflow should use a pattern such as `v*` so maintainers can publish by pushing `v0.0.3`.
   Alternative considered: publish on GitHub Release creation. Tag push is simpler and can create or update the matching release through the GitHub CLI.

4. Upload VSIX artifacts to GitHub Releases, not Marketplace.
   Rationale: Marketplace identity depends on `publisher` and extension `name`, and the project may change publisher or owner later. GitHub Releases give users an installable artifact without locking the current Marketplace publisher decision.
   Alternative considered: run `vsce publish`. That requires Marketplace credentials and proposed API approval considerations that are outside this change.

## Risks / Trade-offs

- [Risk] Release workflow cannot create or update releases if repository Actions permissions are restricted. -> Mitigation: declare `permissions: contents: write` and document that repository Actions must allow the workflow token to write releases.
- [Risk] Existing tags may not match `package.json` version. -> Mitigation: name the VSIX from the build output and leave version policy unchanged; maintainers remain responsible for tagging the intended package version.
- [Risk] `npm run build` may create a VSIX with a different filename as version changes. -> Mitigation: upload `*.vsix` from the repository root rather than hard-coding the exact package version.
- [Risk] Proposed API usage may make Marketplace publishing unsuitable. -> Mitigation: this change only publishes VSIX files to GitHub Releases.
