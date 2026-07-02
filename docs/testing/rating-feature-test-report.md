# Rating Feature Test Report

## 1. Executive Summary

The current rating feature is a storefront product review/rating flow. It is not supplier scoring, store rating, order rating, or AI generation scoring.

The implementation lets a verified buyer create one published review per store/product/order/email and exposes rating summaries on storefront product list/detail responses. Review creation does not require a logged-in customer session; it verifies the buyer by email plus order number/display id and by checking that the order belongs to the current store and contains the product in line item metadata.

Additional Jest route coverage was added for valid creation, listing, rating boundaries, invalid ratings, missing order data, illegal/cross-store product ids, cross-store order rejection, missing purchased product rejection, and duplicate review rejection.

No S2BDIY supplier API, orderPay, or external supplier call was made during this audit.

## 2. Discovered Implementation

| Area | File | Notes |
|---|---|---|
| Storefront review API | `apps/medusa-backend/src/api/store/products/[id]/reviews/route.ts` | `GET` lists published reviews and summary; `POST` creates a verified-buyer review. |
| Product list/detail summary | `apps/medusa-backend/src/api/store/products/route.ts` | Storefront product list includes `average_rating` and `review_count`. |
| Product detail summary | `apps/medusa-backend/src/api/store/products/[id]/route.ts` | Storefront product detail includes `average_rating` and `review_count`. |
| Review helper logic | `apps/medusa-backend/src/lib/product-reviews.ts` | Rating validation, summary aggregation, review normalization, email masking, order item product-id extraction. |
| Store-core model | `apps/medusa-backend/src/modules/store-core/models/product-review.ts` | Defines `mc_product_review`. |
| Store-core migration | `apps/medusa-backend/src/modules/store-core/migrations/Migration20260601000000.ts` | Creates table, rating check, store/product and store/order indexes, duplicate guard index. |
| Existing helper tests | `apps/medusa-backend/src/__tests__/product-reviews.test.ts` | Covers helper behavior. |
| Added route tests | `apps/medusa-backend/src/__tests__/rating-product-review-routes.test.ts` | Covers API route behavior and store isolation risks. |
| API docs | `docs/api.md` | Documents storefront review endpoints and rating fields. |

Search did not find a rating/review folder in the Unified Newman collection or a dedicated Dev3 pipeline step.

## 3. API Contract

### `GET /store/products/:product_id/reviews`

Purpose: list published reviews for one published product in the resolved store.

Inputs:

- Path: `product_id`
- Header: `X-Store-Id` optional, with default store fallback through store context.
- Query: `limit`, default `20`, clamped to `1..100`.

Response shape:

```json
{
  "product_id": "prod_...",
  "store_id": "default_store",
  "average_rating": 4.5,
  "review_count": 2,
  "rating_breakdown": { "5": 1, "4": 1, "3": 0, "2": 0, "1": 0 },
  "reviews": []
}
```

Not-found behavior:

- Returns `404 PRODUCT_NOT_FOUND` when the product does not exist, is not published, or does not belong to the resolved store.

### `POST /store/products/:product_id/reviews`

Purpose: create one published review for a product after verifying purchase.

Request body:

```json
{
  "email": "buyer@example.com",
  "order_number": 1001,
  "rating": 5,
  "title": "Great print",
  "content": "The print quality is good.",
  "customer_name": "Jane"
}
```

Accepted aliases:

- `display_id` can be used instead of `order_number`.

Validation:

- `email` is required and must contain `@`.
- `order_number` or `display_id` is required and must parse to an integer.
- `rating` must be an integer from `1` to `5`.
- `title` max length is 120 characters.
- `customer_name` max length is 120 characters.
- `content` max length is 2000 characters.

Response on success:

- HTTP `201`
- Returns product id, store id, updated summary, and normalized created review.

Duplicate behavior:

- Duplicate review for the same `store_id + product_id + order_id + customer_email` is rejected with `409 REVIEW_NOT_ALLOWED`.

## 4. Data Model / Persistence

The review table is `mc_product_review`.

Stored fields:

- `store_id`
- `product_id`
- `order_id`
- `order_display_id`
- `customer_email`
- `customer_name`
- `rating`
- `title`
- `content`
- `status`
- `metadata`

Database protections:

- Rating check constraint only allows `1, 2, 3, 4, 5`.
- Index on `store_id + product_id`.
- Index on `store_id + order_id`.
- Unique partial index on `store_id + product_id + order_id + customer_email`.

The route also validates rating before persistence, so invalid values are rejected before hitting the DB.

## 5. Store Isolation and Security

Store isolation is implemented in three places:

- Product lookup requires `{ id, store_id, status: "published" }`.
- Order verification skips orders whose store id does not match the resolved store.
- Review reads and duplicate checks include `store_id`.

Security and access notes:

- The docs require `x-publishable-api-key` for storefront APIs, but this route does not contain an explicit route-level publishable key check. If publishable-key enforcement is middleware-level, that should be confirmed with an integration or Newman test.
- Review creation does not require a logged-in customer account.
- Review creation is not anonymous because it requires email plus order number/display id and verified order/product match.
- The implementation does not explicitly require a paid, completed, fulfilled, or delivered order. It only requires a matching order in the same store containing the product.
- No admin moderation/query endpoint was found.
- No update/delete endpoint was found.

## 6. Test Cases

Existing coverage:

- `apps/medusa-backend/src/__tests__/product-reviews.test.ts` covers helper-level validation, summarization, normalization, email masking, and metadata extraction.

Added coverage:

| Case | Result |
|---|---|
| Normal verified-buyer review creation | PASS |
| Query published reviews and aggregate summary | PASS |
| `rating=1` boundary | PASS |
| `rating=5` boundary | PASS |
| `rating=0` invalid | PASS |
| `rating=6` invalid | PASS |
| Negative rating invalid | PASS |
| Decimal rating invalid | PASS |
| String rating invalid | PASS |
| Missing `order_number` / `display_id` invalid | PASS |
| Nonexistent or cross-store product id rejected | PASS |
| Cross-store order rejected | PASS |
| Order that did not purchase product rejected | PASS |
| Duplicate review rejected | PASS |

## 7. Test Results

Commands run:

```bash
npm --workspace apps/medusa-backend run test -- rating
```

Result: PASS

- Test suites: 1 passed
- Tests: 14 passed

```bash
npm --workspace apps/medusa-backend run test
```

Result: PASS

- Test suites: 11 passed
- Tests: 52 passed

```bash
bash -n scripts/dev3-full-backend-pipeline.sh
```

Result: PASS

No external supplier API was called.

## 8. Gaps / Risks

- No Postman/Newman coverage was found for product reviews.
- Dev3 full pipeline does not appear to exercise review creation or review listing.
- `docs/api.md` documents review APIs, but no schema documentation entry was found in the searched docs.
- Route-level tests mock Medusa dependencies; they do not prove publishable API key middleware behavior.
- The verified-buyer rule does not currently check paid/completed/fulfilled order state.
- There is no admin moderation endpoint to hide, delete, or list reviews.
- There is no customer-authenticated edit/delete flow.
- Product review summaries are based on published reviews only, which is correct for storefront display, but moderation tooling is needed before hidden reviews are operationally useful.

## 9. Recommended Next Steps

1. Add a small Newman folder named `Storefront Product Reviews` after test fixtures can deterministically create a store-scoped order with product line item metadata.
2. Add Dev3 smoke coverage for:
   - create review from verified order
   - duplicate review rejection
   - cross-store review rejection
   - storefront product detail exposes updated `average_rating` and `review_count`
3. Confirm whether publishable API key enforcement is middleware-level for this route.
4. Decide whether review creation should require paid, completed, fulfilled, or delivered order state.
5. Add admin moderation APIs if business users need to hide or inspect reviews.
6. Update schema docs with `mc_product_review` if schema docs are intended to cover store-core persistence.

## 10. Files Changed

Added:

- `apps/medusa-backend/src/__tests__/rating-product-review-routes.test.ts`
- `docs/testing/rating-feature-test-report.md`

No business route, model, migration, supplier, cart, order, or Postman files were changed.
