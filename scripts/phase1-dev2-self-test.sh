#!/usr/bin/env bash
# Phase 1 Dev2 full transaction loop + store isolation (curl smoke).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
# 父进程已 export 的变量优先于 .env（与常见 dotenv 行为一致）
_INHERIT_PUBLISHABLE="${PUBLISHABLE_API_KEY-}"
_INHERIT_ADMIN="${ADMIN_TOKEN-}"
if [[ -f "$REPO_ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$REPO_ROOT/.env"
  set +a
fi
[[ -n "${_INHERIT_PUBLISHABLE}" ]] && PUBLISHABLE_API_KEY="$_INHERIT_PUBLISHABLE"
[[ -n "${_INHERIT_ADMIN}" ]] && ADMIN_TOKEN="$_INHERIT_ADMIN"

BASE_URL="${BASE_URL:-http://localhost:9000}"
PUBLISHABLE_API_KEY="${PUBLISHABLE_API_KEY:-}"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"
DEFAULT_STORE_ID="${DEFAULT_STORE_ID:-default_store}"
TEST_STORE_ID="${TEST_STORE_ID:-test_store}"
RESULTS_FILE="${RESULTS_FILE:-docs/phase1-dev2-self-test-results.md}"

if [[ -z "$PUBLISHABLE_API_KEY" ]]; then
  echo "Set PUBLISHABLE_API_KEY (from api_key table or Admin)." >&2
  exit 1
fi

if [[ -z "$ADMIN_TOKEN" ]]; then
  echo "提示：未设置 ADMIN_TOKEN 时将跳过步骤 6（push-fulfillment / mock-shipment）；获取方式见 docs/phase1-dev2-self-test.md。" >&2
fi

STORE_HDR=(-H "x-publishable-api-key: $PUBLISHABLE_API_KEY")
DEFAULT_HDR=("${STORE_HDR[@]}" -H "X-Store-Id: $DEFAULT_STORE_ID")
TEST_HDR=("${STORE_HDR[@]}" -H "X-Store-Id: $TEST_STORE_ID")

log() { echo "$*" | tee -a "$RESULTS_FILE"; }
section() { log ""; log "## $*"; log ""; }

: >"$RESULTS_FILE"
log "# Phase 1 Dev2 自测结果"
log ""
log "- 时间: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
log "- BASE_URL: $BASE_URL"
log ""

section "步骤 1：获取测试商品"
log '```bash'
log "curl -s \"$BASE_URL/store/products\" ${DEFAULT_HDR[*]}"
log '```'
BODY=$(curl -s "$BASE_URL/store/products" "${DEFAULT_HDR[@]}")
log '```json'
echo "$BODY" | jq . 2>/dev/null | tee -a "$RESULTS_FILE" || echo "$BODY" | tee -a "$RESULTS_FILE"
log '```'
VARIANT_DEFAULT=$(echo "$BODY" | jq -r '
  ([.products[]? | select(.product_id == "prod_phase1_default") | .medusa_variant_id][0])
  // ([.products[]? | select(.is_cart_addable == true) | .medusa_variant_id][0])
  // empty' 2>/dev/null || true)
log "- VARIANT_DEFAULT: \`${VARIANT_DEFAULT:-<未找到>}\`"

BODY_TEST=$(curl -s "$BASE_URL/store/products" "${TEST_HDR[@]}")
VARIANT_TEST=$(echo "$BODY_TEST" | jq -r '
  ([.products[]? | select(.product_id == "prod_phase1_test") | .medusa_variant_id][0])
  // ([.products[]? | select(.is_cart_addable == true) | .medusa_variant_id][0])
  // empty' 2>/dev/null || true)
log "- VARIANT_TEST: \`${VARIANT_TEST:-<未找到>}\`"

if [[ -z "$VARIANT_DEFAULT" || -z "$VARIANT_TEST" ]]; then
  log ""
  log "> 若 variant 为空：先运行 \`cd apps/medusa-backend && npm run seed\`，再执行 bootstrap（见 docs/phase1-dev2-self-test.md），或设置 DEFAULT_MEDUSA_VARIANT_ID / TEST_MEDUSA_VARIANT_ID。"
  exit 1
fi

section "步骤 2：创建 default_store 购物车"
REGION_ID="${REGION_ID:-$(curl -s "$BASE_URL/store/regions" "${DEFAULT_HDR[@]}" | jq -r '.regions[0].id // empty' 2>/dev/null || true)}"
CART_JSON='{"currency_code":"usd"}'
if [[ -n "$REGION_ID" ]]; then
  CART_JSON=$(jq -nc --arg r "$REGION_ID" '{currency_code:"usd", region_id:$r}')
fi

CART_BODY=$(curl -s -X POST "$BASE_URL/store/carts" \
  -H "Content-Type: application/json" \
  "${DEFAULT_HDR[@]}" \
  -d "$CART_JSON")
log '```json'
echo "$CART_BODY" | jq . | tee -a "$RESULTS_FILE"
log '```'
CART_DEFAULT=$(echo "$CART_BODY" | jq -r '.cart_id // .id')
log "- cart_id (default): \`$CART_DEFAULT\`"

section "步骤 3：加购与跨店隔离"
ADD_OK=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/store/carts/$CART_DEFAULT/line-items" \
  -H "Content-Type: application/json" \
  "${DEFAULT_HDR[@]}" \
  -d "{\"variant_id\":\"$VARIANT_DEFAULT\",\"quantity\":1}")
ADD_OK_BODY=$(echo "$ADD_OK" | sed '$d')
ADD_OK_CODE=$(echo "$ADD_OK" | tail -1)
log "### 3.1 同店加购 — HTTP ${ADD_OK_CODE}"
log '```json'
echo "$ADD_OK_BODY" | jq . 2>/dev/null | tee -a "$RESULTS_FILE" || echo "$ADD_OK_BODY" | tee -a "$RESULTS_FILE"
log '```'

ADD_BAD=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/store/carts/$CART_DEFAULT/line-items" \
  -H "Content-Type: application/json" \
  "${DEFAULT_HDR[@]}" \
  -d "{\"variant_id\":\"$VARIANT_TEST\",\"quantity\":1}")
ADD_BAD_BODY=$(echo "$ADD_BAD" | sed '$d')
ADD_BAD_CODE=$(echo "$ADD_BAD" | tail -1)
log "### 3.2 跨店加购 — HTTP ${ADD_BAD_CODE} (预期 400 + CART_STORE_MISMATCH)"
log '```json'
echo "$ADD_BAD_BODY" | jq . 2>/dev/null | tee -a "$RESULTS_FILE" || echo "$ADD_BAD_BODY" | tee -a "$RESULTS_FILE"
log '```'

ORDER_ID=""
PAY_STATUS=""
FULFILL_STATUS=""
COMPLETE_CODE=""
COMPLETE_BODY="{}"

section "步骤 4–5：complete 下单"
if [[ "${ADD_OK_CODE}" != "200" ]]; then
  log "> **跳过**：同店加购未成功（HTTP ${ADD_OK_CODE}）。空车调用 complete 易产生误导性 payment 报错；请先确保已执行 bootstrap（\`npx medusa exec ./src/scripts/phase1-dev2-bootstrap.ts\`）且 variant 具备 Medusa 价格链路。"
  COMPLETE_CODE="skipped"
else
  COMPLETE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/store/carts/$CART_DEFAULT/complete" \
    -H "Content-Type: application/json" \
    "${DEFAULT_HDR[@]}" \
    -d '{"payment_provider_id":"pp_system_default"}')
  COMPLETE_BODY=$(echo "$COMPLETE" | sed '$d')
  COMPLETE_CODE=$(echo "$COMPLETE" | tail -1)
  log "### complete — HTTP ${COMPLETE_CODE}"
  log '```json'
  echo "$COMPLETE_BODY" | jq . | tee -a "$RESULTS_FILE"
  log '```'
  ORDER_ID=$(echo "$COMPLETE_BODY" | jq -r '.order_id // empty')
  PAY_STATUS=$(echo "$COMPLETE_BODY" | jq -r '.payment_status // empty')
  FULFILL_STATUS=$(echo "$COMPLETE_BODY" | jq -r '.fulfillment_status // empty')
  log "- order_id: \`$ORDER_ID\`"
  log "- payment_status: \`$PAY_STATUS\`"
  log "- fulfillment_status: \`$FULFILL_STATUS\`"
fi

if [[ -n "$ADMIN_TOKEN" && -n "$ORDER_ID" ]]; then
  section "步骤 6：Admin 推履约 / mock 物流"
  PUSH=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/admin/orders/$ORDER_ID/push-fulfillment" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "X-Store-Id: $DEFAULT_STORE_ID")
  log "### push-fulfillment — HTTP $(echo "$PUSH" | tail -1)"
  log '```json'
  echo "$PUSH" | sed '$d' | jq . | tee -a "$RESULTS_FILE"
  log '```'
  SHIP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/admin/orders/$ORDER_ID/mock-shipment" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "X-Store-Id: $DEFAULT_STORE_ID" \
    -d '{"carrier":"mock","tracking_number":"MOCK-001","tracking_url":"https://example.com/track/MOCK-001"}')
  log "### mock-shipment — HTTP $(echo "$SHIP" | tail -1)"
  log '```json'
  echo "$SHIP" | sed '$d' | jq . | tee -a "$RESULTS_FILE"
  log '```'
elif [[ -n "$ORDER_ID" && -z "$ADMIN_TOKEN" ]]; then
  section "步骤 6：Admin 推履约 / mock 物流"
  log "> **跳过**：未设置 \`ADMIN_TOKEN\`。可对管理员账号执行 \`POST $BASE_URL/auth/user/emailpass\` 取得 JWT 后重跑本脚本。"
fi

section "步骤 7：test_store 交叉隔离"
CART_TEST_BODY=$(curl -s -X POST "$BASE_URL/store/carts" \
  -H "Content-Type: application/json" \
  "${TEST_HDR[@]}" \
  -d "$CART_JSON")
CART_TEST=$(echo "$CART_TEST_BODY" | jq -r '.cart_id // .id')
CROSS=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/store/carts/$CART_TEST/line-items" \
  -H "Content-Type: application/json" \
  "${TEST_HDR[@]}" \
  -d "{\"variant_id\":\"$VARIANT_DEFAULT\",\"quantity\":1}")
log "### test 车 + default variant — HTTP $(echo "$CROSS" | tail -1)"
log '```json'
echo "$CROSS" | sed '$d' | jq . | tee -a "$RESULTS_FILE"
log '```'

CART_READ_CROSS=$(curl -s -w "\n%{http_code}" "$BASE_URL/store/carts/$CART_DEFAULT" "${TEST_HDR[@]}")
log "### test 头读 default 车 — HTTP $(echo "$CART_READ_CROSS" | tail -1)（预期 403 CART_STORE_ACCESS_DENIED）"
log '```json'
echo "$CART_READ_CROSS" | sed '$d' | jq . | tee -a "$RESULTS_FILE"
log '```'

section "测试通过 Checklist"
[[ "${ADD_OK_CODE}" == "200" ]] && log "- [x] 同店加购 200" || log "- [ ] 同店加购 200 (实际 ${ADD_OK_CODE})"
echo "$ADD_BAD_BODY" | jq -e '.error.code == "CART_STORE_MISMATCH"' >/dev/null 2>&1 \
  && log "- [x] 跨店加购 CART_STORE_MISMATCH" || log "- [ ] 跨店加购 CART_STORE_MISMATCH"
if [[ "${COMPLETE_CODE}" == "skipped" ]]; then
  log "- [ ] complete 生成订单（已跳过：加购未成功）"
elif [[ "${COMPLETE_CODE}" == "200" && -n "${ORDER_ID}" ]]; then
  log "- [x] complete 生成订单"
else
  log "- [ ] complete 生成订单 (HTTP ${COMPLETE_CODE})"
fi
[[ "${PAY_STATUS}" == "paid" ]] && log "- [x] payment_status=paid (pp_system_default)" || log "- [ ] payment_status=paid (实际: ${PAY_STATUS})"
[[ "${FULFILL_STATUS}" == "waiting" || "${FULFILL_STATUS}" == "pushed" || "${FULFILL_STATUS}" == "shipped" ]] \
  && log "- [x] fulfillment 已进入 waiting/pushed/shipped" || log "- [ ] fulfillment 状态 (实际: ${FULFILL_STATUS})"

log ""
log "完成。结果已写入 \`$RESULTS_FILE\`。"
