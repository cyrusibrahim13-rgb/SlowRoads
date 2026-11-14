# Releasing

The release workflow runs on pushes to `main`, builds macOS and Windows installers, and updates the `v<version>` GitHub release. The app version comes from `package.json`.

## macOS signing

Configure these repository Actions secrets for a trusted macOS release:

- `APPLE_CERTIFICATE`: base64-encoded exported `.p12` signing certificate
- `APPLE_CERTIFICATE_PASSWORD`: password for the `.p12` file
- `APPLE_SIGNING_IDENTITY`: certificate identity, such as `Developer ID Application: Example (TEAMID)`
- `APPLE_ID`: Apple Developer account email
- `APPLE_PASSWORD` or `APPLE_APP_SPECIFIC_PASSWORD`: app-specific password for notarization
- `APPLE_TEAM_ID`: Apple Developer Team ID; this may also be configured as a repository variable

When all values are present, the workflow imports the certificate and builds a signed/notarized universal DMG for Intel and Apple-silicon Macs.

If Developer ID credentials are missing, the workflow builds an ad hoc-signed universal DMG and verifies the app bundle with `codesign --verify --deep --strict`. Ad hoc signing preserves bundle integrity but is not trusted by Gatekeeper. Users may still need to remove quarantine or use macOS Privacy & Security controls. A Developer ID signed and notarized release is required for normal end-user installation without warnings.

For an app copied from the DMG, the quarantine command is:

```sh
xattr -dr com.apple.quarantine "/Applications/Slow Roads.app"
open "/Applications/Slow Roads.app"
```

If the app still does not launch, collect the exact macOS diagnostic with:

```sh
spctl --assess --type execute --verbose=4 "/Applications/Slow Roads.app"
codesign --verify --deep --strict --verbose=4 "/Applications/Slow Roads.app"
```
