# S2BDIY Single-store Supplier Test Summary

## 1. Executive Summary

The single-store S2BDIY supplier integration test has completed the main API flow through paid test order status in the S2BDIY test environment:

```text
accessToken
-> basicProduct
-> basicProduct detail
-> uploadMaterial
-> quickCreate
-> product detail
-> logistics quote
-> create order
-> order detail pricing
-> orderPay
-> order list / order polling
```

The test order was created and paid successfully. Platform logistics fields are visible after payment, but final shipment/tracking could not be completed in the S2BDIY test environment because S2BDIY technical support confirmed that test-environment orders require manual review and are not currently processed. Therefore, tracking and fulfillment remain blocked by supplier test-environment policy, not by a confirmed CitiGoo integration bug.

No token or secret is included in this summary. The access token raw file used by the dry-run stores only a masked token.

## 2. Test Environment

| Field | Value |
|---|---|
| Worktree | `/Users/Zhuanz/Documents/Codex/ai-commerce-platform-supplier-test` |
| Branch | `feature/supplier-s2bdiy-dry-run` |
| Supplier environment | S2BDIY test / sandbox |
| Base URL | masked in reports as `htt***com` |
| App key | masked in reports as `w***1` |
| Payment mode | Manual Phase 3 payment test, not default dry-run |
| Default dry-run payment behavior | `PAYMENT_SKIPPED_BY_DEFAULT` |
| Source requirements | `/Users/Zhuanz/Downloads/一、必须测试的供应商功能.docx` and supplier docs under `docs/suppliers/` |

## 3. End-to-End Flow Result

| Step | Result | Evidence | Key Values | Notes / Risks |
|---|---|---|---|---|
| accessToken | PASS | `logs/supplier-single-store-20260607-161027/REPORT.md`, `raw/access-token.json` | token present, masked | Token value intentionally not included. |
| basicProduct list | PASS | `logs/s2bdiy-basic-product-20260608-153055/REPORT.md`, `logs/supplier-single-store-20260607-161027/raw/basic-products.json` | 50 products fetched in dry-run; selected `basic_product_id=2864` | Selected apparel-like long sleeve, not a cup/phone case/poster. |
| basicProduct detail | PASS | `logs/s2bdiy-basic-product-detail-20260608-155019/REPORT.md`, `logs/supplier-single-store-20260607-161027/raw/basic-product-detail.json` | Black `color_id=5`, M `size_id=21`, item `11548`, A面 `view_id=1` | Product detail includes sizes/colors/items/print areas. |
| uploadMaterial | PASS | `logs/supplier-single-store-20260607-161027/raw/upload-material.json`, `raw/material-detail.json` | `material_id=57655`, image URL returned | Transparent PNG generated locally as `assets/test-design.png`. |
| quickCreate | PASS | `logs/supplier-single-store-20260607-161027/raw/create-product.json` | `supplier_product_id=174935` | Product generated synchronously enough to query detail. |
| product detail | PASS | `logs/supplier-single-store-20260607-161027/raw/product-detail.json` | status `1`, status_text `上架`, product code `5BNFPM` | Mockup/show image returned. |
| logistics quote | PASS | `logs/supplier-single-store-20260607-161027/raw/logistics-calculation.json`, `raw/calculate-products.json` | selected report value `logistics_platform_id=294`, quote `0.01`; raw first option includes `150` | Final chosen logistics id in order flow was `294`; raw quote APIs returned multiple options. |
| create order | PASS | `logs/supplier-single-store-20260607-161027/raw/create-order.json` | `supplier_order_id=7116148`, `external_order_id=citigoo-smoke-20260607-161027` | Created unpaid order only; payment skipped by default dry-run. |
| order detail pricing | PASS | `logs/supplier-single-store-20260607-161027/raw/order-detail.json` | product `1.78`, shipping `9.7`, discount `0`, total `11.48` | Currency not present in API response; recorded as `TODO_CONFIRM_WITH_SUPPLIER`. |
| orderPay | PASS | `logs/supplier-phase3-manual-20260607-162522/REPORT.md`, `raw/order-pay.json` | status_code `200`, msg `操作成功`, total `11.48`, returned balance `0.00` | Manual payment test only; not part of default dry-run script. |
| order status polling | PARTIAL | `logs/s2bdiy-order-polling-20260608-161241/REPORT.md`, `raw/order-poll-*.json` | pay_status `3`, status `3`, status_text `审核中` | Tracking stayed empty because test environment does not process test orders. |

## 4. Requirement-by-Requirement Validation Matrix

| # | Requirement | Result | Evidence | Key Values | Notes / Risks |
|---|---|---|---|---|---|
| 1 | 授权与 Token | PASS | `logs/supplier-single-store-20260607-161027/REPORT.md`, `raw/access-token.json`, `logs/s2bdiy-negative-20260608-161429/raw/auth-wrong-secret.json` | token present; wrong secret `status_code=200304` | Token is masked. Token cache behavior covered by backend tests. |
| 2 | 获取基础选品 | PASS | `logs/s2bdiy-basic-product-20260608-153055/REPORT.md` | `basic_product_id=2864`, code `46YNZD`, purchase_price `1.78` | Selected product is apparel-like long sleeve, acceptable for T-shirt-like single SKU flow. |
| 3 | 获取基础产品详情 | PASS | `logs/s2bdiy-basic-product-detail-20260608-155019/REPORT.md` | Black `5`, White `6`, M `21`, item `11548` | Detail raw saved. |
| 4 | 上传设计素材 | PASS | `logs/supplier-single-store-20260607-161027/raw/upload-material.json`, `raw/material-detail.json` | `material_id=57655`, image URL returned | Invalid non-image tested separately. |
| 5 | 查询设计面 | PASS | `logs/s2bdiy-design-view-20260608-160601/REPORT.md` | Front/A面 `view_id=1` | Single-side design only; B面 present but not used. |
| 6 | 测试设计模式 | PASS | `logs/s2bdiy-design-mode-20260608-160903/REPORT.md` | design_type=1 product `174951`; design_type=3 product `174952` | Details show returned `design_type=1` for both product detail responses; stable default should be `1`. |
| 7 | 生成设计产品 | PASS | `logs/supplier-single-store-20260607-161027/raw/create-product.json` | product `174935`, code `5BNFPM` | quickCreate created supplier product. |
| 8 | 获取设计产品详情 | PASS | `logs/supplier-single-store-20260607-161027/raw/product-detail.json` | status_text `上架`, show image exists | Product was ready enough for order creation. |
| 9 | 创建供应商订单 | PASS | `logs/supplier-single-store-20260607-161027/raw/create-order.json` | order `7116148`, external `citigoo-smoke-20260607-161027` | Duplicate external order guard not directly shown in final report; use idempotency locally. |
| 10 | 查询订单详情和费用 | PASS | `logs/supplier-single-store-20260607-161027/raw/order-detail.json` | product `1.78`, shipping `9.7`, discount `0`, total `11.48`, pay_status `待支付` | Currency absent; confirm with supplier. |
| 11 | 查询账户余额 | PARTIAL | `logs/supplier-phase3-manual-20260607-162522/raw/order-pay.json` | returned balance `0.00` after payment | No standalone balance API found in the 26 API snapshot. Use supplier backend or ask supplier. |
| 12 | 支付测试订单 | PASS | `logs/supplier-phase3-manual-20260607-162522/REPORT.md`, `raw/order-pay.json`, `raw/order-after-pay.json` | status_code `200`, pay_status `3`, status_text `审核中` | Manual payment only after amount confirmation. |
| 13 | 查询订单列表 | PASS | `logs/s2bdiy-order-list-20260608-161218/REPORT.md` | order `7116148`, pay_status_text `支付完成` | Query by `third_order_id` and `pay_status=3` succeeded. |
| 14 | 轮询订单状态 | PARTIAL | `logs/s2bdiy-order-polling-20260608-161241/REPORT.md` | status `3`, status_text `审核中`, tracking empty | Polling works; final shipment/tracking blocked by test environment review. |
| A | 物流方案 A 平台物流 | PARTIAL / BLOCKED | `logs/s2bdiy-order-polling-20260608-161241/REPORT.md`, `raw/order-poll-3.json` | logistics_platform `294`, logisticss_status `1`, track number empty | Platform logistics fields appear, but tracking not generated in test env. |
| B | 物流方案 B 上传自有面单 | NOT_TESTED | API documented in `docs/suppliers/s2bdiy-eolink-api-snapshot.md`; no waybill raw log present | N/A | Do not test until paid order + self-owned label approval + PDF/tracking fixture are ready. |
| - | 异常情况测试 | PARTIAL | `logs/s2bdiy-negative-20260608-161429/REPORT.md` and `raw/*.json` | wrong secret, missing auth, wrong token, nonexistent ids, invalid upload, wrong view, duplicate pay | Representative coverage is good; not every docx-listed error was tested. |

## 5. Key Test Artifacts and IDs

| Field | Value | Evidence |
|---|---|---|
| selected `basic_product_id` | `2864` | `logs/s2bdiy-basic-product-20260608-153055/REPORT.md` |
| selected basic product code | `46YNZD` | same |
| selected product name | `男款长袖-海外本土-RU215` / `Men's long sleeves` | same |
| selected `color_id` | Black = `5`, White = `6` | `logs/s2bdiy-basic-product-detail-20260608-155019/REPORT.md` |
| selected `size_id` | M = `21` | same |
| selected `view_id` | A面 / Front = `1` | `logs/s2bdiy-design-view-20260608-160601/REPORT.md` |
| selected `item_id` | `11548` | `logs/s2bdiy-basic-product-detail-20260608-155019/REPORT.md` |
| item code | `UQOW7A` | same |
| item weight/dimensions | weight `245`, L/W/H `20.00/20.00/10.00` | same |
| print area | width `449.20`, height `512.97` | same |
| primary `material_id` | `57655` | `logs/supplier-single-store-20260607-161027/REPORT.md` |
| material URL | `https://imagetest.s2bdiy.com/material/2026-06-07/6a2527890a001.png` | same |
| generated supplier `product_id` | `174935` | same |
| generated product code | `5BNFPM` | `logs/supplier-single-store-20260607-161027/raw/product-detail.json` |
| supplier order id | `7116148` | `logs/supplier-single-store-20260607-161027/REPORT.md` |
| external order id | `citigoo-smoke-20260607-161027` | same |
| payment time | `2026-06-07 16:25:55` | `logs/s2bdiy-order-list-20260608-161218/REPORT.md` |

## 6. Pricing and Payment Result

| Field | Before Payment | After Payment | Evidence |
|---|---:|---:|---|
| product_amount | `1.78` | `1.78` | `logs/supplier-single-store-20260607-161027/raw/order-detail.json`, `logs/supplier-phase3-manual-20260607-162522/raw/order-after-pay.json` |
| shipping_amount | `9.7` | `9.7` | same |
| discount_amount | `0` | `0` | same |
| total_amount | `11.48` | `11.48` | same |
| currency | `TODO_CONFIRM_WITH_SUPPLIER` | `TODO_CONFIRM_WITH_SUPPLIER` | no currency field observed |
| pay_status | `1` / `待支付` | `3` / `支付完成` | same |
| status | `2` / `未付款` | `3` / `审核中` | same |
| returned balance | N/A | `0.00` | `logs/supplier-phase3-manual-20260607-162522/raw/order-pay.json` |

Payment conclusion:

- Manual `POST /open/v1/orderPay` succeeded in the test environment.
- CitiGoo must keep create-order success and payment success as separate states.
- Duplicate payment must not be retried automatically; already-paid duplicate returned `status_code=403`, msg `无可支付订单`.

## 7. Logistics / Tracking Result

| Item | Result | Evidence | Notes |
|---|---|---|---|
| Logistics quote | PASS | `logs/supplier-single-store-20260607-161027/raw/logistics-calculation.json` | Report selected `logistics_platform_id=294`; quote amount recorded as `0.01`. |
| Platform logistics after payment | PARTIAL | `logs/supplier-phase3-manual-20260607-162522/raw/order-after-pay.json` | `order_logistics` exists after payment. |
| Tracking number | BLOCKED | `logs/s2bdiy-order-polling-20260608-161241/REPORT.md` | `logisticss_track_number` remained empty. |
| Waybill file URL | BLOCKED | `logs/s2bdiy-order-polling-20260608-161241/raw/order-poll-3.json` | `oss_file_src` remained empty. |
| Final fulfillment | BLOCKED | same | Supplier technical support confirmed test orders require manual review and are not currently processed. |
| Self-owned waybill upload | NOT_TESTED | no `order/{id}/logistics` raw log | Needs explicit approval, PDF fixture, and tracking number. |

S2BDIY technical confirmation:

```text
The test environment requires manual review and currently does not process test environment test orders. After payment, except for self-owned waybill upload, the main API flow is essentially complete. Final tracking should be verified in production after formal environment authorization.
```

## 8. Negative Test Result

| Case | Result | status | status_code | msg | uuid | Retry Policy |
|---|---|---|---:|---|---|---|
| wrong app_secret | PASS | error | `200304` | `AppKey与AppSecret异常` | `62a7328c-8d62-45b7-b357-4724a3831622` | Not retryable until credentials are fixed. |
| missing Authorization | PASS | error | `0` | `Unauthenticated.` | null | Not retryable until Authorization is present. |
| wrong token | PASS | error | `0` | `Unauthenticated.` | null | Refresh/fix token; retry once only after cache clear. |
| nonexistent basic_product_id | PASS | error | `0` | `No query results for model [App\\Models\\V1\\Basic\\BasicProduct] 999999999` | `6af31c31-6066-4227-9c6d-e191333792f6` | Not retryable until ID is corrected. |
| nonexistent product_id | PASS | error | `0` | `No query results for model [App\\Models\\V1\\Product\\Product] 999999999` | `c11988b6-a3ba-4eee-a105-1592cd9aeec7` | Not retryable until ID is corrected. |
| invalid material upload | PASS | error | `404` | `素材只支持jpg、jpeg、png格式的图片` | `2e8a936a-160d-4b26-8280-f119d185272c` | Not retryable until file type is corrected. |
| wrong view_id quickCreate | PASS | error | `0` | `Cannot use object of type Illuminate\\Http\\JsonResponse as array` | `0a0a6a81-71bf-492d-b69e-b65d3055a1b6` | Not retryable until view/color/size mapping is corrected. |
| duplicate orderPay | PASS | error | `403` | `无可支付订单` | `0df304c9-7b28-4970-adeb-c6921d12220b` | Do not retry automatically; check local payment state first. |

Untested negative cases from the original checklist include expired token, down/offline product, wrong color, wrong size, oversized image, invalid address, wrong country/postcode, quantity `0`, duplicate `third_order_id`, insufficient balance payment, and waybill-specific failures.

## 9. Known Limitations and Blockers

- Test environment fulfillment/tracking is blocked by S2BDIY manual review policy.
- No standalone balance API was found in the current 26-API snapshot.
- Currency is not present in observed order detail pricing responses.
- The selected basic product is apparel-like long sleeve rather than a literal short-sleeve T-shirt; it still exercises the required apparel/color/size/design/order path.
- The design mode test showed quickCreate success for `design_type=1` and `design_type=3`, but product detail reported `design_type=1` for both; confirm supplier semantics before exposing design mode options.
- Self-owned waybill upload has not been tested.
- The raw access-token file must remain local only; reports should continue to avoid full token fields.

## 10. Production Onboarding Checklist

1. Apply for formal production `app_key` and `app_secret`.
2. Confirm production Open API base URL.
3. Run production token smoke test only:
   `POST /open/v1/accessToken`.
4. Confirm `platform=99` / Other is suitable for an independent store.
5. Confirm whether CitiGoo will use platform logistics or self-owned waybill upload.
6. If using platform logistics, verify production tracking is generated automatically after paid order fulfillment.
7. If using self-owned waybill, prepare a test PDF and tracking number, then test `POST /open/v1/order/{id}/logistics` only with approval.
8. Confirm balance checking method: API or supplier web backend.
9. Confirm currency semantics for `product_amount`, `shipping_amount`, `discount_amount`, and `total_amount`.
10. Run one small production order end to end with human approval and strict amount confirmation.

## 11. Recommended Next Engineering Tasks

1. Wire the S2BDIY client into the CitiGoo backend production pipeline behind explicit store/supplier configuration.
2. Add a supplier token cache with refresh-before-expiry and one retry after 401.
3. Add order idempotency / duplicate order protection using CitiGoo order id as `third_order_id`.
4. Persist supplier order states separately:
   create status, payment status, production status, logistics/tracking status.
5. Add a polling job for `GET /open/v1/order/{id}` and/or order list sync.
6. Add status mapping from S2BDIY statuses to CitiGoo internal fulfillment states.
7. Add payment safety gates and human approval workflow; never equate create-order success with paid success.
8. Add error handling mapping for supplier `status_code` and `msg`.
9. Add structured raw response storage with secret/token redaction.
10. Add waybill upload support only if the business chooses self-owned logistics.

## 12. Appendix: Log Paths

Primary successful flow:

- `logs/supplier-single-store-20260607-160414/REPORT.md`
- `logs/supplier-single-store-20260607-160414/raw/access-token.json`
- `logs/supplier-single-store-20260607-160414/raw/basic-product-categorys.json`
- `logs/supplier-single-store-20260607-160414/raw/basic-products.json`
- `logs/supplier-single-store-20260607-160414/raw/basic-product-detail.json`
- `logs/supplier-single-store-20260607-160414/raw/upload-material.json`
- `logs/supplier-single-store-20260607-160414/raw/material-detail.json`
- `logs/supplier-single-store-20260607-160414/raw/create-product.json`
- `logs/supplier-single-store-20260607-160414/raw/product-detail.json`
- `logs/supplier-single-store-20260607-160414/raw/products.json`
- `logs/supplier-single-store-20260607-161027/REPORT.md`
- `logs/supplier-single-store-20260607-161027/raw/access-token.json`
- `logs/supplier-single-store-20260607-161027/raw/basic-product-categorys.json`
- `logs/supplier-single-store-20260607-161027/raw/basic-products.json`
- `logs/supplier-single-store-20260607-161027/raw/basic-product-detail.json`
- `logs/supplier-single-store-20260607-161027/raw/upload-material.json`
- `logs/supplier-single-store-20260607-161027/raw/material-detail.json`
- `logs/supplier-single-store-20260607-161027/raw/create-product.json`
- `logs/supplier-single-store-20260607-161027/raw/product-detail.json`
- `logs/supplier-single-store-20260607-161027/raw/products.json`
- `logs/supplier-single-store-20260607-161027/raw/shops.json`
- `logs/supplier-single-store-20260607-161027/raw/logistics-calculation.json`
- `logs/supplier-single-store-20260607-161027/raw/calculate-products.json`
- `logs/supplier-single-store-20260607-161027/raw/create-order.json`
- `logs/supplier-single-store-20260607-161027/raw/order-detail.json`
- `logs/supplier-single-store-20260607-161027/raw/orders.json`

Manual payment:

- `logs/supplier-phase3-manual-20260607-162522/REPORT.md`
- `logs/supplier-phase3-manual-20260607-162522/raw/order-before-pay.json`
- `logs/supplier-phase3-manual-20260607-162522/raw/order-pay.json`
- `logs/supplier-phase3-manual-20260607-162522/raw/order-after-pay.json`
- `logs/supplier-phase3-manual-20260607-162522/raw/order-after-pay-refresh-1.json`

Focused supplier checks:

- `logs/s2bdiy-basic-product-20260608-153055/REPORT.md`
- `logs/s2bdiy-basic-product-20260608-153055/raw/basic-products-page1.json`
- `logs/s2bdiy-basic-product-20260608-153055/raw/basic-products-tshirt.json`
- `logs/s2bdiy-basic-product-20260608-153055/raw/selected-basic-product.json`
- `logs/s2bdiy-basic-product-detail-20260608-155019/REPORT.md`
- `logs/s2bdiy-basic-product-detail-20260608-155019/raw/basic-product-detail.json`
- `logs/s2bdiy-design-view-20260608-160601/REPORT.md`
- `logs/s2bdiy-design-view-20260608-160601/raw/basic-product-detail.json`
- `logs/s2bdiy-design-mode-20260608-160903/REPORT.md`
- `logs/s2bdiy-design-mode-20260608-160903/raw/quickcreate-design-type-1.json`
- `logs/s2bdiy-design-mode-20260608-160903/raw/quickcreate-design-type-3.json`
- `logs/s2bdiy-design-mode-20260608-160903/raw/product-detail-design-type-1.json`
- `logs/s2bdiy-design-mode-20260608-160903/raw/product-detail-design-type-3.json`
- `logs/s2bdiy-order-list-20260608-161218/REPORT.md`
- `logs/s2bdiy-order-list-20260608-161218/raw/orders-by-third-order-id.json`
- `logs/s2bdiy-order-list-20260608-161218/raw/orders-pay-status-3.json`
- `logs/s2bdiy-order-polling-20260608-161241/REPORT.md`
- `logs/s2bdiy-order-polling-20260608-161241/raw/order-poll-1.json`
- `logs/s2bdiy-order-polling-20260608-161241/raw/order-poll-2.json`
- `logs/s2bdiy-order-polling-20260608-161241/raw/order-poll-3.json`

Negative tests:

- `logs/s2bdiy-negative-20260608-161429/REPORT.md`
- `logs/s2bdiy-negative-20260608-161429/raw/auth-wrong-secret.json`
- `logs/s2bdiy-negative-20260608-161429/raw/missing-authorization-basic-product.json`
- `logs/s2bdiy-negative-20260608-161429/raw/wrong-token-basic-product.json`
- `logs/s2bdiy-negative-20260608-161429/raw/basic-product-not-found.json`
- `logs/s2bdiy-negative-20260608-161429/raw/product-not-found.json`
- `logs/s2bdiy-negative-20260608-161429/raw/upload-not-image.json`
- `logs/s2bdiy-negative-20260608-161429/raw/quickcreate-wrong-view.json`
- `logs/s2bdiy-negative-20260608-161429/raw/orderpay-duplicate.json`

Reference documents:

- `docs/suppliers/s2bdiy-eolink-api-snapshot.md`
- `docs/suppliers/s2bdiy-single-store-test-plan.md`
- `docs/suppliers/s2bdiy-dry-run-script-design.md`
- `docs/suppliers/s2bdiy-api-contract-checklist.md`
- `docs/suppliers/s2bdiy-credentials-requirements.md`
- `/Users/Zhuanz/Downloads/一、必须测试的供应商功能.docx`
