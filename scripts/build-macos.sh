#!/usr/bin/env bash
set -euo pipefail

rustup target add x86_64-apple-darwin
npm run prepare:index

npx tauri build --target universal-apple-darwin --no-bundle
npx tauri bundle --target universal-apple-darwin --bundles app

APP="src-tauri/target/universal-apple-darwin/release/bundle/macos/Slow Roads.app"
test -x "$APP/Contents/MacOS/slowroads"
plutil -lint "$APP/Contents/Info.plist"
codesign --verify --deep --strict --verbose=2 "$APP"

npx tauri bundle --target universal-apple-darwin --bundles dmg
