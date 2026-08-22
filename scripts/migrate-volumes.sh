#!/usr/bin/env bash
set -euo pipefail

# Moves an UMBRA install's state to another machine.
#
# Two things matter, and losing either is not a small inconvenience:
#
#   headscale-data  the nodes, their keys, and the Let's Encrypt certificate.
#                   Without it every enrolled machine has to be re-enrolled.
#                   SQLite, so the file copies across architectures as-is.
#   the database    accounts, organisations, nodes, metrics, sessions.
#
# Both hosts must run the same TimescaleDB version, which is why the image is
# pinned in docker-compose.yml rather than tracking latest-pg16. A dump carries
# TimescaleDB's internal catalog, and restoring it into a different version
# fails with "catalog version mismatch" — leaving the hypertable half-built and
# metric inserts broken, which surfaces days later.
#
# The database is dumped as SQL rather than copied as a volume, for two reasons.
#
# postgresql.conf lives inside the data directory, and the TimescaleDB image
# sizes it from the host's RAM on first init. Copy the directory to a smaller
# machine and Postgres asks for shared memory that does not exist — it dies with
# "could not map anonymous shared memory", which reads as a corrupt volume and
# is really a config written for another computer.
#
# And a data directory is officially not portable across architectures or major
# versions anyway. A logical dump crosses all three, and the destination
# initialises a configuration sized for itself.
#
# Caddy's volume is deliberately left out: it only holds certificates it can
# obtain again, and it is not even used in the native-TLS topology.
#
# Usage:
#   ./scripts/migrate-volumes.sh export [dir]   # on the old host, stack UP
#   ./scripts/migrate-volumes.sh import [dir]   # on the new one, before deploy.sh

PROJECT="${COMPOSE_PROJECT_NAME:-umbra}"
HS_VOLUME="${PROJECT}_headscale-data"
ACTION="${1:-}"
DIR="${2:-./umbra-backup}"

die() { echo "ERROR: $*" >&2; exit 1; }

running() {
  docker ps --format '{{.Names}}' | grep -qE '^umbra-(headscale|postgres|api|web)$'
}

case "$ACTION" in
  export)
    mkdir -p "$DIR"
    ABS="$(cd "$DIR" && pwd)"

    # pg_dump needs the database up, unlike a file copy.
    docker ps --format '{{.Names}}' | grep -q '^umbra-postgres$' \
      || die "Démarrez postgres d'abord : docker compose up -d postgres"

    echo "→ dump de la base"
    docker exec umbra-postgres pg_dump -U umbra -d umbra --clean --if-exists \
      > "$ABS/umbra.sql"
    [ -s "$ABS/umbra.sql" ] || die "Le dump est vide"

    # SQLite: the file itself travels, whatever the architecture.
    docker volume inspect "$HS_VOLUME" >/dev/null 2>&1 || die "Volume introuvable : $HS_VOLUME"
    echo "→ export $HS_VOLUME"
    docker run --rm -v "$HS_VOLUME":/from -v "$ABS":/to alpine \
      tar czf "/to/${HS_VOLUME}.tgz" -C /from .

    echo ""
    echo "✓ Écrit dans $DIR :"
    ls -lh "$DIR"
    echo ""
    echo "Copiez ce dossier sur la nouvelle machine, puis :"
    echo "  ./scripts/migrate-volumes.sh import <dossier>"
    ;;

  import)
    [ -d "$DIR" ] || die "Dossier introuvable : $DIR"
    ABS="$(cd "$DIR" && pwd)"
    [ -f "$ABS/umbra.sql" ] || die "Dump manquant : $ABS/umbra.sql"
    [ -f "$ABS/${HS_VOLUME}.tgz" ] || die "Archive manquante : $ABS/${HS_VOLUME}.tgz"

    # Headscale first, while nothing runs.
    running && die "Arrêtez la stack d'abord : docker compose down"

    if docker volume inspect "$HS_VOLUME" >/dev/null 2>&1; then
      contents=$(docker run --rm -v "$HS_VOLUME":/d alpine sh -c 'ls -A /d | head -1')
      [ -n "$contents" ] && die "$HS_VOLUME existe déjà et n'est pas vide. Supprimez-le : docker volume rm $HS_VOLUME"
    else
      docker volume create "$HS_VOLUME" >/dev/null
    fi
    echo "→ import $HS_VOLUME"
    docker run --rm -v "$HS_VOLUME":/to -v "$ABS":/from alpine \
      tar xzf "/from/${HS_VOLUME}.tgz" -C /to

    # The database is restored into a freshly initialised postgres, which is
    # why it has to be running — and why the dump has to be SQL.
    echo "→ démarrage de postgres"
    docker compose up -d postgres
    for _ in $(seq 1 60); do
      docker exec umbra-postgres pg_isready -U umbra >/dev/null 2>&1 && break
      sleep 1
    done
    docker exec umbra-postgres pg_isready -U umbra >/dev/null 2>&1 \
      || die "postgres ne répond pas"

    # node_metrics is a TimescaleDB hypertable, and its chunks live in
    # _timescaledb_internal. Restoring a dump that references them without
    # bracketing it leaves the hypertable half-built: the rows land but the
    # chunk catalog does not, and later inserts fail. This pair is TimescaleDB's
    # documented restore procedure.
    echo "→ restauration de la base"
    docker exec -i umbra-postgres psql -U umbra -d umbra -qtAc \
      "SELECT timescaledb_pre_restore();" > /dev/null
    docker exec -i umbra-postgres psql -U umbra -d umbra -q < "$ABS/umbra.sql" > /dev/null
    docker exec -i umbra-postgres psql -U umbra -d umbra -qtAc \
      "SELECT timescaledb_post_restore();" > /dev/null

    echo ""
    echo "✓ État restauré. Ensuite :"
    echo "  1. renseignez .env (HEADSCALE_TLS_HOSTNAME, HEADSCALE_EXTERNAL_URL, API_PUBLIC_URL…)"
    echo "  2. ./deploy.sh"
    echo "  3. faites pointer les redirections 443/tcp, 3478/udp et 3333/tcp de la box vers cette machine"
    ;;

  *)
    echo "Usage: $0 {export|import} [dossier]" >&2
    exit 1
    ;;
esac
