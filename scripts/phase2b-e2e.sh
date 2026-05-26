#!/usr/bin/env bash
# Phase 2B E2E（Medusa + 可选 S2BDIY）
#   bash scripts/phase2b-e2e.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_ROOT/apps/medusa-backend/.env"

fail() { echo "ERROR: $*" >&2; exit 1; }

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ENV_FILE"
  set +a
fi

BASE_URL="${MEDUSA_BASE_URL:-http://localhost:9000}"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"
STORE_ID="${DEFAULT_STORE_ID:-default_store}"

[[ -n "$ADMIN_TOKEN" ]] || fail "ADMIN_TOKEN required"

echo "== Phase 2B: catalog sync is Dev1 (skip sync-basic-product) =="

echo "== Phase 2A baseline (generate-and-draft) =="
bash "$REPO_ROOT/scripts/phase2a-dev2-e2e.sh"

echo "== Phase 2B: supplier order sync endpoint =="
if [[ -n "${S2BDIY_API_BASE_URL:-}" ]]; then
  curl -sS -X POST "$BASE_URL/admin/supplier-orders/sync" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "X-Store-Id: $STORE_ID" | jq .
fi

echo "Phase 2B E2E wrapper done."
