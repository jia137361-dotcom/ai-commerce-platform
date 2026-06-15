# S2BDIY Supplier Integration

This document covers supplier-specific S2BDIY behavior. Keep real credentials out of git.

## Environments

| Environment | Base URL |
| --- | --- |
| Sandbox | `https://opentest.s2bdiy.com` |
| Production | `https://openapi.s2bdiy.com` |

Use the current sandbox `app_key` / `app_secret` from the supplier console or private handoff. Do not commit real S2BDIY credentials.

## Local Env

Use `apps/medusa-backend/.env` or `scripts/dev3-full-backend-pipeline.local.env` for local-only values.

Common variables:

- `S2BDIY_API_BASE_URL` or `S2BDIY_BASE_URL`
- `S2BDIY_APP_KEY`
- `S2BDIY_APP_SECRET`
- `S2BDIY_PLATFORM_ID`
- `S2BDIY_TEST_BASIC_PRODUCT_ID` or `S2BDIY_BASIC_PRODUCT_ID`
- `S2BDIY_TEST_SIZE_ID` or `S2BDIY_SIZE_ID`
- `S2BDIY_TEST_COLOR_ID` or `S2BDIY_COLOR_ID`
- `S2BDIY_TEST_VIEW_ID` or `S2BDIY_VIEW_ID`
- `S2BDIY_TEST_LOGISTICS_ID` or `S2BDIY_LOGISTICS_ID`
- `S2BDIY_STORE_ID`
- `S2BDIY_DEFAULT_WEIGHT`
- `S2BDIY_DEFAULT_LENGTH`
- `S2BDIY_DEFAULT_WIDTH`
- `S2BDIY_DEFAULT_HEIGHT`

`S2BDIY_DEFAULT_WEIGHT` is in grams for the current smoke/debug payloads.

## Supplier API Flow

1. `POST /open/v1/accessToken` returns a bearer token.
2. `GET /open/v1/basicProduct` and `GET /open/v1/basicProduct/{id}` return product, color, size, and print view data.
3. `POST /open/v1/material/uploadMaterial` uploads a print file and returns `material_id`.
4. `POST /open/v1/product/quickCreate` creates a supplier-designed product.
5. `GET /open/v1/product/{id}` returns product detail and `show_images`.
6. `GET /open/v1/logisticsCalculation` returns logistics options.
7. `POST /open/v1/order` creates the supplier order.
8. `POST /open/v1/orderPay` pays the supplier order from prepaid balance.
9. `GET /open/v1/order/{id}` polls supplier status and tracking.

## Field Mapping

Core CitiGoo fields should stay supplier-neutral:

| CitiGoo | S2BDIY |
| --- | --- |
| `supplier_material_id` | uploadMaterial `id` |
| `supplier_product_id` after provisioning | quickCreate `product_id` |
| `supplier_mockup_image_url` or `mockup_image_url` | product detail `show_images` |
| `basic_product_id` | basicProduct `id` |
| `supplier_size_id` | S2BDIY size id |
| `supplier_color_id` | S2BDIY color id |
| `view_id` | S2BDIY view id |
| `mc_supplier_order.supplier_order_id` | supplier order `id` |
| `mc_supplier_order.third_order_id` | CitiGoo/Medusa order reference |

Vendor-specific names such as `s2b_*` or `s2bdiy_*` should remain inside supplier adapter code, supplier docs, supplier scripts, or supplier payload examples.

## Backend Admin Routes

- `POST /admin/supplier-products/sync-basic-product`
- `GET /admin/orders/{order_id}/supplier-order`
- `POST /admin/orders/{order_id}/retry-supplier-pay`
- `POST /admin/supplier-orders/sync`

Routes require `Authorization: Bearer <ADMIN_TOKEN>`. Order-scoped routes also use `X-Store-Id` and reject cross-store access.

## Mock Vs Real Credential Behavior

- Unit tests and JSON/syntax checks do not require real S2BDIY credentials.
- The Dev3 full backend pipeline marks real supplier checks as `SKIPPED` unless `RUN_PHASE2B_S2BDIY` is set to `true` and required S2BDIY env vars are present.
- `orderPay` requires prepaid test balance in the S2BDIY sandbox. A supplier HTTP 502 during payment is usually an external sandbox account issue, not automatically a CitiGoo regression.

## Dev3 Pipeline

Run:

```bash
bash scripts/dev3-full-backend-pipeline.sh
```

The pipeline validates S2BDIY unit coverage every run. Real token/basic product/logistics checks run only when enabled with S2BDIY credentials.

## Unified Postman / Newman

S2BDIY coverage lives in the unified backend collection:

- `postman/ai-commerce-store-isolation.postman_collection.json`
- `postman/ai-commerce-local.example.postman_environment.json`

Folder:

- `Phase 2B / S2BDIY Supplier Fulfillment`

The folder is skipped by default:

```text
run_phase2b_s2bdiy=false
```

Set `run_phase2b_s2bdiy=true` only when S2BDIY sandbox credentials and account readiness are configured.

## Common Failures

- Invalid token: refresh `accessToken` and verify `S2BDIY_APP_KEY` / `S2BDIY_APP_SECRET`.
- Material upload failed: verify print file path, image format, and supplier limits.
- quickCreate failed: verify `basic_product_id`, `size_id`, `color_id`, `view_id`, and `material_id`.
- Product detail has no `show_images`: inspect supplier product detail before publishing.
- Missing logistics option: set `S2BDIY_TEST_LOGISTICS_ID` or adjust destination/package dimensions.
- Create order failed: check duplicate `third_order_id`, supplier store id, address, and item ids.
- orderPay failed: verify supplier order id and prepaid sandbox balance.
- Tracking empty: continue polling; tracking may appear only after supplier production/shipping advances.
