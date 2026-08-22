#!/usr/bin/env bash
set -euo pipefail

# Moves an UMBRA install's state to another machine.
#
# Two volumes matter, and losing either is not a small inconvenience:
#
#   headscale-data  the nodes, their keys, and the Let's Encrypt certificate.
#                   Without it every enrolled machine has to be re-enrolled.
#   umbra-pgdata    accounts, organisations, nodes, metrics, sessions.
#
# Caddy's volume is deliberately left out: it only holds certificates it can
# obtain again, and it is not even used in the native-TLS topology.
#
# Usage:
#   ./scripts/migrate-volumes.sh export [dir]   # on the old host, stack stopped
#   ./scripts/migrate-volumes.sh import [dir]   # on the new one, before deploy.sh

PROJECT="${COMPOSE_PROJECT_NAME:-umbra}"
VOLUMES=("${PROJECT}_headscale-data" "${PROJECT}_umbra-pgdata")
ACTION="${1:-}"
DIR="${2:-./umbra-backup}"

die() { echo "ERROR: $*" >&2; exit 1; }

running() {
  docker ps --format '{{.Names}}' | grep -qE '^umbra-(headscale|postgres|api|web)$'
}

case "$ACTION" in
  export)
    # Copying a live Postgres data directory yields a torn snapshot that may or
    # may not replay. Stopping first is not optional.
    running && die "Arrêtez la stack d'abord : docker compose down"

    mkdir -p "$DIR"
    for v in "${VOLUMES[@]}"; do
      docker volume inspect "$v" >/dev/null 2>&1 || die "Volume introuvable : $v"
      echo "→ export $v"
      docker run --rm -v "$v":/from -v "$(cd "$DIR" && pwd)":/to alpine \
        tar czf "/to/${v}.tgz" -C /from .
    done

    echo ""
    echo "✓ Écrit dans $DIR :"
    ls -lh "$DIR"
    echo ""
    echo "Copiez ce dossier sur la nouvelle machine, puis :"
    echo "  ./scripts/migrate-volumes.sh import <dossier>"
    ;;

  import)
    [ -d "$DIR" ] || die "Dossier introuvable : $DIR"
    running && die "Arrêtez la stack d'abord : docker compose down"

    for v in "${VOLUMES[@]}"; do
      archive="$DIR/${v}.tgz"
      [ -f "$archive" ] || die "Archive manquante : $archive"

      # Refuse to write over an existing volume rather than merge two states.
      if docker volume inspect "$v" >/dev/null 2>&1; then
        contents=$(docker run --rm -v "$v":/d alpine sh -c 'ls -A /d | head -1')
        [ -n "$contents" ] && die "$v existe déjà et n'est pas vide. Supprimez-le d'abord : docker volume rm $v"
      else
        docker volume create "$v" >/dev/null
      fi

      echo "→ import $v"
      docker run --rm -v "$v":/to -v "$(cd "$DIR" && pwd)":/from alpine \
        tar xzf "/from/${v}.tgz" -C /to
    done

    echo ""
    echo "✓ Volumes restaurés. Ensuite :"
    echo "  1. renseignez .env (HEADSCALE_TLS_HOSTNAME, HEADSCALE_EXTERNAL_URL, API_PUBLIC_URL…)"
    echo "  2. ./deploy.sh"
    echo "  3. faites pointer les redirections 443/tcp, 3478/udp et 3333/tcp de la box vers cette machine"
    ;;

  *)
    echo "Usage: $0 {export|import} [dossier]" >&2
    exit 1
    ;;
esac
