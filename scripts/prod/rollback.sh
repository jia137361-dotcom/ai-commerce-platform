#!/usr/bin/env bash
# Roll back app services to the :previous image tags without compose down.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "${SCRIPT_DIR}/lib.sh"

require_cmd docker
assert_no_forbidden_ops

SERVICES="${SERVICES:-medusa seller-dashboard storefront}"

log "rollback start"
bash "${SCRIPT_DIR}/preflight.sh"

if [[ "${SKIP_BACKUP:-0}" != "1" ]]; then
  bash "${SCRIPT_DIR}/backup-postgres.sh" || log "backup failed/skipped — continuing rollback of app images"
fi

for svc in ${SERVICES}; do
  image_name="${COMPOSE_PROJECT_NAME}-${svc}"
  if ! docker image inspect "${image_name}:previous" >/dev/null 2>&1; then
    die "missing rollback image ${image_name}:previous — cannot roll back ${svc}"
  fi
  docker tag "${image_name}:previous" "${image_name}:latest"
  log "recreating ${svc} from :previous"
  compose up -d --no-deps --force-recreate "${svc}"
done

if [[ -n "${HEALTHCHECK_URLS:-}" ]]; then
  require_cmd curl
  for url in ${HEALTHCHECK_URLS}; do
    code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 "${url}" || true)"
    [[ "${code}" == "200" ]] || die "rollback health failed for ${url} (HTTP ${code})"
    log "health ok: ${url}"
  done
fi

log "rollback finished"
log "NOTE: DB schema is not auto-reverted. Restore from .prod-backups/latest.sql.gz if a migration must be undone."
