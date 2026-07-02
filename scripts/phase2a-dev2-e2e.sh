#!/usr/bin/env bash
# 执行方式（脚本在仓库根目录，勿在 apps/medusa-backend 下用相对路径 scripts/）：
#   cd /path/to/ai-commerce-platform && bash scripts/phase2a-dev2-e2e.sh
# 或从任意目录：
#   bash /path/to/ai-commerce-platform/scripts/phase2a-dev2-e2e.sh
#
# Phase 2A E2E（curl）：
#   1) AI Worker /health
#   2) POST /admin/ai/generate-and-draft（可选传入桥接 Medusa 原生 id）
#   3) 若设置了 DEFAULT_MEDUSA_VARIANT_ID：publish → 购物车 → 加购 → 校验 metadata → 可选 complete
#
# 环境变量（与 Phase1 一致，读 apps/medusa-backend/.env）：
#   ADMIN_TOKEN           — 必填
#   PUBLISHABLE_API_KEY   — 桥接/加购段落必填
#   DEFAULT_MEDUSA_VARIANT_ID / DEFAULT_MEDUSA_PRODUCT_ID — 可选；未设则只跑到草稿，并提示跑 bootstrap
#
# 前置：Medusa dev、ai-worker（8001）、migrate + seed；桥接需先执行 phase1-dev2-bootstrap.ts
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_ROOT/apps/medusa-backend/.env"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

# curl POST/GET：失败时打印 HTTP 状态与响应体（避免 set -e + curl -sf 静默退出）
curl_json() {
  local max_time="$1"
  shift
  local tmp
  tmp=$(mktemp)
  local code
  code=$(curl -sS -w "%{http_code}" -o "$tmp" --max-time "$max_time" "$@") || {
    rm -f "$tmp"
    return 1
  }
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

need_command() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is required but was not found."
}

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ENV_FILE"
  set +a
fi

need_command curl
need_command jq

BASE_URL="${MEDUSA_BASE_URL:-http://localhost:9000}"
AI_URL="${AI_WORKER_BASE_URL:-http://localhost:8001}"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"
PUBLISHABLE_API_KEY="${PUBLISHABLE_API_KEY:-}"
STORE_ID="${DEFAULT_STORE_ID:-default_store}"
BRIDGE_VARIANT="${DEFAULT_MEDUSA_VARIANT_ID:-}"
BRIDGE_PRODUCT="${DEFAULT_MEDUSA_PRODUCT_ID:-}"

[[ -n "$ADMIN_TOKEN" ]] || fail "ADMIN_TOKEN missing — put it in apps/medusa-backend/.env or export it."

echo "== (0) Medusa reachable =="
MEDUSA_CODE=$(curl -sS -o /dev/null -w "%{http_code}" --connect-timeout 3 --max-time 10 "$BASE_URL/store/regions" 2>/dev/null || echo "000")
if [[ "$MEDUSA_CODE" == "000" ]]; then
  fail "无法连接 Medusa: $BASE_URL — 请先 cd apps/medusa-backend && npm run dev"
fi
echo "Medusa OK (HTTP $MEDUSA_CODE on /store/regions)"

echo "== (1/6) AI Worker health =="
if ! HEALTH_BODY=$(curl -sS -f --connect-timeout 3 --max-time 10 "$AI_URL/health"); then
  fail "无法访问 AI Worker: ${AI_URL}/health。请先另开终端启动: cd apps/ai-worker && source citigooapi/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8001 （或设置 AI_WORKER_BASE_URL）"
fi
echo "$HEALTH_BODY" | jq .

echo "== (2/6) generate-and-draft =="
DRAFT_PAYLOAD=$(jq -nc \
  --arg prompt "phase2a e2e minimal cat" \
  --arg pp "pp_tshirt" \
  --arg sp "sp_tshirt" \
  --arg sv "spv_tshirt_black_m" \
  --arg mv "$BRIDGE_VARIANT" \
  --arg mp "$BRIDGE_PRODUCT" \
  '{
    prompt: $prompt,
    platform_product_id: $pp,
    supplier_product_id: $sp,
    supplier_variant_id: $sv
  }
  + (if ($mv | length) > 0 then {medusa_variant_id: $mv} else {} end)
  + (if ($mp | length) > 0 then {medusa_product_id: $mp} else {} end)')

echo "（AI 生成可能需 30–120s，mock 模式通常更快）"
DRAFT_JSON=$(curl_json 180 \
  -X POST "$BASE_URL/admin/ai/generate-and-draft" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Store-Id: $STORE_ID" \
  -H "Content-Type: application/json" \
  -d "$DRAFT_PAYLOAD") || fail "generate-and-draft 失败：常见原因 — ADMIN_TOKEN 过期/无效（重新登录 /auth/user/emailpass）、Medusa 连不上 AI Worker（确认 AI_WORKER_BASE_URL=http://localhost:8001 且 Worker 已启动）、未 migrate/seed"

echo "$DRAFT_JSON" | jq '{product_id, status: .product.status, mockup: .product.mockup_image_url, print: .product.print_file_url, medusa_variant_id: .product.medusa_variant_id}'

PRODUCT_ID=$(echo "$DRAFT_JSON" | jq -r '.product_id')
[[ -n "$PRODUCT_ID" && "$PRODUCT_ID" != "null" ]] || fail "draft failed — no product_id"

if [[ -z "$BRIDGE_VARIANT" ]]; then
  echo ""
  echo "OK draft product_id=${PRODUCT_ID}（未设置 DEFAULT_MEDUSA_VARIANT_ID，已跳过 publish / 加购）。"
  echo "   若要跑完整链路：在 apps/medusa-backend/.env 中设置 DEFAULT_MEDUSA_VARIANT_ID（及可选 DEFAULT_MEDUSA_PRODUCT_ID），"
  echo "   并先执行: cd apps/medusa-backend && npx medusa exec ./src/scripts/phase1-dev2-bootstrap.ts"
  exit 0
fi

[[ -n "$PUBLISHABLE_API_KEY" ]] || fail "PUBLISHABLE_API_KEY required for publish/cart — add to apps/medusa-backend/.env"

STORE_HDR=(-H "x-publishable-api-key: $PUBLISHABLE_API_KEY" -H "X-Store-Id: $STORE_ID")

echo "== (3/6) publish mc_product =="
PUBLISH_JSON=$(curl_json 30 \
  -X POST "$BASE_URL/admin/products/$PRODUCT_ID/publish" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Store-Id: $STORE_ID" \
  -H "Content-Type: application/json") || fail "publish 失败"

echo "$PUBLISH_JSON" | jq '{product_id, status: .product.status, medusa_variant_id: .product.medusa_variant_id}'

echo "== (4/6) create cart & add line item =="
REGION_ID="${REGION_ID:-$(curl -s "$BASE_URL/store/regions" "${STORE_HDR[@]}" | jq -r '.regions[0].id // empty')}"
CART_JSON='{"currency_code":"usd"}'
if [[ -n "$REGION_ID" ]]; then
  CART_JSON=$(jq -nc --arg r "$REGION_ID" '{currency_code:"usd", region_id:$r}')
fi

CART_BODY=$(curl_json 30 \
  -X POST "$BASE_URL/store/carts" \
  -H "Content-Type: application/json" \
  "${STORE_HDR[@]}" \
  -d "$CART_JSON") || fail "创建购物车失败"

CART_ID=$(echo "$CART_BODY" | jq -r '.cart_id // .id // empty')
[[ -n "$CART_ID" ]] || fail "could not create cart: $CART_BODY"

ADD_BODY=$(curl_json 30 \
  -X POST "$BASE_URL/store/carts/$CART_ID/line-items" \
  -H "Content-Type: application/json" \
  "${STORE_HDR[@]}" \
  -d "$(jq -nc --arg v "$BRIDGE_VARIANT" '{variant_id: $v, quantity: 1}')") || fail "加购失败"

echo "== (5/6) line_item production metadata =="
echo "$ADD_BODY" | jq '.line_item | { id, variant_id, metadata }'

EXPECTED_PRINT=$(echo "$DRAFT_JSON" | jq -r '.product.print_file_url // empty')
ACTUAL_PRINT=$(echo "$ADD_BODY" | jq -r '.line_item.metadata.print_file_url // empty')
if [[ -n "$EXPECTED_PRINT" && "$EXPECTED_PRINT" != "$ACTUAL_PRINT" ]]; then
  fail "line_item print_file_url 与草稿不一致（可能绑到 Phase1 桥接品）。期望: $EXPECTED_PRINT 实际: $ACTUAL_PRINT"
fi
for key in supplier_product_id supplier_variant_id; do
  EXP=$(echo "$DRAFT_JSON" | jq -r ".product.$key // empty")
  ACT=$(echo "$ADD_BODY" | jq -r ".line_item.metadata.$key // empty")
  [[ -z "$EXP" || "$EXP" == "$ACT" ]] || fail "metadata.$key 不匹配: 期望 $EXP 实际 $ACT"
done
echo "metadata 与 AI 草稿一致"

if [[ "${PHASE2A_E2E_COMPLETE:-false}" == "true" ]]; then
  echo "== (6/6) complete cart (pp_system_default) =="
  COMPLETE_BODY=$(curl_json 60 \
    -X POST "$BASE_URL/store/carts/$CART_ID/complete" \
    -H "Content-Type: application/json" \
    "${STORE_HDR[@]}" \
    -d '{"payment_provider_id":"pp_system_default"}') || fail "complete 失败"
  echo "$COMPLETE_BODY" | jq '{order_id, payment_status, fulfillment_status}'
  ORDER_ID=$(echo "$COMPLETE_BODY" | jq -r '.order_id // empty')
  [[ -n "$ORDER_ID" ]] || fail "complete 未返回 order_id"
  echo "order_id=$ORDER_ID"
else
  echo "== (6/6) 跳过 complete（设置 PHASE2A_E2E_COMPLETE=true 可测下单） =="
fi

echo ""
echo "Phase 2A e2e finished OK."
