#!/usr/bin/env bash
set -euo pipefail

# Cross-compiles umbra-agent for all supported architectures, signs the
# binaries (ed25519) and writes the release manifest consumed by the API
# (GET /releases/<file> and GET /agent/version).
#
# Usage: ./build-releases.sh [output-dir]
#   output-dir defaults to ../umbra/apps/api/resources/releases
#
# The signing key lives OUTSIDE the repos (override with UMBRA_SIGNING_KEY).
# The matching public key is embedded in the binaries via ldflags: an agent
# only applies updates signed by this key.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="${1:-$SCRIPT_DIR/../umbra/apps/api/resources/releases}"
KEY_FILE="${UMBRA_SIGNING_KEY:-$HOME/.config/umbra/agent-signing.pem}"

mkdir -p "$OUT_DIR"

# ── Signing key ──────────────────────────────────────────────────────────────
if [[ ! -f "$KEY_FILE" ]]; then
  mkdir -p "$(dirname "$KEY_FILE")"
  openssl genpkey -algorithm ed25519 -out "$KEY_FILE"
  chmod 600 "$KEY_FILE"
  echo "→ Generated new ed25519 signing key: $KEY_FILE"
  echo "  BACK IT UP — agents built with it will refuse updates signed otherwise."
fi
PUB_B64=$(openssl pkey -in "$KEY_FILE" -pubout -outform DER | tail -c 32 | base64 -w0)
VERSION=$(grep -oP 'Current = "\K[^"]+' "$SCRIPT_DIR/internal/version/version.go")
echo "→ Version $VERSION — public key $PUB_B64"

# ── Build ────────────────────────────────────────────────────────────────────
LDFLAGS="-s -w -X github.com/umbravpn/umbra-agent/internal/updater.publicKeyB64=$PUB_B64"

build() {
  local goarch="$1" goarm="$2" suffix="$3"
  echo "→ Building umbra-agent-$suffix..."
  (cd "$SCRIPT_DIR" && \
    CGO_ENABLED=0 GOOS=linux GOARCH="$goarch" GOARM="$goarm" \
    go build -trimpath -ldflags="$LDFLAGS" -o "$OUT_DIR/umbra-agent-$suffix" .)
}

build amd64 "" linux-amd64
build arm64 "" linux-arm64
build arm   7  linux-armv7

# ── Sign + manifest ──────────────────────────────────────────────────────────
MANIFEST="$OUT_DIR/manifest.json"
{
  printf '{\n  "version": "%s",\n  "binaries": {\n' "$VERSION"
  first=true
  for suffix in linux-amd64 linux-arm64 linux-armv7; do
    bin="$OUT_DIR/umbra-agent-$suffix"
    sha=$(sha256sum "$bin" | cut -d' ' -f1)
    sig=$(openssl pkeyutl -sign -inkey "$KEY_FILE" -rawin -in "$bin" | base64 -w0)
    $first || printf ',\n'
    first=false
    printf '    "%s": { "sha256": "%s", "signature": "%s" }' "$suffix" "$sha" "$sig"
  done
  printf '\n  }\n}\n'
} > "$MANIFEST"

echo ""
echo "✓ Releases built and signed into $OUT_DIR:"
ls -lh "$OUT_DIR"
