#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:9000}"
DEFAULT_STORE_ID="${DEFAULT_STORE_ID:-default_store}"
TEST_STORE_ID="${TEST_STORE_ID:-test_store}"
PUBLISHABLE_API_KEY="${PUBLISHABLE_API_KEY:-}"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"

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
assert_json '((.message // "") + " " + (.type // "")) | test("publishable|api key|not_allowed"; "i")' "missing publishable key response should mention publishable API key"

info "5. GET /admin/users/me with ADMIN_TOKEN returns 200"
request GET "/admin/users/me" "" "${admin_header[@]}"
expect_status 200 "GET /admin/users/me"

default_category_name="Smoke Default Category $RUN_ID"
test_category_name="Smoke Test Category $RUN_ID"

info "6. Create default store category"
default_category_body="$(jq -n --arg name "$default_category_name" --arg description "Dev3 smoke category for default store" '{name: $name, description: $description}')"
request POST "/admin/product-categories" "$default_category_body" "${admin_header[@]}" -H "X-Store-Id: $DEFAULT_STORE_ID"
expect_status 201 "POST /admin/product-categories default store"
default_category_id="$(json_get '.category_id')"
assert_json --arg store "$DEFAULT_STORE_ID" '.store_id == $store and .category.store_id == $store' "default category should belong to default store"

info "7. Create test store category"
test_category_body="$(jq -n --arg name "$test_category_name" --arg description "Dev3 smoke category for test store" '{name: $name, description: $description}')"
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
' "default category list should include default smoke category and only default store categories"

info "9. Storefront categories for test store are isolated"
request GET "/store/product-categories" "" "${store_test_headers[@]}"
expect_status 200 "GET /store/product-categories test store"
assert_json --arg store "$TEST_STORE_ID" --arg id "$test_category_id" '
  .store_id == $store
  and any(.categories[]?; .category_id == $id and .store_id == $store)
  and all(.categories[]?; .store_id == $store)
' "test category list should include test smoke category and only test store categories"

default_product_title="Smoke Default Product $RUN_ID"
test_product_title="Smoke Test Product $RUN_ID"

info "10. Create default store draft product with default category"
default_product_body="$(
  jq -n \
    --arg title "$default_product_title" \
    --arg description "Dev3 smoke product for default store" \
    --arg category "$default_category_id" \
    '{title: $title, description: $description, price: 11.11, source: "manual", category_ids: [$category], tags: ["dev3-smoke"], variants: [], metadata: {smoke: true}}'
)"
request POST "/admin/products/draft" "$default_product_body" "${admin_header[@]}" -H "X-Store-Id: $DEFAULT_STORE_ID"
expect_status 201 "POST /admin/products/draft default store"
default_product_id="$(json_get '.product_id')"
assert_json --arg store "$DEFAULT_STORE_ID" --arg category "$default_category_id" '.store_id == $store and (.product.category_ids | index($category))' "default draft product should belong to default store and include default category"

info "11. Create test store draft product with test category"
test_product_body="$(
  jq -n \
    --arg title "$test_product_title" \
    --arg description "Dev3 smoke product for test store" \
    --arg category "$test_category_id" \
    '{title: $title, description: $description, price: 22.22, source: "manual", category_ids: [$category], tags: ["dev3-smoke"], variants: [], metadata: {smoke: true}}'
)"
request POST "/admin/products/draft" "$test_product_body" "${admin_header[@]}" -H "X-Store-Id: $TEST_STORE_ID"
expect_status 201 "POST /admin/products/draft test store"
test_product_id="$(json_get '.product_id')"
assert_json --arg store "$TEST_STORE_ID" --arg category "$test_category_id" '.store_id == $store and (.product.category_ids | index($category))' "test draft product should belong to test store and include test category"

info "12. Publish both products with correct store context"
request POST "/admin/products/$default_product_id/publish" "{}" "${admin_header[@]}" -H "X-Store-Id: $DEFAULT_STORE_ID"
expect_status 200 "POST /admin/products/:id/publish default store"
assert_json --arg store "$DEFAULT_STORE_ID" '.store_id == $store and .status == "published"' "default product should publish in default store"

request POST "/admin/products/$test_product_id/publish" "{}" "${admin_header[@]}" -H "X-Store-Id: $TEST_STORE_ID"
expect_status 200 "POST /admin/products/:id/publish test store"
assert_json --arg store "$TEST_STORE_ID" '.store_id == $store and .status == "published"' "test product should publish in test store"

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
bad_product_body="$(
  jq -n \
    --arg title "Smoke Bad Category Product $RUN_ID" \
    --arg category "$test_category_id" \
    '{title: $title, description: "Should fail due to cross-store category id", price: 33.33, source: "manual", category_ids: [$category], tags: ["dev3-smoke"], variants: [], metadata: {smoke: true, expected_failure: true}}'
)"
request POST "/admin/products/draft" "$bad_product_body" "${admin_header[@]}" -H "X-Store-Id: $DEFAULT_STORE_ID"
expect_status 400 "cross-store category_ids"
assert_json '.error.code == "VALIDATION_ERROR" and ((.error.message // "") | test("category_ids.*current store|belong"; "i"))' "cross-store category_ids should return VALIDATION_ERROR with ownership message"

info "17. Product detail cross-store access is blocked"
request GET "/store/products/$default_product_id" "" "${store_test_headers[@]}"
expect_status 404 "cross-store product detail"
assert_json '(.error.code == "PRODUCT_NOT_FOUND") or (.type == "not_found")' "cross-store product detail should return not found"

info "All store isolation smoke tests passed."
