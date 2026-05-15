#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:9000}"
DEFAULT_STORE_ID="${DEFAULT_STORE_ID:-default_store}"
TEST_STORE_ID="${TEST_STORE_ID:-test_store}"
PUBLISHABLE_API_KEY="${PUBLISHABLE_API_KEY:-}"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"
DEFAULT_MEDUSA_PRODUCT_ID="${DEFAULT_MEDUSA_PRODUCT_ID:-}"
DEFAULT_MEDUSA_VARIANT_ID="${DEFAULT_MEDUSA_VARIANT_ID:-}"
TEST_MEDUSA_PRODUCT_ID="${TEST_MEDUSA_PRODUCT_ID:-}"
TEST_MEDUSA_VARIANT_ID="${TEST_MEDUSA_VARIANT_ID:-}"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

info() {
  echo "==> $*"
}

need_command() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is required but was not found."
}

if [[ -z "$PUBLISHABLE_API_KEY" ]]; then
  cat >&2 <<'EOF'
ERROR: PUBLISHABLE_API_KEY is required.

Create or copy a local Medusa publishable API key from Admin, then run:
  export PUBLISHABLE_API_KEY="<publishable_api_key>"
EOF
  exit 1
fi

if [[ -z "$ADMIN_TOKEN" ]]; then
  cat >&2 <<'EOF'
ERROR: ADMIN_TOKEN is required.

Create an admin user if needed:
  cd apps/medusa-backend
  npx medusa user -e admin@example.com -p supersecret

Then obtain a token:
  curl -sS -X POST "$BASE_URL/auth/user/emailpass" \
    -H "Content-Type: application/json" \
    --data '{"email":"admin@example.com","password":"supersecret"}'

Export the returned token:
  export ADMIN_TOKEN="<token>"
EOF
  exit 1
fi

need_command curl
need_command jq

RUN_ID="${RUN_ID:-$(date +%Y%m%d%H%M%S)-$$}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

LAST_BODY=""
LAST_STATUS=""

request() {
  local method="$1"
  local path="$2"
  local body="${3:-}"
  shift 3 || true

  local body_file="$TMP_DIR/body.json"
  local status

  if [[ -n "$body" ]]; then
    status="$(
      curl -sS -o "$body_file" -w "%{http_code}" \
        -X "$method" "$BASE_URL$path" \
        "$@" \
        -H "Content-Type: application/json" \
        --data "$body"
    )"
  else
    status="$(
      curl -sS -o "$body_file" -w "%{http_code}" \
        -X "$method" "$BASE_URL$path" \
        "$@"
    )"
  fi

  LAST_STATUS="$status"
  LAST_BODY="$(cat "$body_file")"
}

expect_status() {
  local expected="$1"
  local label="$2"

  if [[ "$LAST_STATUS" != "$expected" ]]; then
    echo "$LAST_BODY" | jq . >&2 || echo "$LAST_BODY" >&2
    fail "$label expected HTTP $expected, got $LAST_STATUS"
  fi
}

expect_non_2xx() {
  local label="$1"

  if [[ "$LAST_STATUS" =~ ^2 ]]; then
    echo "$LAST_BODY" | jq . >&2 || echo "$LAST_BODY" >&2
    fail "$label expected a blocked non-2xx response, got $LAST_STATUS"
  fi
}

json_get() {
  local filter="$1"
  echo "$LAST_BODY" | jq -er "$filter"
}

assert_json() {
  local argc="$#"
  local label="${!argc}"
  local filter_index=$((argc - 1))
  local filter="${!filter_index}"
  local -a jq_args=()

  if (( argc > 2 )); then
    jq_args=("${@:1:$((argc - 2))}")
  fi

  if (( ${#jq_args[@]} > 0 )); then
    echo "$LAST_BODY" | jq -e "${jq_args[@]}" "$filter" >/dev/null || {
      echo "$LAST_BODY" | jq . >&2 || echo "$LAST_BODY" >&2
      fail "$label"
    }
  else
    echo "$LAST_BODY" | jq -e "$filter" >/dev/null || {
      echo "$LAST_BODY" | jq . >&2 || echo "$LAST_BODY" >&2
      fail "$label"
    }
  fi
}

admin_header=(-H "Authorization: Bearer $ADMIN_TOKEN")
store_default_headers=(-H "x-publishable-api-key: $PUBLISHABLE_API_KEY" -H "X-Store-Id: $DEFAULT_STORE_ID")
store_test_headers=(-H "x-publishable-api-key: $PUBLISHABLE_API_KEY" -H "X-Store-Id: $TEST_STORE_ID")

info "Smoke run id: $RUN_ID"
info "Base URL: $BASE_URL"
info "Default store: $DEFAULT_STORE_ID"
info "Test store: $TEST_STORE_ID"

info "1. GET /health returns 200"
request GET "/health" ""
expect_status 200 "GET /health"

info "2. GET /store-context returns a store_id"
request GET "/store-context" ""
expect_status 200 "GET /store-context"
assert_json '.store_context.store_id | type == "string" and length > 0' "GET /store-context should return store_context.store_id"

info "3. GET /store-context with X-Store-Id returns test store from header"
request GET "/store-context" "" -H "X-Store-Id: $TEST_STORE_ID"
expect_status 200 "GET /store-context with X-Store-Id"
assert_json --arg store "$TEST_STORE_ID" '.store_context.store_id == $store and .store_context.source == "header"' "store context should resolve test store from header"

info "4. GET /store/products without publishable key is blocked"
request GET "/store/products" ""
expect_non_2xx "GET /store/products without x-publishable-api-key"

info "5. GET /admin/users/me with ADMIN_TOKEN returns 200"
request GET "/admin/users/me" "" "${admin_header[@]}"
expect_status 200 "GET /admin/users/me"

default_category_name="Smoke Default Category $RUN_ID"
test_category_name="Smoke Test Category $RUN_ID"

info "6. Create default store category"
default_category_body="$(jq -n --arg name "$default_category_name" --arg description "Smoke category for default store" '{name: $name, description: $description}')"
request POST "/admin/product-categories" "$default_category_body" "${admin_header[@]}" -H "X-Store-Id: $DEFAULT_STORE_ID"
expect_status 201 "POST /admin/product-categories default store"
default_category_id="$(json_get '.category_id')"
assert_json --arg store "$DEFAULT_STORE_ID" '.store_id == $store and .category.store_id == $store' "default category should belong to default store"

info "7. Create test store category"
test_category_body="$(jq -n --arg name "$test_category_name" --arg description "Smoke category for test store" '{name: $name, description: $description}')"
request POST "/admin/product-categories" "$test_category_body" "${admin_header[@]}" -H "X-Store-Id: $TEST_STORE_ID"
expect_status 201 "POST /admin/product-categories test store"
test_category_id="$(json_get '.category_id')"
assert_json --arg store "$TEST_STORE_ID" '.store_id == $store and .category.store_id == $store' "test category should belong to test store"

info "8. Storefront categories for default store are isolated"
request GET "/store/product-categories" "" "${store_default_headers[@]}"
expect_status 200 "GET /store/product-categories default store"
assert_json --arg store "$DEFAULT_STORE_ID" --arg id "$default_category_id" '
  .store_id == $store
  and any(.categories[]?; .category_id == $id and .store_id == $store)
  and all(.categories[]?; .store_id == $store)
' "default category list should include only default store categories"

info "9. Storefront categories for test store are isolated"
request GET "/store/product-categories" "" "${store_test_headers[@]}"
expect_status 200 "GET /store/product-categories test store"
assert_json --arg store "$TEST_STORE_ID" --arg id "$test_category_id" '
  .store_id == $store
  and any(.categories[]?; .category_id == $id and .store_id == $store)
  and all(.categories[]?; .store_id == $store)
' "test category list should include only test store categories"

default_product_title="Smoke Default Product $RUN_ID"
test_product_title="Smoke Test Product $RUN_ID"

info "10. Create default store draft product with default category"
default_product_body="$(jq -n --arg title "$default_product_title" --arg category "$default_category_id" '{title: $title, description: "Smoke product for default store", price: 11.11, source: "manual", category_ids: [$category], tags: ["smoke"], variants: [], metadata: {smoke: true}}')"
request POST "/admin/products/draft" "$default_product_body" "${admin_header[@]}" -H "X-Store-Id: $DEFAULT_STORE_ID"
expect_status 201 "POST /admin/products/draft default store"
default_product_id="$(json_get '.product_id')"

info "11. Create test store draft product with test category"
test_product_body="$(jq -n --arg title "$test_product_title" --arg category "$test_category_id" '{title: $title, description: "Smoke product for test store", price: 22.22, source: "manual", category_ids: [$category], tags: ["smoke"], variants: [], metadata: {smoke: true}}')"
request POST "/admin/products/draft" "$test_product_body" "${admin_header[@]}" -H "X-Store-Id: $TEST_STORE_ID"
expect_status 201 "POST /admin/products/draft test store"
test_product_id="$(json_get '.product_id')"

info "12. Publish both products with correct store context"
request POST "/admin/products/$default_product_id/publish" "{}" "${admin_header[@]}" -H "X-Store-Id: $DEFAULT_STORE_ID"
expect_status 200 "POST /admin/products/:id/publish default store"
request POST "/admin/products/$test_product_id/publish" "{}" "${admin_header[@]}" -H "X-Store-Id: $TEST_STORE_ID"
expect_status 200 "POST /admin/products/:id/publish test store"

info "13. Storefront products for default store are isolated"
request GET "/store/products" "" "${store_default_headers[@]}"
expect_status 200 "GET /store/products default store"
assert_json --arg store "$DEFAULT_STORE_ID" --arg own "$default_product_id" --arg other "$test_product_id" '
  .store_id == $store
  and any(.products[]?; .product_id == $own and .store_id == $store)
  and all(.products[]?; .store_id == $store)
  and all(.products[]?; .product_id != $other)
' "default product list should include only default-store products"

info "14. Storefront products for test store are isolated"
request GET "/store/products" "" "${store_test_headers[@]}"
expect_status 200 "GET /store/products test store"
assert_json --arg store "$TEST_STORE_ID" --arg own "$test_product_id" --arg other "$default_product_id" '
  .store_id == $store
  and any(.products[]?; .product_id == $own and .store_id == $store)
  and all(.products[]?; .store_id == $store)
  and all(.products[]?; .product_id != $other)
' "test product list should include only test-store products"

info "15. Cross-store publish is rejected"
request POST "/admin/products/$default_product_id/publish" "{}" "${admin_header[@]}" -H "X-Store-Id: $TEST_STORE_ID"
expect_status 403 "cross-store publish"
assert_json '.error.code == "PRODUCT_STORE_MISMATCH"' "cross-store publish should return PRODUCT_STORE_MISMATCH"

info "16. Cross-store category_ids are rejected"
bad_product_body="$(jq -n --arg title "Smoke Bad Category Product $RUN_ID" --arg category "$test_category_id" '{title: $title, description: "Should fail", price: 33.33, source: "manual", category_ids: [$category], tags: ["smoke"], variants: [], metadata: {expected_failure: true}}')"
request POST "/admin/products/draft" "$bad_product_body" "${admin_header[@]}" -H "X-Store-Id: $DEFAULT_STORE_ID"
expect_status 400 "cross-store category_ids"
assert_json '.error.code == "VALIDATION_ERROR"' "cross-store category_ids should return VALIDATION_ERROR"

info "17. Product detail cross-store access is blocked"
request GET "/store/products/$default_product_id" "" "${store_test_headers[@]}"
expect_status 404 "cross-store product detail"

if [[ -n "$DEFAULT_MEDUSA_VARIANT_ID" && -n "$TEST_MEDUSA_VARIANT_ID" ]]; then
  info "18. Product-to-cart bridge checks using explicit native variant links"

  default_bridge_body="$(jq -n --arg title "Smoke Default Bridge Product $RUN_ID" --arg category "$default_category_id" --arg medusa_product_id "$DEFAULT_MEDUSA_PRODUCT_ID" --arg medusa_variant_id "$DEFAULT_MEDUSA_VARIANT_ID" '{title: $title, description: "Bridge product for default store", price: 44.44, source: "manual", category_ids: [$category], tags: ["smoke", "bridge"], variants: [], medusa_product_id: (if $medusa_product_id == "" then null else $medusa_product_id end), medusa_variant_id: $medusa_variant_id, metadata: {bridge: true}}')"
  request POST "/admin/products/draft" "$default_bridge_body" "${admin_header[@]}" -H "X-Store-Id: $DEFAULT_STORE_ID"
  expect_status 201 "POST /admin/products/draft default bridge product"
  default_bridge_product_id="$(json_get '.product_id')"

  test_bridge_body="$(jq -n --arg title "Smoke Test Bridge Product $RUN_ID" --arg category "$test_category_id" --arg medusa_product_id "$TEST_MEDUSA_PRODUCT_ID" --arg medusa_variant_id "$TEST_MEDUSA_VARIANT_ID" '{title: $title, description: "Bridge product for test store", price: 55.55, source: "manual", category_ids: [$category], tags: ["smoke", "bridge"], variants: [], medusa_product_id: (if $medusa_product_id == "" then null else $medusa_product_id end), medusa_variant_id: $medusa_variant_id, metadata: {bridge: true}}')"
  request POST "/admin/products/draft" "$test_bridge_body" "${admin_header[@]}" -H "X-Store-Id: $TEST_STORE_ID"
  expect_status 201 "POST /admin/products/draft test bridge product"
  test_bridge_product_id="$(json_get '.product_id')"

  request POST "/admin/products/$default_bridge_product_id/publish" "{}" "${admin_header[@]}" -H "X-Store-Id: $DEFAULT_STORE_ID"
  expect_status 200 "publish default bridge product"
  assert_json --arg variant "$DEFAULT_MEDUSA_VARIANT_ID" '.product.medusa_variant_id == $variant and .product.is_cart_addable == true' "default bridge product should be cart-addable"

  request POST "/admin/products/$test_bridge_product_id/publish" "{}" "${admin_header[@]}" -H "X-Store-Id: $TEST_STORE_ID"
  expect_status 200 "publish test bridge product"
  assert_json --arg variant "$TEST_MEDUSA_VARIANT_ID" '.product.medusa_variant_id == $variant and .product.is_cart_addable == true' "test bridge product should be cart-addable"

  request POST "/store/carts" "$(jq -n --arg region_id "$DEFAULT_REGION_ID" --arg currency_code "${DEFAULT_CURRENCY_CODE:-eur}" '{region_id: $region_id, currency_code: $currency_code}')" "${store_default_headers[@]}"
  expect_status 200 "POST /store/carts default store"
  default_cart_id="$(json_get '.cart_id')"

  request POST "/store/carts" "$(jq -n --arg region_id "$DEFAULT_REGION_ID" --arg currency_code "${DEFAULT_CURRENCY_CODE:-eur}" '{region_id: $region_id, currency_code: $currency_code}')" "${store_test_headers[@]}"
  expect_status 200 "POST /store/carts test store"
  test_cart_id="$(json_get '.cart_id')"

  request POST "/store/carts/$default_cart_id/line-items" "$(jq -n --arg variant_id "$DEFAULT_MEDUSA_VARIANT_ID" '{variant_id: $variant_id, quantity: 1}')" "${store_default_headers[@]}"
  expect_status 200 "add default bridge product to default cart"

  request POST "/store/carts/$test_cart_id/line-items" "$(jq -n --arg variant_id "$TEST_MEDUSA_VARIANT_ID" '{variant_id: $variant_id, quantity: 1}')" "${store_test_headers[@]}"
  expect_status 200 "add test bridge variant to test cart"

  request POST "/store/carts/$default_cart_id/line-items" "$(jq -n --arg variant_id "$TEST_MEDUSA_VARIANT_ID" '{variant_id: $variant_id, quantity: 1}')" "${store_default_headers[@]}"
  expect_status 400 "cross-store bridge product add"
  assert_json '.error.code == "CART_STORE_MISMATCH"' "cross-store product add should return CART_STORE_MISMATCH"

  request GET "/store/carts/$default_cart_id" "" "${store_test_headers[@]}"
  expect_status 403 "cross-store cart read"
else
  info "18. Skipping product-to-cart bridge checks. Set DEFAULT_MEDUSA_VARIANT_ID and TEST_MEDUSA_VARIANT_ID to real native Medusa variants to enable them."
fi

info "All store isolation smoke tests passed."
