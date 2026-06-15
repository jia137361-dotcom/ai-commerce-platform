# S2BDIY Single-store Supplier Test Plan

This plan is for a single-store S2BDIY dry-run. It must not pay supplier orders or mutate supplier account/order state beyond the explicitly approved phase.

## Phase 0 — Environment and Safety Check

### Required Checks

Check local environment without printing secrets or tokens:

```text
S2BDIY_BASE_URL or S2BDIY_API_BASE_URL
S2BDIY_APP_KEY
S2BDIY_APP_SECRET
S2BDIY_TEST_MODE
SUPPLIER_ALLOW_PAYMENT=false by default
HUMAN_APPROVED_PAYMENT=false by default
SUPPLIER_ALLOW_CANCEL_DRY_RUN_ORDER=false by default
```

### Safety Rules

- Mask `S2BDIY_APP_SECRET`, access tokens, refresh tokens, supplier tokens, and Authorization headers in logs.
- Classify the base URL before real API calls:
  - `https://opentest.s2bdiy.com`: sandbox/test likely
  - `https://openapi.s2bdiy.com`: production likely
  - anything else: `TODO_CONFIRM_WITH_SUPPLIER`
- Stop before real supplier calls if credentials are missing or if the endpoint is production-like and not explicitly approved.
- Default payment decision:

```text
PAYMENT_SKIPPED_BY_DEFAULT
```

### Phase 0 Acceptance

- Environment is classified.
- Required credentials exist but are masked in logs.
- The run directory exists:

```text
logs/supplier-single-store-YYYYMMDD-HHMMSS/
logs/supplier-single-store-YYYYMMDD-HHMMSS/raw/
logs/supplier-single-store-YYYYMMDD-HHMMSS/commands/
logs/supplier-single-store-YYYYMMDD-HHMMSS/assets/
logs/supplier-single-store-YYYYMMDD-HHMMSS/REPORT.md
```

## Phase 1 — Auth + Product Generation

### Goal

Run the minimum product-generation flow:

```text
accessToken
-> basic product category/list
-> select T-shirt
-> basic product detail
-> select Black/White + M + Front/A面
-> upload PNG material
-> get material detail
-> quickCreate product
-> get product detail
-> get products by id/list if supported
```

### API Sequence

1. `POST /open/v1/accessToken`
   - Save token response fields, expiry fields if present, and token type.
   - Verify backend token cache behavior should reuse token rather than fetching per call.

2. `GET /open/v1/basicProduct/categorys`
   - Optional but useful for category discovery.
   - Save raw response to `raw/basic-product-categories.json`.

3. `GET /open/v1/basicProduct`
   - Select one T-shirt-like product only.
   - Save raw response to `raw/basic-products.json`.
   - If API 07 remains incomplete, mark missing request/response details as `TODO_FROM_EOLINK`.

4. `GET /open/v1/basicProduct/{id}`
   - Save raw response to `raw/basic-product-detail.json`.
   - Prefer:

```text
color: Black, White, then first available
size: M, L, S, XL, then first available
view: Front, 正面, A面, then first available
```

5. Generate local transparent PNG.
   - Use print area width/height when available.
   - Otherwise use a safe fallback such as `1000x1000`.
   - Save to `assets/test-design.png`.

6. `POST /open/v1/material/uploadMaterial`
   - Use multipart field `image`.
   - Save raw response to `raw/upload-material.json`.

7. `GET /open/v1/material/{id}`
   - Save raw response to `raw/material-detail.json`.

8. `POST /open/v1/product/quickCreate`
   - Use one material, one print view, one color, one size.
   - Prefer `design_type=1` first.
   - Save raw response to `raw/create-product.json`.

9. `GET /open/v1/product/{id}`
   - Save raw response to `raw/generated-product-detail.json`.

10. `GET /open/v1/product`
    - Use only read-only lookup/list filters if available.
    - Save raw response to `raw/generated-products-list.json`.

### Phase 1 Acceptance

```text
supplier_product_id exists
show image/mockup exists or documented as still processing
product status/orderable status is identified
selected color/size/view/material are recorded
raw responses are saved
```

## Phase 2 — Unpaid Order + Pricing

### Goal

Create an unpaid supplier order, query final payable pricing, and stop before payment.

```text
get shops
-> logistics quote
-> create unpaid order
-> get order detail
-> get order list by third_order_id
-> extract final pricing
-> stop before payment
```

### API Sequence

1. `GET /open/v1/store`
   - Select an existing supplier shop.
   - Do not call `POST /open/v1/store` in this phase.
   - Save raw response to `raw/shops.json`.

2. Logistics quote.
   - Prefer `GET /open/v1/logisticsCalculation` with basic product/package dimensions.
   - Optionally call `GET /open/v1/calculateProducts` after generated product detail exposes the required `stock_sku_item_id`.
   - Save raw response to `raw/logistics-calculation.json` or `raw/calculate-products.json`.
   - Treat quote as estimate only.

3. `POST /open/v1/order`
   - Only run after confirming Create Order does not charge money in the current environment.
   - Use unique external order id:

```text
citigoo-smoke-YYYYMMDD-HHMMSS
```

   - Critical item mapping:

```text
product_id = supplier designed product id from quickCreate/product detail
size_id = selected size id
color_id = selected color id
```

   - Do not use `stock_sku_item_id` for Create Order unless supplier confirms otherwise.
   - Save raw response to `raw/create-order.json`.

4. Duplicate `third_order_id` check.
   - Re-submit the same `third_order_id` only if supplier confirms duplicate create is safe and unpaid.
   - Save raw response to `raw/create-order-duplicate.json`.

5. `GET /open/v1/order/{id}`
   - Save raw response to `raw/order-detail-pricing.json`.
   - Extract final payable fields:

```text
product_amount
shipping_amount
discount_amount
total_amount
currency if available
pay_status
status
```

6. `GET /open/v1/order`
   - Query by `third_order_id` if supported.
   - Save raw response to `raw/orders-by-third-order-id.json`.

### Phase 2 Acceptance

```text
supplier_order_id exists
third_order_id unique and matched
pay_status is unpaid
product_amount exists
shipping_amount exists
discount_amount exists
total_amount exists
payment skipped by default
```

The core Phase 2 result is:

```text
Estimated / final supplier payable amount before payment:
product_amount
shipping_amount
discount_amount
total_amount
currency if available
```

## Phase 3 — Payment, Manual Approval Only

Payment is forbidden unless all conditions are true:

```text
SUPPLIER_ALLOW_PAYMENT=true
S2BDIY_TEST_MODE=true
HUMAN_APPROVED_PAYMENT=true
confirmed_test_environment=true
balance_sufficient=true
order_total_amount_confirmed=true
```

### API Sequence

1. Re-query `GET /open/v1/order/{id}`.
2. Confirm `total_amount` and `pay_status`.
3. Confirm account balance through supplier balance API or supplier web backend.
4. `POST /open/v1/orderPay`.
5. Re-query `GET /open/v1/order/{id}`.
6. Verify:

```text
pay_status changed to paid or supplier equivalent
status transition is expected
deducted amount equals confirmed amount
```

### Phase 3 Rejections

Do not run payment tests for:

- insufficient balance payment
- duplicate payment
- already paid order payment
- production endpoint without sandbox confirmation

unless a human explicitly approves the exact order id and amount.

## Phase 4 — Fulfillment / Tracking

### Goal

Validate supplier fulfillment status and tracking after payment only.

### API Sequence

1. Poll `GET /open/v1/order/{id}` for order status.
2. Call `GET /open/v1/logistics/orderLogistics` if order-specific logistics options are needed.
3. Call `POST /open/v1/order/updateOrderLogistics/{order_id}` only if an unpaid order requires address/logistics correction and a human approves the mutation.
4. Upload waybill with `POST /open/v1/order/{id}/logistics` only after payment and only if self-owned label testing is approved.
5. Read tracking fields from `data.order_logistics`:

```text
logisticss_track_number
logisticss_status
logisticss_time
oss_file_src
```

### Phase 4 Acceptance

- Supplier status mapping is clear.
- Tracking number appears when supplier ships.
- Waybill URL/status is stored if returned.
- CitiGoo mapping can update local supplier order, shipment, and customer tracking views.

## Negative Tests

Run only negative tests that do not charge money or mutate paid/production state.

Allowed by default after credentials are valid:

```text
wrong token
missing authorization
invalid basic_product_id
invalid material_id
invalid product_id
invalid logistics_id in quote only
invalid address during unpaid create-order validation
duplicate third_order_id
num=0
```

Do not run by default:

```text
insufficient balance payment
duplicate payment
real paid order cancellation
real shipment mutation
child user creation
shop creation
product copy
paid order waybill upload
```

## Dry-run Script Design Recommendation

The repo already has:

```text
scripts/s2bdiy-api-smoke.sh
scripts/s2bdiy-error-cases.sh
apps/medusa-backend/src/modules/suppliers/s2bdiy/s2bdiy-auth.ts
apps/medusa-backend/src/modules/suppliers/s2bdiy/s2bdiy-client.ts
apps/medusa-backend/src/modules/suppliers/s2bdiy/s2bdiy-product.ts
apps/medusa-backend/src/modules/suppliers/s2bdiy/s2bdiy-material.ts
apps/medusa-backend/src/modules/suppliers/s2bdiy/s2bdiy-logistics.ts
apps/medusa-backend/src/modules/suppliers/s2bdiy/s2bdiy-order.ts
```

`scripts/s2bdiy-api-smoke.sh` should not be used for the default dry-run because it calls `orderPay`.

Recommended future additions:

```text
scripts/supplier-single-store-dry-run.sh
apps/medusa-backend/src/scripts/s2bdiy-single-store-dry-run.ts
```

Suggested structure:

- Bash wrapper creates `logs/supplier-single-store-YYYYMMDD-HHMMSS/`, loads env, masks secrets, and invokes the TypeScript script.
- TypeScript script reuses existing S2BDIY client modules.
- Script must stop before `orderPay`.
- Script must require explicit gates before payment:

```text
SUPPLIER_ALLOW_PAYMENT=true
S2BDIY_TEST_MODE=true
HUMAN_APPROVED_PAYMENT=true
```

- Script records:

```text
commands/*.stdout
commands/*.stderr
raw/*.json
assets/test-design.png
REPORT.md
```

## Open Questions

- Does `POST /open/v1/order` ever charge money or reserve balance in the current sandbox?
- Is there an account balance API? If yes, path and response fields are `TODO_FROM_EOLINK`.
- Exact expiry fields for `accessToken` are `TODO_FROM_EOLINK`.
- API 07 basic product list request/response details are incomplete in the snapshot.
- API 02 request format for nested `products[]` is `TODO_CONFIRM_WITH_SUPPLIER`.
- API 19 content type for waybill upload is `TODO_CONFIRM_WITH_SUPPLIER`.
- Which field from generated product detail is the reliable `stock_sku_item_id` for `/open/v1/calculateProducts`?
