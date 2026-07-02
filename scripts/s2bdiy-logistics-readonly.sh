#!/usr/bin/env bash
# S2BDIY 只读物流试算（绝不调用 order / orderPay / quickCreate）
#
# 规则（与 S2B 业务一致）：
#   - 海外本土工厂：produce_country = 收货 country（如 MX 工厂 → MX 地址）
#   - 中国生产：可从 CN 发到 US / FR / 全球
#   - 本土工厂发到第三国通常会 data: []（不是 bug，是线路不匹配）
#
#   bash scripts/s2bdiy-logistics-readonly.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_ROOT/apps/medusa-backend/.env"

fail() { echo "ERROR: $*" >&2; exit 1; }
info() { echo ">> $*"; }

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ENV_FILE"
  set +a
fi

command -v curl >/dev/null || fail "curl required"
command -v jq >/dev/null || fail "jq required"

BASE="${S2BDIY_LOGISTICS_BASE_URL:-https://openapi.s2bdiy.com}"
BASE="${BASE%/}"
APP_KEY="${S2BDIY_APP_KEY:-}"
APP_SECRET="${S2BDIY_APP_SECRET:-}"
PLATFORM="${S2BDIY_PLATFORM_ID:-99}"

[[ -n "$APP_KEY" && -n "$APP_SECRET" ]] || fail "S2BDIY_APP_KEY / S2BDIY_APP_SECRET missing in .env"

info "Base URL: $BASE (read-only: no orders will be created)"
TOKEN_RESP=$(curl -sS --max-time 30 -X POST "$BASE/open/v1/accessToken" \
  -H "Content-Type: application/json" \
  -d "{\"app_key\":\"$APP_KEY\",\"app_secret\":\"$S2BDIY_APP_SECRET\"}")
S2B_TOKEN=$(echo "$TOKEN_RESP" | jq -r '.data.token // .token // empty')
[[ -n "$S2B_TOKEN" && "$S2B_TOKEN" != "null" ]] || fail "token empty: $TOKEN_RESP"
echo "PASS token obtained"

read_dims() {
  local basic_id="$1"
  local detail
  detail=$(curl -sS --max-time 30 -H "Authorization: Bearer $S2B_TOKEN" "$BASE/open/v1/basicProduct/$basic_id")
  [[ "$(echo "$detail" | jq -r '.status // empty')" == "success" ]] || fail "basicProduct/$basic_id failed"
  echo "$detail" | jq -c '{
    id: .data.id,
    name: .data.name,
    warehouse_name: .data.warehouse_name,
    produce_country: .data.produce_country,
    weight: (.data.items[0].weight | tonumber),
    length: (.data.items[0].length | tostring),
    width: (.data.items[0].width | tostring),
    height: (.data.items[0].height | tostring)
  }'
}

run_case() {
  local basic_id="$1"
  local country="$2"
  local postcode="$3"
  local province="${4:-}"
  local label="$5"

  local dims
  dims=$(read_dims "$basic_id")
  echo ""
  echo "━━ $label"
  echo "商品: $(echo "$dims" | jq -c '{id, produce_country, warehouse_name, weight, length, width, height}')"
  echo "收货: country=$country postcode=$postcode${province:+ province=$province}"

  local args=(
    --data-urlencode "basic_product_id=$basic_id"
    --data-urlencode "platform=$PLATFORM"
    --data-urlencode "num=1"
    --data-urlencode "country=$country"
    --data-urlencode "postcode=$postcode"
    --data-urlencode "weight=$(echo "$dims" | jq -r '.weight')"
    --data-urlencode "length=$(echo "$dims" | jq -r '.length')"
    --data-urlencode "width=$(echo "$dims" | jq -r '.width')"
    --data-urlencode "height=$(echo "$dims" | jq -r '.height')"
  )
  [[ -n "$province" ]] && args+=(--data-urlencode "province=$province")

  local resp
  resp=$(curl -sS --max-time 30 -G "$BASE/open/v1/logisticsCalculation" \
    -H "Authorization: Bearer $S2B_TOKEN" "${args[@]}")
  local count
  count=$(echo "$resp" | jq '.data | length')
  echo "结果: data_count=$count"
  if [[ "$count" -gt 0 ]]; then
    echo "$resp" | jq '[.data[] | {logistics_platform_id, name, amount}] | .[0:3]'
  fi
}

# 海外本土工厂样本（produce_country = 收货国）
MX_ID="${S2BDIY_TEST_MX_BASIC_PRODUCT_ID:-6369}"
FR_ID="${S2BDIY_TEST_FR_BASIC_PRODUCT_ID:-6371}"
US_ID="${S2BDIY_TEST_US_BASIC_PRODUCT_ID:-6318}"
JP_ID="${S2BDIY_TEST_JP_BASIC_PRODUCT_ID:-6325}"
CA_ID="${S2BDIY_TEST_CA_BASIC_PRODUCT_ID:-6335}"
DE_ID="${S2BDIY_TEST_DE_BASIC_PRODUCT_ID:-5937}"
KR_ID="${S2BDIY_TEST_KR_BASIC_PRODUCT_ID:-6109}"
CN_ID="${S2BDIY_TEST_CN_BASIC_PRODUCT_ID:-6361}"

info "【A】本土工厂 → 同国收货"
run_case "$MX_ID" "MX" "06600" "CDMX" "MX 墨西哥工厂 → MX"
run_case "$FR_ID" "FR" "75001" "Paris" "FR 法国工厂 → FR"
run_case "$US_ID" "US" "10001" "NY" "US 美国工厂 → US"
run_case "$JP_ID" "JP" "100-0001" "Tokyo" "JP 日本工厂 → JP"
run_case "$CA_ID" "CA" "M5H2N2" "ON" "CA 加拿大工厂 → CA"
run_case "$DE_ID" "DE" "10115" "Berlin" "DE 德国工厂 → DE"
run_case "$KR_ID" "KR" "06000" "Seoul" "KR 韩国工厂 → KR"

info "【B】对照：本土工厂 → 跨国（预期常为空）"
run_case "$MX_ID" "US" "10001" "NY" "MX 工厂 → US（错误配对）"
run_case "$US_ID" "FR" "75001" "Paris" "US 工厂 → FR（错误配对）"

info "【C】中国生产 → 发全球"
run_case "$CN_ID" "US" "10001" "NY" "CN 生产 → US"
run_case "$CN_ID" "FR" "75001" "Paris" "CN 生产 → FR"
run_case "$CN_ID" "CN" "518000" "Guangdong" "CN 生产 → CN 国内"

echo ""
echo "=== Done (read-only, no orders created) ==="
