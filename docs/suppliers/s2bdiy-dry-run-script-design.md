# S2BDIY No-payment Dry-run Script Design

This document describes the proposed implementation for a safe single-store S2BDIY dry-run. It is a design only; do not use it as permission to call real supplier APIs or payment endpoints.

## Script Files

Recommended files:

```text
scripts/supplier-single-store-dry-run.sh
apps/medusa-backend/src/scripts/s2bdiy-single-store-dry-run.ts
```

### Bash Wrapper

`scripts/supplier-single-store-dry-run.sh` should:

- run from repo root;
- load local env from `apps/medusa-backend/.env` and optionally `scripts/supplier-single-store-dry-run.local.env`;
- create a run directory:

```text
logs/supplier-single-store-YYYYMMDD-HHMMSS/
```

- create subdirectories:

```text
raw/
masked/
assets/
commands/
```

- invoke the TypeScript runner with `medusa exec` or `tsx`, following existing repo conventions;
- never print raw secrets or tokens.

### TypeScript Runner

`apps/medusa-backend/src/scripts/s2bdiy-single-store-dry-run.ts` should:

- reuse existing S2BDIY modules:

```text
s2bdiy-auth.ts
s2bdiy-client.ts
s2bdiy-product.ts
s2bdiy-material.ts
s2bdiy-logistics.ts
s2bdiy-order.ts
```

- write raw supplier responses under `raw/`;
- write masked request/response summaries under `masked/`;
- generate `REPORT.md`;
- stop before payment by default.

## Execution Phases

The runner should have explicit phase names:

```text
phase0_env_check
phase1_auth_and_product_generation
phase2_unpaid_order_pricing
phase3_payment_skipped
```

Each phase should write:

```text
command or action name
started_at
finished_at
exit/pass/fail/blocker status
masked request
masked response
raw response path when available
failure reason
```

## Safety Gates

### Required Gates

The script must stop when any of these gates fail:

```text
Missing credentials -> stop
Unknown test/prod environment -> stop before mutation
Create Order charge behavior unknown -> stop before create order
SUPPLIER_ALLOW_PAYMENT != true -> never call orderPay
HUMAN_APPROVED_PAYMENT != true -> never call orderPay
```

### Environment Classification

Classify `S2BDIY_BASE_URL` or `S2BDIY_API_BASE_URL`:

```text
https://opentest.s2bdiy.com -> sandbox/test likely
https://openapi.s2bdiy.com -> production likely
other -> TODO_CONFIRM_WITH_SUPPLIER
```

Production-like or unknown endpoints must stop before supplier mutations unless an explicit human confirmation variable is added later.

### Payment Gate

The script must never call `POST /open/v1/orderPay` unless all conditions are true:

```text
SUPPLIER_ALLOW_PAYMENT=true
S2BDIY_TEST_MODE=true
HUMAN_APPROVED_PAYMENT=true
confirmed_test_environment=true
balance_sufficient=true
order_total_amount_confirmed=true
```

The default result is:

```text
payment_status = PAYMENT_SKIPPED_BY_DEFAULT
```

## API Calls

### phase0_env_check

No supplier API calls.

Local checks:

```text
S2BDIY_BASE_URL or S2BDIY_API_BASE_URL exists
S2BDIY_APP_KEY exists
S2BDIY_APP_SECRET exists
S2BDIY_TEST_MODE is set and understood
SUPPLIER_ALLOW_PAYMENT defaults false
HUMAN_APPROVED_PAYMENT defaults false
SUPPLIER_CREATE_ORDER_CONFIRMED_NO_CHARGE defaults false
```

If credentials are missing, stop with a blocker report.

### phase1_auth_and_product_generation

Allowed API calls:

```text
POST /open/v1/accessToken
GET /open/v1/basicProduct/categorys
GET /open/v1/basicProduct
GET /open/v1/basicProduct/{id}
POST /open/v1/material/uploadMaterial
GET /open/v1/material/{id}
POST /open/v1/product/quickCreate
GET /open/v1/product/{id}
GET /open/v1/product?ids=...
```

Phase behavior:

1. Obtain token using `app_key + app_secret`.
2. Cache token in memory for the run; do not request a new token per call.
3. Fetch categories and product list.
4. Select one T-shirt-like basic product.
5. Fetch basic product detail.
6. Select:

```text
color: Black, White, then first available
size: M, L, S, XL, then first available
view: Front, 正面, A面, then first available
```

7. Generate transparent PNG from print area dimensions, or fallback `1000x1000`.
8. Upload material.
9. Fetch material detail.
10. Call quickCreate for one designed product.
11. Fetch generated product detail and product list lookup.

### phase2_unpaid_order_pricing

Allowed API calls, only after Create Order no-charge behavior is confirmed:

```text
GET /open/v1/store
GET /open/v1/logisticsCalculation
GET /open/v1/calculateProducts
POST /open/v1/order
GET /open/v1/order/{id}
GET /open/v1/order?third_order_id=...
```

Gate before `POST /open/v1/order`:

```text
SUPPLIER_CREATE_ORDER_CONFIRMED_NO_CHARGE=true
confirmed_test_environment=true
```

Phase behavior:

1. Fetch existing shops with `GET /open/v1/store`.
2. Select existing shop/store id.
3. Calculate logistics with `GET /open/v1/logisticsCalculation`.
4. Optionally call `GET /open/v1/calculateProducts` if request format and `stock_sku_item_id` mapping are confirmed.
5. Create supplier order with unique external id:

```text
citigoo-smoke-YYYYMMDD-HHMMSS
```

6. Create Order item mapping must be:

```text
product_id = supplier_product_id from quickCreate/product detail
size_id = selected_size_id
color_id = selected_color_id
num = 1
```

7. Do not use `stock_sku_item_id` for Create Order unless supplier confirms the contract changed.
8. Query order detail immediately after creation.
9. Query order list by `third_order_id` if supported.
10. Extract final payable fields from `GET /open/v1/order/{id}`.

### phase3_payment_skipped

Default behavior:

```text
Do not call POST /open/v1/orderPay
Write payment_status = PAYMENT_SKIPPED_BY_DEFAULT
Write payment_skip_reason with failed gate names
```

The script may print the exact command that would be used for payment, but only with placeholders and a clear warning. It must not execute payment unless all payment gates pass and a future explicit implementation request approves it.

## Never Call by Default

These APIs must never run in the default dry-run:

```text
POST /open/v1/orderPay
POST /open/v1/order/{id}/logistics
POST /open/v1/childUser
POST /open/v1/store
POST /open/v1/product/{id}/copy
DELETE /open/v1/order/{id}
```

## Output Files

The script should create:

```text
logs/supplier-single-store-YYYYMMDD-HHMMSS/
  raw/
  masked/
  assets/
  commands/
  REPORT.md
```

### Raw Files

Suggested raw response paths:

```text
raw/access-token.json
raw/basic-product-categories.json
raw/basic-products.json
raw/basic-product-detail.json
raw/upload-material.json
raw/material-detail.json
raw/create-product.json
raw/generated-product-detail.json
raw/generated-products-list.json
raw/shops.json
raw/logistics-calculation.json
raw/calculate-products.json
raw/create-order.json
raw/order-detail-pricing.json
raw/orders-by-third-order-id.json
```

Raw token response must be either masked before writing or placed in a clearly local-only path excluded from git. Reports must never expose full tokens/secrets.

### Masked Files

Suggested masked response paths:

```text
masked/access-token.masked.json
masked/basic-products.summary.json
masked/create-order.summary.json
masked/order-pricing.summary.json
```

## Final Report Fields

`REPORT.md` must include:

```text
selected_basic_product_id
selected_color_id
selected_size_id
selected_view_id
supplier_asset_id
supplier_product_id
supplier_order_id
external_order_id
product_amount
shipping_amount
discount_amount
total_amount
currency if available
payment_status = PAYMENT_SKIPPED_BY_DEFAULT
```

Also include:

```text
base_url_masked
environment_classification
token_response_fields
token_cache_strategy
selected_basic_product_name
selected_color_name
selected_size_name
selected_view_name
supplier_asset_url
mockup_or_show_image_url
supplier_order_status
supplier_pay_status
pricing_source = GET /open/v1/order/{id}
logistics_quote_amount
logistics_quote_source
blocked_steps
open_questions
```

## Open Questions Before Running

The script must report these unresolved items before mutation:

```text
S2BDIY_APP_SECRET missing
sandbox vs production
Create Order charge behavior
Balance API availability
calculateProducts request format
upload waybill content type
stock_sku_item_id mapping
```

## Recommended Implementation Notes

- Prefer TypeScript for API calls so existing S2BDIY client modules are reused.
- Keep the Bash script as orchestration only.
- Add a strict denylist for high-risk endpoints.
- Add helper functions for `maskSecret`, `writeRawJson`, `writeMaskedJson`, and `recordStep`.
- Use safe decimal/string handling for money.
- Use synthetic address and no real customer PII.
- Keep all generated logs under `logs/`, which should stay out of commits unless explicitly requested.
- Do not integrate with `push-s2b-order.ts` for no-payment dry-run because current push flow eventually calls `payOrders`.
