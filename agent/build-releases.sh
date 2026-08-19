#!/usr/bin/env bash
set -euo pipefail

# Cross-compiles umbra-agent for all supported architectures, signs the
# binaries (ed25519) and writes the release manifest consumed by the API
# (GET /releases/<file> and GET /agent/version).
#
# This is the ONLY way release binaries are produced — CI calls this same
# script (.github/workflows/deploy.yml), so the local and automated paths
# cannot drift apart. If you add a build flag, add it here.
#
# Usage: ./build-releases.sh [output-dir]
#   output-dir defaults to ../apps/api/resources/releases, i.e. straight into
#   the directory the API serves /releases/<file> from and that the API Docker
#   image copies in.
#
# Signing key, in order of precedence:
#   UMBRA_SIGNING_KEY_B64   base64 of the PEM (CI, from a repository secret)
#   UMBRA_SIGNING_KEY       path to the PEM
#   ~/.config/umbra/agent-signing.pem   (generated on first run)
#
# The matching public key is embedded in every binary via ldflags: an agent
# only ever applies an update signed by that exact key. Lose the private key
# and every deployed agent is permanently stuck on its current version.
#
# Version, in order of precedence:
#   UMBRA_VERSION           e.g. "1.2.0" or "v1.2.0" (leading v is stripped)
#   internal/version/version.go
# Whichever wins is injected into the binary AND written to the manifest, so
# an agent can never compare its own version against a differently-derived
# one and loop forever on a phantom update.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="${1:-$SCRIPT_DIR/../apps/api/resources/releases}"
MODULE="github.com/umbravpn/umbra-agent"

mkdir -p "$OUT_DIR"

# ── Signing key ──────────────────────────────────────────────────────────────
TMP_KEY=""
cleanup() { [[ -n "$TMP_KEY" ]] && rm -f "$TMP_KEY"; }
trap cleanup EXIT

if [[ -n "${UMBRA_SIGNING_KEY_B64:-}" ]]; then
  TMP_KEY="$(mktemp)"
  chmod 600 "$TMP_KEY"
  printf '%s' "$UMBRA_SIGNING_KEY_B64" | base64 -d > "$TMP_KEY"
  KEY_FILE="$TMP_KEY"
  echo "→ Signing key: from UMBRA_SIGNING_KEY_B64"
else
  KEY_FILE="${UMBRA_SIGNING_KEY:-$HOME/.config/umbra/agent-signing.pem}"
  if [[ ! -f "$KEY_FILE" ]]; then
    mkdir -p "$(dirname "$KEY_FILE")"
    openssl genpkey -algorithm ed25519 -out "$KEY_FILE"
    chmod 600 "$KEY_FILE"
    echo ""
    echo "!! Generated a NEW ed25519 signing key: $KEY_FILE"
    echo "!! BACK IT UP NOW. Agents built with it accept updates signed by it"
    echo "!! and by nothing else — losing it strands every deployed agent."
    echo ""
  fi
  echo "→ Signing key: $KEY_FILE"
fi

PUB_B64=$(openssl pkey -in "$KEY_FILE" -pubout -outform DER | tail -c 32 | base64 -w0)

# ── Version ──────────────────────────────────────────────────────────────────
if [[ -n "${UMBRA_VERSION:-}" ]]; then
  VERSION="${UMBRA_VERSION#v}"
else
  VERSION=$(grep -oP 'Current = "\K[^"]+' "$SCRIPT_DIR/internal/version/version.go")
fi
echo "→ Version $VERSION — public key $PUB_B64"

# ── Build ────────────────────────────────────────────────────────────────────
LDFLAGS="-s -w"
LDFLAGS+=" -X $MODULE/internal/updater.publicKeyB64=$PUB_B64"
LDFLAGS+=" -X $MODULE/internal/version.Current=$VERSION"

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
