#!/usr/bin/env bash
set -euo pipefail

# Cross-compiles umbra-agent for all supported architectures and drops the
# binaries where the API serves them (GET /releases/<file>).
#
# Usage: ./build-releases.sh [output-dir]
#   output-dir defaults to ../umbra/apps/api/resources/releases

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="${1:-$SCRIPT_DIR/../umbra/apps/api/resources/releases}"

mkdir -p "$OUT_DIR"

build() {
  local goarch="$1" goarm="$2" suffix="$3"
  echo "→ Building umbra-agent-$suffix..."
  (cd "$SCRIPT_DIR" && \
    CGO_ENABLED=0 GOOS=linux GOARCH="$goarch" GOARM="$goarm" \
    go build -trimpath -ldflags="-s -w" -o "$OUT_DIR/umbra-agent-$suffix" .)
}

build amd64 "" linux-amd64
build arm64 "" linux-arm64
build arm   7  linux-armv7

echo ""
echo "✓ Releases built into $OUT_DIR:"
ls -lh "$OUT_DIR"
