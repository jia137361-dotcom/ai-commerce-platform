# Developer 3 Testing Baseline

This document defines the tests Developer 3 should add after the documentation PR. It is intentionally a baseline, not an implementation.

## Store Context Tests

Required coverage:

- `resolveCurrentStore` returns `X-Store-Id` when a non-empty header is present.
- `X-Store-Id` takes precedence over host/default fallback.
- Empty `X-Store-Id` is ignored.
- Localhost requests without `X-Store-Id` resolve to `DEFAULT_STORE_ID`.
- Non-localhost requests without `X-Store-Id` resolve to `DEFAULT_STORE_ID`.
- `DEFAULT_STORE_ID` falls back to `default_store` when the env var is unset.
- The returned `source` value is correct for header, host, and default paths.

## Seed Tests

Required coverage:

- Seed creates `default_store` when missing.
- Seed creates `test_store` when missing.
- Seed is idempotent when both stores already exist.
- Seed respects `DEFAULT_STORE_ID` for the default store id.

## Product Store Isolation Tests

Required coverage:

- `GET /store/products` only returns published products for the resolved store.
- `GET /store/products` does not return products from `test_store` when current store is `default_store`.
- `GET /store/products` does not return products from `default_store` when current store is `test_store`.
- `GET /store/products/{product_id}` returns a current-store published product.
- `GET /store/products/{product_id}` returns `PRODUCT_NOT_FOUND` when the product belongs to another store.
- Draft products are not returned by storefront product APIs.
- Product draft creation accepts current-store `category_ids`.
- Product draft creation rejects `category_ids` from another store with `VALIDATION_ERROR`.

## Product Category Isolation Tests

Required coverage:

- `GET /store/product-categories` only returns categories for the resolved store.
- `GET /admin/product-categories` only returns categories for the resolved store.
- `POST /admin/product-categories` creates a category in the resolved store.
- `POST /admin/product-categories` returns `STORE_NOT_FOUND` when the resolved store does not exist.
- `POST /admin/product-categories` returns `VALIDATION_ERROR` when `name` is missing.
- `POST /admin/product-categories` returns `VALIDATION_ERROR` when the generated slug already exists in the current store.
- `POST /admin/product-categories` returns `VALIDATION_ERROR` when `parent_id` belongs to another store.
- Product draft `category_ids` ownership validation should remain an automated regression test.

## Publishable API Key Smoke Tests

Current smoke expectations:

- `GET /health` should pass without `x-publishable-api-key`.
- `GET /store-context` should pass without `x-publishable-api-key`.
- `GET /store-context` with `X-Store-Id: test_store` should return `test_store` with `source: "header"`.
- `GET /store/products` should require `x-publishable-api-key`.
- `GET /store/product-categories` should require `x-publishable-api-key`.

Placeholder curl examples:

```bash
curl -i http://localhost:9000/health

curl -i http://localhost:9000/store-context

curl -i \
  -H "X-Store-Id: test_store" \
  http://localhost:9000/store-context

curl -i \
  -H "x-publishable-api-key: <publishable_api_key>" \
  -H "X-Store-Id: test_store" \
  http://localhost:9000/store/products

curl -i \
  -H "x-publishable-api-key: <publishable_api_key>" \
  -H "X-Store-Id: test_store" \
  http://localhost:9000/store/product-categories
```

TODO: Decide whether the backend seed should create a local publishable API key, or whether docs should instruct developers to create one through Medusa Admin.

## Local Smoke Test Script

Developer 3 can run the local store isolation smoke test with:

```bash
export BASE_URL="http://localhost:9000"
export PUBLISHABLE_API_KEY="<publishable_api_key>"
export ADMIN_TOKEN="<admin_bearer_token>"
export DEFAULT_STORE_ID="default_store"
export TEST_STORE_ID="test_store"

./scripts/smoke-store-isolation.sh
```

The script uses `curl` and `jq`, creates uniquely named smoke-test categories and products, publishes products in both seeded stores, then checks positive and negative store isolation behavior.

Required environment variables:

- `PUBLISHABLE_API_KEY`: Medusa publishable API key for Store API requests.
- `ADMIN_TOKEN`: bearer token for Admin API requests.

Optional environment variables:

- `BASE_URL`: defaults to `http://localhost:9000`.
- `DEFAULT_STORE_ID`: defaults to `default_store`.
- `TEST_STORE_ID`: defaults to `test_store`.
- `DEFAULT_MEDUSA_PRODUCT_ID`: native Medusa product id used for default-store bridge checks.
- `DEFAULT_MEDUSA_VARIANT_ID`: native Medusa variant id used for default-store cart checks.
- `TEST_MEDUSA_PRODUCT_ID`: native Medusa product id used for test-store bridge checks.
- `TEST_MEDUSA_VARIANT_ID`: native Medusa variant id used for test-store cart checks.

## Phase 1 Product-To-Cart Bridge Tests

Required environment:

- `PUBLISHABLE_API_KEY` or local alias `PAK`.
- `ADMIN_TOKEN`.
- `DEFAULT_MEDUSA_PRODUCT_ID`.
- `DEFAULT_MEDUSA_VARIANT_ID`.
- `TEST_MEDUSA_PRODUCT_ID`.
- `TEST_MEDUSA_VARIANT_ID`.

Expected behavior:

- `/store/products` and `/store/products/{product_id}` return `medusa_product_id`, `medusa_variant_id`, and `is_cart_addable`.
- Products without `medusa_variant_id` return `is_cart_addable: false`.
- Products with a valid `medusa_variant_id` return `is_cart_addable: true`.
- Same-store cart line-item adds use native `variant_id` and succeed.
- Cross-store variant adds return `CART_STORE_MISMATCH`.
- `product_id` / `mc_product.id` add-to-cart is not supported in Phase 1.

Create an admin user locally if one does not exist:

```bash
cd apps/medusa-backend
npx medusa user -e admin@example.com -p supersecret
```

Get `ADMIN_TOKEN`:

```bash
curl -sS -X POST http://localhost:9000/auth/user/emailpass \
  -H "Content-Type: application/json" \
  --data '{"email":"admin@example.com","password":"supersecret"}'
```

Copy the returned token and export it:

```bash
export ADMIN_TOKEN="<token>"
```

Get `PUBLISHABLE_API_KEY` from Medusa Admin. The current seed script does not create one.

## Postman Store Isolation Collection

Import this collection into Postman:

```text
postman/ai-commerce-store-isolation.postman_collection.json
```

Create or select a Postman environment with these variables:

| Variable | Example |
| --- | --- |
| `base_url` | `http://localhost:9000` |
| `publishable_api_key` | `<publishable_api_key>` |
| `admin_token` | `<admin_bearer_token>` |
| `default_store_id` | `default_store` |
| `test_store_id` | `test_store` |

Run the collection in order. It mirrors `scripts/smoke-store-isolation.sh` and creates uniquely named categories/products using a collection-level smoke run id.

The collection covers:

- Health and store-context checks.
- Missing publishable API key rejection.
- Admin bearer-token auth check.
- Category creation in both stores.
- Product category isolation.
- Draft product creation in both stores.
- Product publishing in the correct store.
- Product list isolation.
- Cross-store publish rejection.
- Cross-store `category_ids` rejection.
- Cross-store product detail blocking.

Troubleshooting:

- If product draft creation fails because `platform_product_id`, `supplier_product_id`, or another recently added product column is missing, run migrations with `npm --workspace apps/medusa-backend run db:migrate`.
- `POST /admin/product-categories` accepts `name` and `description`; `slug` and `sort_order` are generated or defaulted by the backend.

## Store Settings Isolation Tests

Required coverage:

- `GET /store/settings` returns settings for the resolved store.
- `GET /store/settings` does not return another store's settings.
- `GET /admin/store-settings` returns settings for the resolved store.
- `PUT /admin/store-settings` creates settings for the selected store.
- `PUT /admin/store-settings` updates only the selected store's settings.

## Publish Cross-Store Tests

Required coverage:

- `POST /admin/products/{product_id}/publish` publishes a product in the current store.
- Publishing a product from another store returns `PRODUCT_STORE_MISMATCH`.
- A missing product id returns `PRODUCT_NOT_FOUND`.
- The final updated product remains associated with its original `store_id`.

## body.store_id Override Tests

Current behavior to document in tests before changing:

- `POST /admin/products/draft` uses `body.store_id` when provided.
- `POST /admin/products/draft` falls back to resolved request store when `body.store_id` is omitted.
- `POST /admin/products/draft` returns `STORE_NOT_FOUND` for a missing body-selected store.
- `PUT /admin/store-settings` uses `body.store_id` when provided.
- `PUT /admin/store-settings` falls back to resolved request store when `body.store_id` is omitted.
- `PUT /admin/store-settings` returns `STORE_NOT_FOUND` for a missing body-selected store.

Risk to keep visible: admin draft product creation and admin store settings updates may allow `body.store_id` to override request context. This is a known Phase 1 cross-store risk. Do not silently change it without a dedicated behavior-change PR and updated API docs.

## Unknown Store Behavior Tests

Required coverage:

- Storefront product and category list routes with an unknown `X-Store-Id` return empty scoped results unless route behavior changes.
- Admin category creation validates the resolved store and returns `STORE_NOT_FOUND`.
- Admin product draft and store settings writes validate the selected store and return `STORE_NOT_FOUND`.

## Future Cart And Order Isolation Tests

When cart and order APIs are added or stabilized, add tests for:

- Cart creation binds cart to current store.
- Adding items rejects products from another store.
- Cart reads are scoped to current store.
- Order creation uses the cart store.
- Order reads are scoped to current store.
- Cross-store cart/order operations return `CART_STORE_MISMATCH` or `ORDER_STORE_MISMATCH`.
- Payment and webhook flows cannot update another store's cart or order.

## Phase 2B S2BDIY Tests

### 单元测试

```bash
cd apps/medusa-backend && npm test
```

覆盖：`s2bdiy-status-mapper`、`buildThirdOrderId`、line-item S2B 字段。

### S2BDIY 直连 Smoke（不依赖 Medusa）

```bash
bash scripts/s2bdiy-api-smoke.sh
```

前置：`.env` 中 `S2BDIY_API_BASE_URL`、`S2BDIY_APP_KEY`、`S2BDIY_APP_SECRET`；可选 `S2BDIY_TEST_BASIC_PRODUCT_ID` 等（未设则从列表接口自动取第一个）。

`orderPay` 若返回 HTTP 502（余额不足）脚本会 `SKIP` 该步，其余步骤仍应 PASS。

### Phase 2B Medusa E2E

```bash
# migrate + seed 后
cd apps/medusa-backend && npx medusa db:migrate && npm run seed
bash scripts/phase2b-e2e.sh
```

### Admin API 手工检查

- `POST /admin/suppliers/s2bdiy/sync-basic-product`
- `POST /admin/ai/generate-and-draft` → 响应含 `s2b_designed_product_id`
- `POST /admin/products/{id}/publish`（需已有 `s2b_designed_product_id`）
- `GET /admin/orders/{order_id}/supplier-order`
- `POST /admin/supplier-orders/sync`

详见 [docs/suppliers/s2bdiy.md](suppliers/s2bdiy.md)。

## Documentation And Collection Tests

Developer 3 should also maintain:

- API documentation examples for store-aware routes.
- Shared error code documentation.
- Postman or Apifox collection covering happy paths and cross-store failures.
- Manual review steps for `default_store` and `test_store` scenarios.
