#!/usr/bin/env bash
# Backup PostgreSQL before any production deploy / migration.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "${SCRIPT_DIR}/lib.sh"

require_cmd docker
require_cmd date

mkdir -p "${BACKUP_DIR}"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
sha="$(git_sha)"
outfile="${BACKUP_DIR}/ai_commerce-${stamp}-${sha}.sql.gz"

log "creating postgres backup → ${outfile}"

# Prefer an already-running postgres service from the prod compose file.
if compose ps --status running --services 2>/dev/null | grep -qx postgres; then
  compose exec -T postgres \
    pg_dump -U "${POSTGRES_USER:-medusa}" -d "${POSTGRES_DB:-ai_commerce}" \
    | gzip -c > "${outfile}"
else
  # Fallback: dump via docker against host-mapped URL if PG_DUMP_URL is provided.
  [[ -n "${PG_DUMP_URL:-}" ]] || die "postgres service is not running and PG_DUMP_URL is unset"
  require_cmd pg_dump
  pg_dump "${PG_DUMP_URL}" | gzip -c > "${outfile}"
fi

[[ -s "${outfile}" ]] || die "backup file is empty: ${outfile}"
ln -sfn "$(basename "${outfile}")" "${BACKUP_DIR}/latest.sql.gz"
log "backup ok ($(du -h "${outfile}" | awk '{print $1}'))"
printf '%s\n' "${outfile}"
