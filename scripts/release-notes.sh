#!/usr/bin/env bash
# Generate the GitHub Release notes body for a Tocarta tagged release.
#
# Usage:
#   scripts/release-notes.sh <tag> <apk-path> [fingerprint]
#
# Arguments:
#   tag          The release tag (e.g. v0.1.0).
#   apk-path     Path to the built APK.
#   fingerprint  Optional SHA-256 signing key fingerprint. If omitted, a
#                placeholder is written and the maintainer must edit the
#                release before publishing. Retrieve with:
#                    eas credentials --platform android
#
# Output: prints the release-notes Markdown to stdout.
set -euo pipefail

if [ "$#" -lt 2 ] || [ "$#" -gt 3 ]; then
  echo "usage: $0 <tag> <apk-path> [fingerprint]" >&2
  exit 1
fi

TAG="$1"
APK_PATH="$2"
FINGERPRINT="${3:-<paste from \`eas credentials --platform android\`>}"

if [ ! -f "$APK_PATH" ]; then
  echo "error: APK not found at $APK_PATH" >&2
  exit 1
fi

APK_NAME="$(basename "$APK_PATH")"
SHA256="$(shasum -a 256 "$APK_PATH" | awk '{print $1}')"

cat <<EOF
## Tocarta ${TAG}

Android APK for sideload. Tocarta is an unofficial, independent, fan-made music year-guess card game.

### Verify the download

- SHA-256: \`${SHA256}\`
- Signing key fingerprint: \`${FINGERPRINT}\`

On your computer:

\`\`\`bash
shasum -a 256 ${APK_NAME}
\`\`\`

The output must match the SHA-256 above.

### Install on Android

See [Sideloading instructions](https://github.com/damarals/tocarta#install-sideload) in the README.

---

_Unofficial, independent, fan-made tool for personal non-commercial use. Not affiliated with, endorsed by, or connected to Hitster, Koninklijke Jumbo, Spotify, Deezer, or any related entities. All trademarks belong to their respective owners._
EOF
