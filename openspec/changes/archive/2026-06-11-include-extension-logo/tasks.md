## 1. Manifest

- [x] 1.1 Generate `logo-light.png` from `logo-light.svg` and add `icon: "logo-light.png"` to `package.json`.
- [x] 1.2 Confirm the root `logo-light.svg` source asset and PNG icon remain present and manifest-relative.

## 2. Verification

- [x] 2.1 Add or update manifest tests to assert `package.json` declares `logo-light.png` as the extension icon.
- [x] 2.2 Add or update package/build verification so the VSIX includes `logo-light.png` and `logo-light.svg`.
- [x] 2.3 Run `npm run lint`, `npm test`, and `npm run build`.
