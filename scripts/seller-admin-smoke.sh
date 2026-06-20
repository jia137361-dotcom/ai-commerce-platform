#!/usr/bin/env bash
# Seller Admin API smoke test (curl).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_ROOT/apps/medusa-backend/.env"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ENV_FILE"
  set +a
fi

BASE_URL="${BASE_URL:-http://localhost:9000}"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"
STORE_ID="${DEFAULT_STORE_ID:-default_store}"
RESULTS_FILE="${RESULTS_FILE:-docs/seller-admin-smoke-results.md}"

if [[ -z "$ADMIN_TOKEN" ]]; then
  echo "Set ADMIN_TOKEN (POST /auth/user/emailpass)." >&2
  exit 1
fi

HDR=(-H "Authorization: Bearer $ADMIN_TOKEN" -H "X-Store-Id: $STORE_ID" -H "Content-Type: application/json")

log() { echo "$*" | tee -a "$RESULTS_FILE"; }
section() { log ""; log "## $*"; log ""; }

: >"$RESULTS_FILE"
log "# Seller Admin Smoke Results"
log "- Time: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
log "- BASE_URL: $BASE_URL"

section "1. Store settings"
curl -sf "$BASE_URL/admin/store-settings" "${HDR[@]}" | tee -a "$RESULTS_FILE"

section "1b. Logo upload (small PNG)"
SMALL_PNG_B64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
LOGO=$(curl -sf "$BASE_URL/admin/store-settings/logo" "${HDR[@]}" -d "{\"file_base64\":\"$SMALL_PNG_B64\",\"content_type\":\"image/png\"}")
echo "$LOGO" | jq '.logo_url' | tee -a "$RESULTS_FILE"

section "2. Products CRUD"
DRAFT=$(curl -sf "$BASE_URL/admin/products/draft" "${HDR[@]}" -d '{"title":"Smoke Shirt","price":19.99,"cost":8.5}')
PRODUCT_ID=$(echo "$DRAFT" | jq -r '.product_id')
log "product_id=$PRODUCT_ID"
curl -sf "$BASE_URL/admin/products" "${HDR[@]}" | jq '.count' | tee -a "$RESULTS_FILE"
curl -sf "$BASE_URL/admin/store-products/$PRODUCT_ID" "${HDR[@]}" | jq '.product.title' | tee -a "$RESULTS_FILE"
curl -sf "$BASE_URL/admin/store-products/$PRODUCT_ID" "${HDR[@]}" -X PUT -d '{"title":"Smoke Shirt Updated"}' | jq '.product.title' | tee -a "$RESULTS_FILE"
DUP=$(curl -sf "$BASE_URL/admin/products/$PRODUCT_ID/duplicate" "${HDR[@]}" -X POST)
DUP_ID=$(echo "$DUP" | jq -r '.product_id')
log "duplicate_id=$DUP_ID"
curl -sf "$BASE_URL/admin/products/$DUP_ID" "${HDR[@]}" -X DELETE | jq '.status' | tee -a "$RESULTS_FILE"

section "3. AI async job"
JOB=$(curl -sf "$BASE_URL/admin/ai/generate" "${HDR[@]}" -d '{"prompt":"smoke test cat","platform_product_id":"pp_tshirt","supplier_product_id":"sp_tshirt","supplier_variant_id":"spv_tshirt_black_m"}')
JOB_ID=$(echo "$JOB" | jq -r '.job_id')
log "job_id=$JOB_ID"
for i in $(seq 1 30); do
  STATUS=$(curl -sf "$BASE_URL/admin/ai/jobs/$JOB_ID" "${HDR[@]}" | jq -r '.status')
  log "poll $i: $STATUS"
  [[ "$STATUS" == "complete" || "$STATUS" == "failed" ]] && break
  sleep 2
done
curl -sf "$BASE_URL/admin/ai/jobs/$JOB_ID" "${HDR[@]}" | jq '.product_id' | tee -a "$RESULTS_FILE"

section "4. Orders"
curl -sf "$BASE_URL/admin/orders?limit=5" "${HDR[@]}" | jq '.count' | tee -a "$RESULTS_FILE"
ORDER_ID=$(curl -sf "$BASE_URL/admin/orders?limit=1" "${HDR[@]}" | jq -r '.orders[0].id // empty')
if [[ -n "$ORDER_ID" ]]; then
  curl -sf "$BASE_URL/admin/orders/$ORDER_ID" "${HDR[@]}" | jq '.display_id' | tee -a "$RESULTS_FILE"
  curl -sf "$BASE_URL/admin/orders/$ORDER_ID/fulfillment" "${HDR[@]}" | jq '.steps | length' | tee -a "$RESULTS_FILE"
else
  log "No orders to detail-test"
fi

section "5. Notifications"
curl -sf "$BASE_URL/admin/notifications" "${HDR[@]}" | jq '.count' | tee -a "$RESULTS_FILE"

log ""
log "Smoke complete."
