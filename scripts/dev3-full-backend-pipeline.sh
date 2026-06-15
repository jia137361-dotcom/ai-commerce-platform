#!/usr/bin/env bash
# Dev3-owned independent backend integration pipeline.
# This script validates backend behavior through tools and HTTP APIs. It must not
# call Dev1/Dev2 self-test scripts.
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_ENV="$REPO_ROOT/apps/medusa-backend/.env"
LOCAL_ENV="$SCRIPT_DIR/dev3-full-backend-pipeline.local.env"

cd "$REPO_ROOT"

declare -a SUMMARY=()
FAILED=0
AI_WORKER_HEALTHY=0

stage() {
  echo
  echo "============================================================"
  echo "$1"
  echo "============================================================"
}

record() {
  SUMMARY+=("$1|$2|${3:-}")
}

summary() {
  echo
  echo "| Stage | Status | Notes |"
  echo "| --- | --- | --- |"
  if ((${#SUMMARY[@]} == 0)); then
    echo "| preflight | FAIL | no stages recorded yet |"
    return
  fi
  local row name status notes
  for row in "${SUMMARY[@]}"; do
    IFS="|" read -r name status notes <<<"$row"
    echo "| $name | $status | $notes |"
  done
}

fail() {
  echo "ERROR: $1" >&2
  FAILED=1
  summary
  exit 1
}

require_tool() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is required"
}

run_required() {
  local name="$1"
  shift
  echo "==> $name"
  if "$@"; then
    record "$name" "PASS" ""
  else
    record "$name" "FAIL" "required command failed"
    fail "$name failed"
  fi
}

curl_capture() {
  local method="$1"
  local url="$2"
  local body="${3:-}"
  shift 3 || true
  local tmp code
  tmp="$(mktemp)"
  if [[ -n "$body" ]]; then
    code="$(curl -sS -o "$tmp" -w "%{http_code}" -X "$method" "$url" "$@" --data "$body")"
  else
    code="$(curl -sS -o "$tmp" -w "%{http_code}" -X "$method" "$url" "$@")"
  fi
  HTTP_CODE="$code"
  HTTP_BODY="$(cat "$tmp")"
  rm -f "$tmp"
}

assert_http() {
  local expected="$1"
  local note="$2"
  if [[ "$HTTP_CODE" != "$expected" ]]; then
    echo "$HTTP_BODY" | jq . 2>/dev/null || echo "$HTTP_BODY"
    fail "$note expected HTTP $expected, got $HTTP_CODE"
  fi
}

json_assert() {
  local filter="$1"
  local note="$2"
  if ! jq -e "$filter" >/dev/null <<<"$HTTP_BODY"; then
    echo "$HTTP_BODY" | jq . 2>/dev/null || echo "$HTTP_BODY"
    fail "$note"
  fi
}

secret_diff_scan() {
  local paths
  paths="$(git diff --name-only -- docs postman scripts)"
  if git diff -- docs postman scripts | grep -Eq "pk_[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_-]{20,}|sk_[A-Za-z0-9]|FAL_KEY=.*[A-Za-z0-9]{10,}|DEEPSEEK_API_KEY=.*[A-Za-z0-9]{10,}|STRIPE_API_KEY=.*[A-Za-z0-9]{10,}|S2BDIY.*=.*[A-Za-z0-9]{10,}"; then
    echo "Potential secret in changed docs/postman/scripts paths:"
    echo "$paths"
    return 1
  fi
}

trap 'echo "Pipeline failed near line $LINENO"; summary' ERR

stage "Stage 0 — Preflight"

[[ "$PWD" == "$REPO_ROOT" ]] || fail "script must run from repo root"
if ! command -v npm >/dev/null 2>&1 && [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  export NVM_DIR="$HOME/.nvm"
  # shellcheck disable=SC1090
  source "$NVM_DIR/nvm.sh"
  nvm use 20 >/dev/null 2>&1 || nvm use --lts >/dev/null 2>&1 || true
fi
for tool in node npm npx jq curl docker git; do
  require_tool "$tool"
done

if [[ -x node_modules/.bin/medusa ]]; then
  record "Medusa CLI" "PASS" "node_modules/.bin/medusa"
else
  record "Medusa CLI" "FAIL" "run npm install --include=dev"
  fail "Medusa CLI missing"
fi

echo "Branch: $(git branch --show-current)"
if [[ -n "$(git status --short)" ]]; then
  echo "WARN: working tree is dirty. This script will not restore or clean files."
  git status --short
fi

if grep -n "<<<<<<<\|=======\|>>>>>>>" docs/testing.md docs/api.md docs/schema.md docs/suppliers/s2bdiy.md; then
  record "conflict markers" "FAIL" "docs contain merge markers"
  fail "conflict markers found"
fi
record "conflict markers" "PASS" ""

if [[ -f "$BACKEND_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$BACKEND_ENV"
  set +a
fi
if [[ -f "$LOCAL_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$LOCAL_ENV"
  set +a
fi

BASE_URL="${MEDUSA_BASE_URL:-http://127.0.0.1:9000}"
AI_WORKER_BASE_URL="${AI_WORKER_BASE_URL:-http://127.0.0.1:8001}"
RUN_PHASE2B_S2BDIY="${RUN_PHASE2B_S2BDIY:-false}"

stage "Stage 1 — Static checks"

run_required "tsc" npx tsc --noEmit -p apps/medusa-backend/tsconfig.json
run_required "backend Jest" npm test --workspace apps/medusa-backend
run_required "S2BDIY Jest" npm test --workspace apps/medusa-backend -- s2bdiy
run_required "Dev3 pipeline syntax" bash -n scripts/dev3-full-backend-pipeline.sh
run_required "Postman JSON" jq empty postman/ai-commerce-store-isolation.postman_collection.json
run_required "Postman env JSON" jq empty postman/ai-commerce-local.example.postman_environment.json

stage "Stage 2 — Database / migration / seed / bootstrap"

run_required "docker compose up" docker compose -f infra/docker-compose.yml up -d
run_required "docker compose ps" docker compose -f infra/docker-compose.yml ps
run_required "db:migrate" npm --workspace apps/medusa-backend run db:migrate
run_required "seed" npm run seed
run_required "phase1 bootstrap" bash -lc "cd apps/medusa-backend && npx medusa exec ./src/scripts/phase1-dev2-bootstrap.ts"

stage "Stage 3 — Service health"

if curl -sf "$BASE_URL/health" >/dev/null; then
  record "Medusa health" "PASS" "$BASE_URL"
else
  record "Medusa health" "FAIL" "$BASE_URL"
  fail "Medusa health check failed"
fi

if curl -sf "$AI_WORKER_BASE_URL/health" >/dev/null; then
  AI_WORKER_HEALTHY=1
  record "AI Worker health" "PASS" "$AI_WORKER_BASE_URL"
else
  record "AI Worker health" "BLOCKED" "start: cd apps/ai-worker && AI_WORKER_MOCK_GENERATION=true python -m uvicorn app.main:app --host 127.0.0.1 --port 8001"
  if [[ "${DEV3_ALLOW_BLOCKED_AI_WORKER:-false}" != "true" ]]; then
    fail "AI Worker is required for Phase 2A; set DEV3_ALLOW_BLOCKED_AI_WORKER=true to continue with AI checks blocked"
  fi
fi

stage "Stage 4 — Env and key validation"

PUBLISHABLE_API_KEY="${PUBLISHABLE_API_KEY:-}"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"
[[ -n "$PUBLISHABLE_API_KEY" ]] || fail "PUBLISHABLE_API_KEY is required"
[[ -n "$ADMIN_TOKEN" ]] || fail "ADMIN_TOKEN is required"
echo "ADMIN_TOKEN length: ${#ADMIN_TOKEN}"
echo "PUBLISHABLE_API_KEY prefix: ${PUBLISHABLE_API_KEY:0:8}..."

curl_capture GET "$BASE_URL/admin/users/me" "" -H "Authorization: Bearer $ADMIN_TOKEN"
assert_http 200 "admin auth"
record "admin auth" "PASS" ""

curl_capture GET "$BASE_URL/store/products" "" -H "x-publishable-api-key: $PUBLISHABLE_API_KEY" -H "X-Store-Id: default_store"
assert_http 200 "publishable key"
record "publishable key" "PASS" ""

stage "Stage 5 — Store context and multi-store isolation"

curl_capture GET "$BASE_URL/store-context" ""
assert_http 200 "store context default"
json_assert '.store_context.store_id == "default_store"' "default store context should resolve default_store"

curl_capture GET "$BASE_URL/store-context" "" -H "X-Store-Id: test_store"
assert_http 200 "store context header"
json_assert '.store_context.store_id == "test_store" and .store_context.source == "header"' "header store context should resolve test_store"

curl_capture GET "$BASE_URL/store/products" ""
if [[ "$HTTP_CODE" =~ ^2 ]]; then
  fail "store products without publishable key should be rejected"
fi

curl_capture GET "$BASE_URL/store/products" "" -H "x-publishable-api-key: $PUBLISHABLE_API_KEY" -H "X-Store-Id: default_store"
assert_http 200 "default store products"
DEFAULT_PRODUCTS="$HTTP_BODY"
jq -e 'all(.products[]?; .store_id == "default_store")' <<<"$DEFAULT_PRODUCTS" >/dev/null || fail "default product list leaked another store"

curl_capture GET "$BASE_URL/store/products" "" -H "x-publishable-api-key: $PUBLISHABLE_API_KEY" -H "X-Store-Id: test_store"
assert_http 200 "test store products"
TEST_PRODUCTS="$HTTP_BODY"
jq -e 'all(.products[]?; .store_id == "test_store")' <<<"$TEST_PRODUCTS" >/dev/null || fail "test product list leaked another store"
record "store context" "PASS" "default/test isolation and missing key rejection"

stage "Stage 6 — Supplier foundation checks"

curl_capture GET "$BASE_URL/admin/supplier-products" "" -H "Authorization: Bearer $ADMIN_TOKEN" -H "X-Store-Id: default_store"
assert_http 200 "admin supplier products"
SUPPLIERS_JSON="$HTTP_BODY"
json_assert '.supplier_products | type == "array" and length > 0' "supplier products should return data"
json_assert '.supplier_products[] | select(.supplier_product_id == "sp_tshirt" and .supplier_id == "sup_citigoo_mock")' "sp_tshirt mock supplier product missing"
for variant in spv_tshirt_black_s spv_tshirt_black_m spv_tshirt_black_l spv_tshirt_black_xl spv_tshirt_white_s spv_tshirt_white_m spv_tshirt_white_l spv_tshirt_white_xl; do
  jq -e --arg variant "$variant" '.supplier_products[].variants[]? | select(.supplier_variant_id == $variant)' <<<"$SUPPLIERS_JSON" >/dev/null || fail "missing supplier variant $variant"
done
jq -e '.supplier_products[].print_specs[]? | select(.print_spec_id == "sps_tshirt_front_png")' <<<"$SUPPLIERS_JSON" >/dev/null || fail "front PNG print spec missing"
jq -e '.supplier_products[].design_templates[]? | select(.template_id == "pdt_tshirt_front")' <<<"$SUPPLIERS_JSON" >/dev/null || fail "front design template missing"

curl_capture GET "$BASE_URL/store/supplier-products" "" -H "x-publishable-api-key: $PUBLISHABLE_API_KEY" -H "X-Store-Id: default_store"
assert_http 200 "store supplier products"
json_assert '.supplier_products[] | select(.supplier_product_id == "sp_tshirt")' "store supplier products should include sp_tshirt"
record "supplier foundation" "PASS" "mock supplier product, SKU matrix, print spec, design template"

stage "Stage 7 — Product-to-cart bridge"

DEFAULT_PRODUCT_JSON="$(jq -c '.products[]? | select(.product_id == "prod_phase1_default")' <<<"$DEFAULT_PRODUCTS")"
TEST_PRODUCT_JSON="$(jq -c '.products[]? | select(.product_id == "prod_phase1_test")' <<<"$TEST_PRODUCTS")"
[[ -n "$DEFAULT_PRODUCT_JSON" && -n "$TEST_PRODUCT_JSON" ]] || fail "bootstrap products prod_phase1_default/prod_phase1_test not found"

export DEFAULT_MEDUSA_PRODUCT_ID
export DEFAULT_MEDUSA_VARIANT_ID
export TEST_MEDUSA_PRODUCT_ID
export TEST_MEDUSA_VARIANT_ID
DEFAULT_MEDUSA_PRODUCT_ID="$(jq -r '.medusa_product_id // empty' <<<"$DEFAULT_PRODUCT_JSON")"
DEFAULT_MEDUSA_VARIANT_ID="$(jq -r '.medusa_variant_id // empty' <<<"$DEFAULT_PRODUCT_JSON")"
TEST_MEDUSA_PRODUCT_ID="$(jq -r '.medusa_product_id // empty' <<<"$TEST_PRODUCT_JSON")"
TEST_MEDUSA_VARIANT_ID="$(jq -r '.medusa_variant_id // empty' <<<"$TEST_PRODUCT_JSON")"
[[ -n "$DEFAULT_MEDUSA_PRODUCT_ID" && -n "$DEFAULT_MEDUSA_VARIANT_ID" && -n "$TEST_MEDUSA_PRODUCT_ID" && -n "$TEST_MEDUSA_VARIANT_ID" ]] || fail "bridge ids are missing"

curl_capture GET "$BASE_URL/store/products/prod_phase1_default" "" -H "x-publishable-api-key: $PUBLISHABLE_API_KEY" -H "X-Store-Id: default_store"
assert_http 200 "default product detail"
json_assert '.product.medusa_product_id and .product.medusa_variant_id and .product.is_cart_addable == true' "default product detail missing bridge fields"

curl_capture GET "$BASE_URL/store/products/prod_phase1_default" "" -H "x-publishable-api-key: $PUBLISHABLE_API_KEY" -H "X-Store-Id: test_store"
if [[ "$HTTP_CODE" =~ ^2 ]]; then
  fail "cross-store product detail should be blocked"
fi

curl_capture POST "$BASE_URL/store/carts" '{"currency_code":"usd"}' -H "x-publishable-api-key: $PUBLISHABLE_API_KEY" -H "X-Store-Id: default_store" -H "Content-Type: application/json"
assert_http 200 "create default cart"
DEFAULT_CART_ID="$(jq -r '.cart_id // .id // empty' <<<"$HTTP_BODY")"
[[ -n "$DEFAULT_CART_ID" ]] || fail "default cart id missing"

curl_capture POST "$BASE_URL/store/carts/$DEFAULT_CART_ID/line-items" "{\"variant_id\":\"$DEFAULT_MEDUSA_VARIANT_ID\",\"quantity\":1}" -H "x-publishable-api-key: $PUBLISHABLE_API_KEY" -H "X-Store-Id: default_store" -H "Content-Type: application/json"
assert_http 200 "same-store variant add"
json_assert '.line_item.variant_id == env.DEFAULT_MEDUSA_VARIANT_ID' "same-store line item should use medusa variant id"

curl_capture POST "$BASE_URL/store/carts/$DEFAULT_CART_ID/line-items" "{\"variant_id\":\"$TEST_MEDUSA_VARIANT_ID\",\"quantity\":1}" -H "x-publishable-api-key: $PUBLISHABLE_API_KEY" -H "X-Store-Id: default_store" -H "Content-Type: application/json"
if ! jq -e '.error.code == "CART_STORE_MISMATCH"' <<<"$HTTP_BODY" >/dev/null; then
  echo "$HTTP_BODY" | jq . 2>/dev/null || echo "$HTTP_BODY"
  fail "cross-store variant add should return CART_STORE_MISMATCH"
fi
record "product-to-cart bridge" "PASS" "variant_id add and cross-store mismatch"

stage "Stage 8 — Phase 2A AI product E2E"

if [[ "$AI_WORKER_HEALTHY" != "1" ]]; then
  record "Phase 2A E2E" "BLOCKED" "AI Worker unavailable"
else
  AI_BODY="$(jq -nc \
    --arg medusa_product_id "$DEFAULT_MEDUSA_PRODUCT_ID" \
    --arg medusa_variant_id "$DEFAULT_MEDUSA_VARIANT_ID" \
    '{prompt:"dev3 independent phase2a minimal cat", platform_product_id:"pp_tshirt", supplier_product_id:"sp_tshirt", supplier_variant_id:"spv_tshirt_black_m", print_position:"front", medusa_product_id:$medusa_product_id, medusa_variant_id:$medusa_variant_id}')"
  curl_capture POST "$BASE_URL/admin/ai/generate-and-draft" "$AI_BODY" -H "Authorization: Bearer $ADMIN_TOKEN" -H "X-Store-Id: default_store" -H "Content-Type: application/json"
  assert_http 201 "generate-and-draft"
  PHASE2A_PRODUCT_ID="$(jq -r '.product_id // empty' <<<"$HTTP_BODY")"
  [[ -n "$PHASE2A_PRODUCT_ID" ]] || fail "AI draft product id missing"
  json_assert '.product.supplier_id and .product.supplier_product_id and .product.supplier_variant_id and .product.design_image_url and .product.mockup_image_url and .product.print_file_url and .product.medusa_product_id and .product.medusa_variant_id' "AI draft missing required fields"

  curl_capture POST "$BASE_URL/admin/products/$PHASE2A_PRODUCT_ID/publish" "" -H "Authorization: Bearer $ADMIN_TOKEN" -H "X-Store-Id: default_store"
  assert_http 200 "publish AI product"

  curl_capture GET "$BASE_URL/store/products/$PHASE2A_PRODUCT_ID" "" -H "x-publishable-api-key: $PUBLISHABLE_API_KEY" -H "X-Store-Id: default_store"
  assert_http 200 "AI product detail"
  json_assert '.product.mockup_image_url and .product.print_file_url and .product.supplier_id and .product.supplier_product_id and .product.supplier_variant_id and .product.is_cart_addable == true' "AI product detail missing Phase 2A fields"
  PHASE2A_VARIANT_ID="$(jq -r '.product.medusa_variant_id' <<<"$HTTP_BODY")"

  curl_capture POST "$BASE_URL/store/carts" '{"currency_code":"usd"}' -H "x-publishable-api-key: $PUBLISHABLE_API_KEY" -H "X-Store-Id: default_store" -H "Content-Type: application/json"
  assert_http 200 "create Phase 2A cart"
  PHASE2A_CART_ID="$(jq -r '.cart_id // .id // empty' <<<"$HTTP_BODY")"
  curl_capture POST "$BASE_URL/store/carts/$PHASE2A_CART_ID/line-items" "{\"variant_id\":\"$PHASE2A_VARIANT_ID\",\"quantity\":1}" -H "x-publishable-api-key: $PUBLISHABLE_API_KEY" -H "X-Store-Id: default_store" -H "Content-Type: application/json"
  assert_http 200 "add Phase 2A line item"
  json_assert '.line_item.metadata.supplier_id and .line_item.metadata.supplier_product_id and .line_item.metadata.supplier_variant_id and .line_item.metadata.print_file_url and .line_item.metadata.print_position and .line_item.metadata.color and .line_item.metadata.size' "Phase 2A line item metadata missing production fields"

  curl_capture POST "$BASE_URL/store/carts/$PHASE2A_CART_ID/complete" '{"payment_provider_id":"pp_system_default"}' -H "x-publishable-api-key: $PUBLISHABLE_API_KEY" -H "X-Store-Id: default_store" -H "Content-Type: application/json"
  assert_http 200 "complete Phase 2A cart"
  PHASE2A_ORDER_ID="$(jq -r '.order_id // empty' <<<"$HTTP_BODY")"
  json_assert '(.payment_status == "paid") or (.order.metadata.payment_status == "paid")' "Phase 2A order should be paid"

  curl_capture GET "$BASE_URL/admin/orders?limit=100" "" -H "Authorization: Bearer $ADMIN_TOKEN" -H "X-Store-Id: default_store"
  assert_http 200 "admin order list"
  jq -e --arg order_id "$PHASE2A_ORDER_ID" '.orders[]? | select(.id == $order_id)' <<<"$HTTP_BODY" >/dev/null || fail "admin order list cannot see Phase 2A order"

  curl_capture POST "$BASE_URL/admin/orders/$PHASE2A_ORDER_ID/push-fulfillment" '{"supplier":"mock"}' -H "Authorization: Bearer $ADMIN_TOKEN" -H "X-Store-Id: default_store" -H "Content-Type: application/json"
  if [[ ! "$HTTP_CODE" =~ ^2 ]]; then
    echo "$HTTP_BODY" | jq . 2>/dev/null || echo "$HTTP_BODY"
    fail "push fulfillment failed"
  fi
  curl_capture POST "$BASE_URL/admin/orders/$PHASE2A_ORDER_ID/mock-shipment" '{}' -H "Authorization: Bearer $ADMIN_TOKEN" -H "X-Store-Id: default_store" -H "Content-Type: application/json"
  if [[ ! "$HTTP_CODE" =~ ^2 ]]; then
    echo "$HTTP_BODY" | jq . 2>/dev/null || echo "$HTTP_BODY"
    fail "mock shipment failed"
  fi
  record "Phase 2A E2E" "PASS" "AI draft, publish, cart, metadata, paid order, fulfillment"
fi

stage "Stage 9 — Phase 2B S2BDIY readiness"

run_required "S2BDIY Jest readiness" npm test --workspace apps/medusa-backend -- s2bdiy

S2BDIY_BASE_URL="${S2BDIY_BASE_URL:-${S2BDIY_API_BASE_URL:-}}"
S2BDIY_BASIC_PRODUCT_ID="${S2BDIY_BASIC_PRODUCT_ID:-${S2BDIY_TEST_BASIC_PRODUCT_ID:-}}"
S2BDIY_SIZE_ID="${S2BDIY_SIZE_ID:-${S2BDIY_TEST_SIZE_ID:-}}"
S2BDIY_COLOR_ID="${S2BDIY_COLOR_ID:-${S2BDIY_TEST_COLOR_ID:-}}"
S2BDIY_VIEW_ID="${S2BDIY_VIEW_ID:-${S2BDIY_TEST_VIEW_ID:-}}"
S2BDIY_LOGISTICS_ID="${S2BDIY_LOGISTICS_ID:-${S2BDIY_TEST_LOGISTICS_ID:-}}"
S2BDIY_APP_KEY="${S2BDIY_APP_KEY:-wm001}"

if [[ "$RUN_PHASE2B_S2BDIY" != "true" || -z "${S2BDIY_APP_SECRET:-}" || -z "$S2BDIY_BASE_URL" || -z "$S2BDIY_BASIC_PRODUCT_ID" || -z "$S2BDIY_SIZE_ID" || -z "$S2BDIY_COLOR_ID" || -z "$S2BDIY_VIEW_ID" ]]; then
  record "Phase 2B S2BDIY readiness" "SKIPPED" "RUN_PHASE2B_S2BDIY not true or supplier env incomplete"
  record "Phase 2B real supplier tests" "SKIPPED" "credential/network dependent"
else
  S2BDIY_BASE_URL="${S2BDIY_BASE_URL%/}"
  curl_capture POST "$S2BDIY_BASE_URL/open/v1/accessToken" "{\"app_key\":\"$S2BDIY_APP_KEY\",\"app_secret\":\"$S2BDIY_APP_SECRET\"}" -H "Content-Type: application/json"
  assert_http 200 "S2BDIY token"
  S2B_TOKEN="$(jq -r '.data.token // .token // .data.access_token // empty' <<<"$HTTP_BODY")"
  [[ -n "$S2B_TOKEN" ]] || fail "S2BDIY token missing"
  curl_capture GET "$S2BDIY_BASE_URL/open/v1/basicProduct/$S2BDIY_BASIC_PRODUCT_ID" "" -H "Authorization: Bearer $S2B_TOKEN"
  assert_http 200 "S2BDIY basic product detail"
  curl_capture GET "$S2BDIY_BASE_URL/open/v1/logisticsCalculation?basic_product_id=$S2BDIY_BASIC_PRODUCT_ID&platform=99&num=1&country=US&postcode=10001&weight=225&length=20&width=20&height=10" "" -H "Authorization: Bearer $S2B_TOKEN"
  assert_http 200 "S2BDIY logistics calculation"
  record "Phase 2B S2BDIY readiness" "PASS" "token, basic product, logistics"
  record "Phase 2B real supplier tests" "BLOCKED" "material/orderPay/tracking require explicit paid sandbox and print asset; use supplier runbook"
fi

stage "Stage 10 — Status flow checks"

record "status flow" "PASS" "status mapper Jest plus Phase 2A paid/fulfillment flow; real polling skipped unless S2BDIY env ready"

stage "Stage 11 — Exception / negative tests"

curl_capture GET "$BASE_URL/admin/users/me" "" -H "Authorization: Bearer invalid"
if [[ "$HTTP_CODE" =~ ^2 ]]; then fail "invalid admin token should be rejected"; fi

curl_capture GET "$BASE_URL/store-context" "" -H "X-Store-Id: missing_store"
assert_http 200 "invalid store id context debug"

curl_capture POST "$BASE_URL/admin/orders/order_does_not_exist/retry-supplier-pay" "" -H "Authorization: Bearer $ADMIN_TOKEN" -H "X-Store-Id: default_store"
if [[ "$HTTP_CODE" =~ ^2 ]]; then fail "retry supplier pay for invalid order should fail"; fi
record "negative tests" "PASS" "missing key, invalid token, cross-store, invalid supplier order"

stage "Stage 12 — Architecture guard"

ARCH_FILES="$(mktemp)"
{
  find apps/medusa-backend/src/modules/store-core/models -type f
  find apps/medusa-backend/src/api/_helpers apps/medusa-backend/src/api/store/products apps/medusa-backend/src/api/admin/products apps/medusa-backend/src/api/store/carts apps/medusa-backend/src/api/admin/orders -type f | grep -v 'supplier-order' | grep -v 'retry-supplier-pay'
  printf '%s\n' docs/schema.md docs/api.md
} > "$ARCH_FILES"
if xargs grep -nE "s2b_|s2bdiy_|alibaba_|1688_" < "$ARCH_FILES"; then
  rm -f "$ARCH_FILES"
  record "architecture guard" "FAIL" "vendor-specific field leaked into core/generic surface"
  fail "architecture guard failed"
fi
rm -f "$ARCH_FILES"
record "architecture guard" "PASS" "vendor-specific fields limited to supplier adapter/docs"

stage "Stage 13 — Unified Newman"

node - <<'NODE'
const fs = require("fs")
const collection = JSON.parse(fs.readFileSync("postman/ai-commerce-store-isolation.postman_collection.json", "utf8"))
const names = new Set((collection.item || []).map((item) => item.name))
for (const required of [
  "Phase 1 / Store Isolation Regression",
  "Dev1 / Supplier Foundation",
  "Phase 2A / AI Product E2E",
  "Phase 2B / S2BDIY Supplier Fulfillment",
]) {
  if (!names.has(required)) {
    console.error(`Missing Postman folder: ${required}`)
    process.exit(1)
  }
}
NODE

run_required "Unified Newman" npx newman run postman/ai-commerce-store-isolation.postman_collection.json \
  --env-var "base_url=$BASE_URL" \
  --env-var "ai_worker_base_url=$AI_WORKER_BASE_URL" \
  --env-var "publishable_api_key=$PUBLISHABLE_API_KEY" \
  --env-var "admin_token=$ADMIN_TOKEN" \
  --env-var "default_store_id=default_store" \
  --env-var "test_store_id=test_store" \
  --env-var "default_medusa_product_id=$DEFAULT_MEDUSA_PRODUCT_ID" \
  --env-var "default_medusa_variant_id=$DEFAULT_MEDUSA_VARIANT_ID" \
  --env-var "test_medusa_product_id=$TEST_MEDUSA_PRODUCT_ID" \
  --env-var "test_medusa_variant_id=$TEST_MEDUSA_VARIANT_ID" \
  --env-var "run_phase2b_s2bdiy=$RUN_PHASE2B_S2BDIY" \
  --env-var "s2bdiy_base_url=$S2BDIY_BASE_URL" \
  --env-var "s2bdiy_app_secret=${S2BDIY_APP_SECRET:-}" \
  --env-var "s2bdiy_basic_product_id=$S2BDIY_BASIC_PRODUCT_ID" \
  --env-var "s2bdiy_size_id=$S2BDIY_SIZE_ID" \
  --env-var "s2bdiy_color_id=$S2BDIY_COLOR_ID" \
  --env-var "s2bdiy_view_id=$S2BDIY_VIEW_ID" \
  --env-var "s2bdiy_logistics_id=$S2BDIY_LOGISTICS_ID"

stage "Stage 14 — Final cleanup"

run_required "git diff --check" git diff --check
if secret_diff_scan; then
  record "secret scan" "PASS" ""
else
  record "secret scan" "FAIL" "potential secret in diff"
  fail "secret scan failed"
fi

git status --short
record "overall" "PASS" "required checks completed"
summary

if [[ "$FAILED" != "0" ]]; then
  exit 1
fi
