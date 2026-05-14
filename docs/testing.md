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

## Documentation And Collection Tests

Developer 3 should also maintain:

- API documentation examples for store-aware routes.
- Shared error code documentation.
- Postman or Apifox collection covering happy paths and cross-store failures.
- Manual review steps for `default_store` and `test_store` scenarios.
