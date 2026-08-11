#!/usr/bin/env bash
# Preflight checks before production deploy.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "${SCRIPT_DIR}/lib.sh"

require_cmd docker
assert_no_forbidden_ops

[[ -f "${PROD_COMPOSE_FILE}" ]] || die "missing compose file: ${PROD_COMPOSE_FILE}"
[[ -f "${PROD_ENV_FILE}" ]] || die "missing env file: ${PROD_ENV_FILE}"

log "validating docker compose config"
compose config >/dev/null

log "checking critical env keys"
# shellcheck disable=SC1090
set -a
source "${PROD_ENV_FILE}"
set +a
[[ -n "${DATABASE_URL:-}" ]] || die "DATABASE_URL missing in ${PROD_ENV_FILE}"
[[ -n "${JWT_SECRET:-}" ]] || die "JWT_SECRET missing in ${PROD_ENV_FILE}"
[[ -n "${COOKIE_SECRET:-}" ]] || die "COOKIE_SECRET missing in ${PROD_ENV_FILE}"

if compose ps --status running --services >/tmp/ai-commerce-prod-running-services 2>/dev/null; then
  log "running services:"
  cat /tmp/ai-commerce-prod-running-services
else
  log "no running compose services yet (first deploy is ok)"
fi

# Optional live health probes (set HEALTHCHECK_URLS="http://127.0.0.1:9000/health ...")
if [[ -n "${HEALTHCHECK_URLS:-}" ]]; then
  require_cmd curl
  for url in ${HEALTHCHECK_URLS}; do
    code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 "${url}" || true)"
    [[ "${code}" == "200" ]] || die "health check failed for ${url} (HTTP ${code})"
    log "health ok: ${url}"
  done
fi

log "preflight passed"
