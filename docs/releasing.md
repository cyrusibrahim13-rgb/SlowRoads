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

When all values are present, the workflow imports the certificate and builds a signed/notarized DMG. If signing values are missing, the workflow still builds and publishes an unsigned DMG so the release is available.

Unsigned macOS apps downloaded from GitHub may be reported by Gatekeeper as damaged or unable to open. For local testing, remove the download quarantine attribute with:

```sh
xattr -cr "/Applications/Slow Roads.app"
```

A signed and notarized release is required for normal end-user installation without this workaround.
