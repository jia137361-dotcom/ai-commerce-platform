#!/usr/bin/env bash
# Shared helpers for production release scripts.
# Hard rules:
# - never docker compose down
# - never git stash --include-untracked
# - never swallow migration failures with || true

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROD_COMPOSE_FILE="${PROD_COMPOSE_FILE:-${REPO_ROOT}/infra/docker-compose.prod.yml}"
PROD_ENV_FILE="${PROD_ENV_FILE:-${REPO_ROOT}/apps/medusa-backend/.env}"
BACKUP_DIR="${BACKUP_DIR:-${REPO_ROOT}/.prod-backups}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-ai-commerce-prod}"

log() { printf '[prod] %s\n' "$*"; }
die() { printf '[prod] ERROR: %s\n' "$*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"
}

compose() {
  docker compose \
    --project-name "${COMPOSE_PROJECT_NAME}" \
    -f "${PROD_COMPOSE_FILE}" \
    --env-file "${PROD_ENV_FILE}" \
    "$@"
}

git_sha() {
  git -C "${REPO_ROOT}" rev-parse --short HEAD 2>/dev/null || echo "unknown"
}

assert_no_forbidden_ops() {
  # Guardrail for reviewers / CI greps — these strings must never appear in prod scripts.
  if grep -RInE 'docker[[:space:]]+compose[[:space:]]+down|git[[:space:]]+stash[[:space:]]+--include-untracked' \
    "${REPO_ROOT}/scripts/prod" >/dev/null 2>&1; then
    die "forbidden deploy operation detected in scripts/prod"
  fi
}

require_clean_git_for_deploy() {
  if [[ "${ALLOW_DIRTY_DEPLOY:-0}" == "1" ]]; then
    log "ALLOW_DIRTY_DEPLOY=1 — skipping clean git check"
    return 0
  fi
  if [[ -n "$(git -C "${REPO_ROOT}" status --porcelain)" ]]; then
    die "working tree is dirty. Commit/push hotfixes to GitHub before deploy (or set ALLOW_DIRTY_DEPLOY=1 for emergencies)."
  fi
}
