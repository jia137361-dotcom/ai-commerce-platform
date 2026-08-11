#!/usr/bin/env bash
# Safe production deploy:
# 1) preflight  2) postgres backup  3) pin :previous  4) build images
# 5) migrate (fail hard)  6) recreate one service at a time (no full downtime)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "${SCRIPT_DIR}/lib.sh"

require_cmd docker
require_clean_git_for_deploy
assert_no_forbidden_ops

SERVICES="${SERVICES:-medusa seller-dashboard storefront}"
SKIP_BACKUP="${SKIP_BACKUP:-0}"
SKIP_MIGRATE="${SKIP_MIGRATE:-0}"
sha="$(git_sha)"
tag="sha-${sha}"

log "deploy start (sha=${sha})"
bash "${SCRIPT_DIR}/preflight.sh"

if [[ "${SKIP_BACKUP}" != "1" ]]; then
  bash "${SCRIPT_DIR}/backup-postgres.sh"
else
  log "SKIP_BACKUP=1 — skipping postgres backup"
fi

mkdir -p "${BACKUP_DIR}"
rollback_meta="${BACKUP_DIR}/rollback-${sha}.txt"
{
  echo "created_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "git_sha=${sha}"
} > "${rollback_meta}"

log "pinning currently running images as :previous"
for svc in ${SERVICES}; do
  image_name="${COMPOSE_PROJECT_NAME}-${svc}"
  cid="$(compose ps -q "${svc}" 2>/dev/null || true)"
  if [[ -n "${cid}" ]]; then
    old_id="$(docker inspect -f '{{.Image}}' "${cid}" 2>/dev/null || true)"
    if [[ -n "${old_id}" ]]; then
      docker tag "${old_id}" "${image_name}:previous"
      echo "${svc}_previous_image=${old_id}" >> "${rollback_meta}"
      log "pinned ${svc} → ${image_name}:previous"
    fi
  else
    echo "${svc}_previous_image=" >> "${rollback_meta}"
    log "no running container for ${svc} (first deploy)"
  fi
done
ln -sfn "$(basename "${rollback_meta}")" "${BACKUP_DIR}/rollback-latest.txt"

log "building images while current services keep running"
# shellcheck disable=SC2086
compose build ${SERVICES}

for svc in ${SERVICES}; do
  image_name="${COMPOSE_PROJECT_NAME}-${svc}"
  if docker image inspect "${image_name}:latest" >/dev/null 2>&1; then
    docker tag "${image_name}:latest" "${image_name}:${tag}"
  fi
done

if [[ "${SKIP_MIGRATE}" != "1" ]]; then
  log "running database migrations (any failure aborts deploy)"
  if compose config --services | grep -qx medusa; then
    compose run --rm --no-deps medusa \
      sh -c 'npm --workspace apps/medusa-backend run db:migrate'
  else
    die "medusa service missing from compose file; cannot migrate safely"
  fi
else
  log "SKIP_MIGRATE=1 — skipping migrations"
fi

log "rolling update services"
for svc in ${SERVICES}; do
  log "recreating ${svc}"
  compose up -d --no-deps --force-recreate "${svc}"
  sleep 2
done

if [[ -n "${HEALTHCHECK_URLS:-}" ]]; then
  require_cmd curl
  log "post-deploy health checks"
  for url in ${HEALTHCHECK_URLS}; do
    ok=0
    for _ in 1 2 3 4 5 6 7 8 9 10; do
      code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 "${url}" || true)"
      if [[ "${code}" == "200" ]]; then
        log "health ok: ${url}"
        ok=1
        break
      fi
      sleep 3
    done
    [[ "${ok}" == "1" ]] || die "post-deploy health failed for ${url}"
  done
fi

log "deploy finished successfully (sha=${sha})"
log "rollback helper: scripts/prod/rollback.sh"
