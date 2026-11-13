# Releasing

The release workflow runs on pushes to `main`, builds macOS and Windows installers, and updates the `v<version>` GitHub release. The app version comes from `package.json`.

## Required macOS secrets

Configure these repository Actions secrets before running a release build:

- `APPLE_CERTIFICATE`: base64-encoded exported `.p12` signing certificate
- `APPLE_CERTIFICATE_PASSWORD`: password for the `.p12` file
- `APPLE_SIGNING_IDENTITY`: certificate identity, such as `Developer ID Application: Example (TEAMID)`
- `APPLE_ID`: Apple Developer account email
- `APPLE_PASSWORD`: app-specific password for notarization
- `APPLE_TEAM_ID`: Apple Developer Team ID

The workflow fails before building macOS if any of these values is missing. This prevents publishing an unsigned app that macOS Gatekeeper reports as damaged or unable to open.
