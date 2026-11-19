#!/usr/bin/env bash
set -euo pipefail

# Run without signing or upload credentials on both PR and release runners.
npm ci --ignore-scripts
npm run build
npx --no-install cap sync ios

packages="$RUNNER_TEMP/pixel-paws-spm"
xcodebuild -resolvePackageDependencies -project ios/App/App.xcodeproj -scheme PixelPaws \
  -clonedSourcePackagesDirPath "$packages"
# Capacitor Swift PM 8.5.3. Update the revision when upgrading Capacitor.
test "$(git -C "$packages/checkouts/capacitor-swift-pm" rev-parse HEAD)" = \
  4c7f346d16196e21fbe23d4a7a6fc7af62af6742
