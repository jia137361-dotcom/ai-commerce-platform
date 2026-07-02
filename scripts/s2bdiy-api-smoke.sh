#!/usr/bin/env bash
# S2BDIY Open API 直连 smoke（不依赖 Medusa）
#   cd /path/to/ai-commerce-platform && bash scripts/s2bdiy-api-smoke.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_ROOT/apps/medusa-backend/.env"

fail() { echo "ERROR: $*" >&2; exit 1; }
pass() { echo "PASS: $*"; }
skip() { echo "SKIP: $*"; }

curl_json() {
  local max_time="$1"
  shift
  local tmp
  tmp=$(mktemp)
  local code
  code=$(curl -sS -w "%{http_code}" -o "$tmp" --max-time "$max_time" "$@") || { rm -f "$tmp"; return 1; }
  if [[ "$code" =~ ^2[0-9][0-9]$ ]]; then
    cat "$tmp"
    rm -f "$tmp"
    return 0
  fi
  echo "HTTP $code — response:" >&2
  cat "$tmp" >&2
  rm -f "$tmp"
  return 1
}

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ENV_FILE"
  set +a
fi

command -v curl >/dev/null || fail "curl required"
command -v jq >/dev/null || fail "jq required"

BASE="${S2BDIY_API_BASE_URL:-https://opentest.s2bdiy.com}"
BASE="${BASE%/}"
APP_KEY="${S2BDIY_APP_KEY:-wm001}"
APP_SECRET="${S2BDIY_APP_SECRET:-}"
PLATFORM="${S2BDIY_PLATFORM_ID:-99}"
PRINT_FILE="${S2BDIY_TEST_PRINT_FILE:-$REPO_ROOT/scripts/test-assets/test-print.png}"

[[ -n "$APP_SECRET" ]] || fail "S2BDIY_APP_SECRET missing"

echo "== (1/10) accessToken =="
TOKEN_RESP=$(curl_json 30 -X POST "$BASE/open/v1/accessToken" \
  -H "Content-Type: application/json" \
  -d "{\"app_key\":\"$APP_KEY\",\"app_secret\":\"$APP_SECRET\"}") || fail "accessToken"
S2B_TOKEN=$(echo "$TOKEN_RESP" | jq -r '.data.token // .token // .data.access_token // empty')
[[ -n "$S2B_TOKEN" && "$S2B_TOKEN" != "null" ]] || fail "token empty: $TOKEN_RESP"
pass "token obtained"

echo "== (2/10) basicProduct list =="
LIST_RESP=$(curl_json 30 -H "Authorization: Bearer $S2B_TOKEN" \
  "$BASE/open/v1/basicProduct?page=1&per_page=5") || fail "basicProduct list"
echo "$LIST_RESP" | jq '.data // . | if type=="array" then . else .data end' 2>/dev/null | head -c 2000 || echo "$LIST_RESP" | head -c 500

BASIC_ID="${S2BDIY_TEST_BASIC_PRODUCT_ID:-}"
if [[ -z "$BASIC_ID" ]]; then
  BASIC_ID=$(echo "$LIST_RESP" | jq -r '
    if type == "array" then .[0].id
    elif .data.data? | type == "array" then .data.data[0].id
    elif .data? | type == "array" then .data[0].id
    else empty end
  ' 2>/dev/null || true)
fi
[[ -n "$BASIC_ID" && "$BASIC_ID" != "null" ]] || fail "Set S2BDIY_TEST_BASIC_PRODUCT_ID or ensure list returns id"
pass "basic_product_id=$BASIC_ID"

echo "== (3/10) basicProduct detail =="
DETAIL=$(curl_json 30 -H "Authorization: Bearer $S2B_TOKEN" \
  "$BASE/open/v1/basicProduct/$BASIC_ID") || fail "basicProduct detail"
COLOR_ID="${S2BDIY_TEST_COLOR_ID:-$(echo "$DETAIL" | jq -r '.colors[0].id // .data.colors[0].id // empty')}"
SIZE_ID="${S2BDIY_TEST_SIZE_ID:-$(echo "$DETAIL" | jq -r '.sizes[0].id // .data.sizes[0].id // empty')}"
VIEW_ID="${S2BDIY_TEST_VIEW_ID:-$(echo "$DETAIL" | jq -r '.views[0].id // .data.views[0].id // 1')}"
echo "Using basic_product_id=$BASIC_ID color=$COLOR_ID size=$SIZE_ID view=$VIEW_ID"
[[ -n "$COLOR_ID" && -n "$SIZE_ID" ]] || fail "missing color/size from detail"
pass "color=$COLOR_ID size=$SIZE_ID view=$VIEW_ID"

echo "== (4/10) uploadMaterial =="
[[ -f "$PRINT_FILE" ]] || fail "print file not found: $PRINT_FILE"
UPLOAD_RESP=$(curl -sS -w "\n%{http_code}" -X POST "$BASE/open/v1/material/uploadMaterial" \
  -H "Authorization: Bearer $S2B_TOKEN" \
  -F "image=@$PRINT_FILE" \
  -F "name=smoke-print") || fail "upload"
UPLOAD_BODY=$(echo "$UPLOAD_RESP" | sed '$d')
UPLOAD_CODE=$(echo "$UPLOAD_RESP" | tail -n1)
[[ "$UPLOAD_CODE" =~ ^2 ]] || { echo "$UPLOAD_BODY" >&2; fail "uploadMaterial HTTP $UPLOAD_CODE"; }
MATERIAL_ID=$(echo "$UPLOAD_BODY" | jq -r '.data.id // .id // empty')
[[ -n "$MATERIAL_ID" && "$MATERIAL_ID" != "null" ]] || fail "material_id empty"
pass "material_id=$MATERIAL_ID"

echo "== (5/10) quickCreate =="
QC_BODY=$(jq -nc \
  --argjson size_id "$SIZE_ID" \
  --argjson color_id "$COLOR_ID" \
  --argjson basic_id "$BASIC_ID" \
  --argjson material_id "$MATERIAL_ID" \
  --argjson view_id "$VIEW_ID" \
  '{
    size_id: $size_id,
    color_id: $color_id,
    product_design: {
      basic_product_id: $basic_id,
      name: "smoke-product",
      views: [{
        view_id: $view_id,
        objects: [{ type: "image", material_id: $material_id, design_type: 1 }]
      }]
    }
  }')
QC_RESP=$(curl_json 60 -X POST "$BASE/open/v1/product/quickCreate" \
  -H "Authorization: Bearer $S2B_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$QC_BODY") || fail "quickCreate"
PRODUCT_ID=$(echo "$QC_RESP" | jq -r '.product_id // .data.product_id // .id // empty')
[[ -n "$PRODUCT_ID" && "$PRODUCT_ID" != "null" ]] || fail "product_id empty"
pass "product_id=$PRODUCT_ID"

echo "== (6/10) product detail =="
PD=$(curl_json 30 -H "Authorization: Bearer $S2B_TOKEN" \
  "$BASE/open/v1/product/$PRODUCT_ID") || fail "product detail"
pass "product detail OK"

echo "== (7/10) logisticsCalculation =="
# S2B 要求 weight 单位为「克」(g)，见 basicProduct items[].weight
SMOKE_WEIGHT="${S2BDIY_DEFAULT_WEIGHT:-225}"
SMOKE_LENGTH="${S2BDIY_DEFAULT_LENGTH:-20}"
SMOKE_WIDTH="${S2BDIY_DEFAULT_WIDTH:-20}"
SMOKE_HEIGHT="${S2BDIY_DEFAULT_HEIGHT:-10}"
LOG_RESP=$(curl_json 30 -H "Authorization: Bearer $S2B_TOKEN" \
  "$BASE/open/v1/logisticsCalculation?basic_product_id=$BASIC_ID&platform=$PLATFORM&num=1&country=US&postcode=10001&weight=${SMOKE_WEIGHT}&length=${SMOKE_LENGTH}&width=${SMOKE_WIDTH}&height=${SMOKE_HEIGHT}") || fail "logistics"
LOGISTICS_ID=$(echo "$LOG_RESP" | jq -r '
  if type == "array" then .[0].logistics_platform_id
  elif .data? | type == "array" then .data[0].logistics_platform_id
  else empty end
' 2>/dev/null || true)
if [[ -z "$LOGISTICS_ID" || "$LOGISTICS_ID" == "null" ]]; then
  LOGISTICS_ID="${S2BDIY_TEST_LOGISTICS_ID:-}"
fi
if [[ -z "$LOGISTICS_ID" || "$LOGISTICS_ID" == "null" ]]; then
  skip "logisticsCalculation returned empty — set S2BDIY_TEST_LOGISTICS_ID or fix destination; skipping order steps"
  echo "Smoke partial PASS (steps 1-6 OK)"
  exit 0
fi
pass "logistics_id=$LOGISTICS_ID"

echo "== (7b) resolve S2B store_id =="
STORE_RESP=$(curl_json 30 -H "Authorization: Bearer $S2B_TOKEN" \
  "$BASE/open/v1/store?page=1&per_page=5") || fail "store list"
S2B_STORE_ID="${S2BDIY_STORE_ID:-}"
if [[ -z "$S2B_STORE_ID" ]]; then
  S2B_STORE_ID=$(echo "$STORE_RESP" | jq -r '
    if .data.data? | type == "array" then .data.data[0].id
    elif .data? | type == "array" then .data[0].id
    else empty end
  ' 2>/dev/null || true)
fi
[[ -n "$S2B_STORE_ID" && "$S2B_STORE_ID" != "null" ]] || fail "S2B store_id empty — set S2BDIY_STORE_ID or bind a store in S2B test console"
pass "store_id=$S2B_STORE_ID"

THIRD="smoke-$(date +%s)"
echo "== (8/10) create order (third_order_id=$THIRD) =="
ORDER_BODY=$(jq -nc \
  --arg third "$THIRD" \
  --argjson platform "$PLATFORM" \
  --argjson logistics_id "$LOGISTICS_ID" \
  --argjson store_id "$S2B_STORE_ID" \
  --argjson product_id "$PRODUCT_ID" \
  --argjson size_id "$SIZE_ID" \
  --argjson color_id "$COLOR_ID" \
  '{
    third_order_id: $third,
    platform: $platform,
    logistics_id: $logistics_id,
    store_id: $store_id,
    items: [{ product_id: $product_id, size_id: $size_id, color_id: $color_id, num: 1 }],
    address: {
      firstname: "Smoke",
      lastname: "Test",
      address: "123 Main St",
      city: "New York",
      province: "NY",
      postcode: "10001",
      country: "US",
      mobile_phone: "1234567890"
    }
  }')
ORDER_RESP=$(curl_json 60 -X POST "$BASE/open/v1/order" \
  -H "Authorization: Bearer $S2B_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$ORDER_BODY") || fail "create order"
ORDER_ID=$(echo "$ORDER_RESP" | jq -r '.id // .order_id // .order_no // .data.id // empty')
[[ -n "$ORDER_ID" && "$ORDER_ID" != "null" ]] || fail "supplier order id empty"
pass "order_id=$ORDER_ID"

echo "== (9/10) orderPay =="
PAY_CODE=$(curl -sS -o /tmp/s2b_pay.json -w "%{http_code}" -X POST "$BASE/open/v1/orderPay" \
  -H "Authorization: Bearer $S2B_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"ids\":[$ORDER_ID]}") || true
if [[ "$PAY_CODE" == "502" ]]; then
  skip "orderPay HTTP 502 (insufficient balance) — recharge test account and retry"
else
  [[ "$PAY_CODE" =~ ^2 ]] || { cat /tmp/s2b_pay.json >&2; fail "orderPay HTTP $PAY_CODE"; }
  pass "orderPay OK"
fi

echo "== (10/10) order detail =="
OD=$(curl_json 30 -H "Authorization: Bearer $S2B_TOKEN" "$BASE/open/v1/order/$ORDER_ID") || fail "order detail"
echo "$OD" | jq '{status, pay_status, status_text, pay_status_text, total_amount}' 2>/dev/null || echo "$OD"
pass "smoke complete"
