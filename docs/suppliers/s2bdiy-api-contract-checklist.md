# S2BDIY API Contract Checklist

| API No. | Group | Function | Method | Path | Auth | Mutates State | Cost Risk | Safe for Dry-run | Required for Phase | Key Output Fields | Open Questions |
|---|---|---|---|---|---|---|---|---|---|---|---|
| API 01 | Material | Upload Material | POST | `/open/v1/material/uploadMaterial` | Bearer token likely required | Creates material asset | No direct charge known | Yes | Phase 1: Auth + Product Generation | `data.id`, `data.image_url`, `data.name` | Confirm duplicate upload behavior and exact max file size in live account. |
| API 02 | Logistics | Calculate Products | GET | `/open/v1/calculateProducts` | Bearer token likely required | No | No direct charge | Yes, read-only quote | Phase 2: Unpaid Order + Pricing | `data[].logistics_platform_id`, `amount`, `min_amount`, `max_amount` | Eolink says GET but shows JSON body; confirm query-vs-body format. Uses `product_id + stock_sku_item_id`, unlike Create Order. |
| API 03 | Design SDK | Get Design SDK | GET | `/singleDesign` | TODO_CONFIRM_WITH_SUPPLIER | No backend mutation, may expose design session | No direct charge known | No for backend dry-run | Optional | SDK URL/session fields | Snapshot lacks request/response examples and fields; browser/callback behavior is TODO_FROM_EOLINK. |
| API 04 | Basic product | Get Basic Product Detail | GET | `/open/v1/basicProduct/{id}` | Bearer token likely required | No | No | Yes | Phase 1: Auth + Product Generation | `data.id`, `colors[]`, `sizes[]`, `items[]`, `views[]`, `print_areas[]`, `purchase_price` | Confirm whether `items[].id` is `stock_sku_item_id` for quote APIs. |
| API 05 | Auth | Get Authorization / Access Token | POST | `/open/v1/accessToken` | App key + app secret | No | No | Yes | Phase 1: Auth + Product Generation | `data.token` or `data.access_token`, expiry fields if present | Confirm exact expiry; current backend caches for 2.5 days to refresh before presumed 3-day expiry. |
| API 06 | Account | Create Child User | POST | `/open/v1/childUser` | Bearer token | Creates account/user state | No direct charge known, high account risk | No | Do Not Auto-run | child user id/status | High-risk account mutation; requires explicit human approval and supplier confirmation. |
| API 07 | Basic product | Get Basic Products | GET | `/open/v1/basicProduct` | TODO_FROM_EOLINK | No | No | Yes after auth confirmed | Phase 1: Auth + Product Generation | basic product list ids/names/categories/prices/images | Snapshot entry is incomplete and missing most required sections; fill from Eolink export before implementation. |
| API 08 | Basic product | Get Basic Product Categories | GET | `/open/v1/basicProduct/categorys` | Bearer token likely required | No | No | Yes | Phase 1: Auth + Product Generation | category ids/names | Spelling is `categorys`; confirm path and pagination/filter fields. |
| API 09 | Material | Get Materials | GET | `/open/v1/material` | Bearer token | No | No | Yes, read-only | Optional | material ids, names, image URLs | Confirm pagination and whether list includes uploaded dry-run material immediately. |
| API 10 | Material | Get Material Detail | GET | `/open/v1/material/{id}` | Bearer token | No | No | Yes, read-only | Phase 1: Auth + Product Generation | material id/name/image URL | Confirm invalid material error shape. |
| API 11 | Store | Get Shops | GET | `/open/v1/store` | Bearer token | No | No | Yes, read-only | Phase 2: Unpaid Order + Pricing | `data[].id`, shop name/platform/status | Confirm which shop id should be used for CitiGoo dry-run. |
| API 12 | Store | Create Shop | POST | `/open/v1/store` | Bearer token | Creates supplier shop/account state | No direct charge known, high account risk | No | Do Not Auto-run | `data.id` | High-risk state mutation; prefer existing shop from API 11. |
| API 13 | Logistics | Calculate Logistics Costs | GET | `/open/v1/logisticsCalculation` | Bearer token | No | No direct charge | Yes, quote only | Phase 2: Unpaid Order + Pricing | `data[].logistics_platform_id`, `amount`, `min_amount`, `max_amount` | Logistics quote is only an estimate; final payable amount comes from order detail. |
| API 14 | Product | Create Product / quickCreate | POST | `/open/v1/product/quickCreate` | Bearer token likely required | Creates designed supplier product | Likely no charge, but creates supplier resource | Yes only after supplier confirms product creation is free | Phase 1: Auth + Product Generation | `data.product_id`, `product_name`, `product_code` | Confirm generation is free, duplicate behavior, and sync-vs-async readiness. |
| API 15 | Product | Get Batch Designs | GET | `/open/v1/batchDesign` | Bearer token | No | No | Yes, read-only | Optional | batch design status/counts | Not required for single-product dry-run. |
| API 16 | Order | Update Order Address and Logistics Channel | POST | `/open/v1/order/updateOrderLogistics/{order_id}` | Bearer token | Mutates supplier order address/logistics | May change payable shipping amount | No by default | Phase 4: Fulfillment / Tracking | updated order id, third order id | Only test on unpaid dry-run order with explicit approval. |
| API 17 | Product | Get Product Detail | GET | `/open/v1/product/{id}` | Bearer token likely required | No | No | Yes, read-only | Phase 1: Auth + Product Generation | product id, variants, show images/mockups, orderable/status fields | Confirm product readiness/orderable status field names. |
| API 18 | Logistics | Get Available Logistics for the Order | GET | `/open/v1/logistics/orderLogistics` | Bearer token | No | No | Yes, read-only after order exists | Phase 4: Fulfillment / Tracking | logistics options for order | Confirm whether safe before payment and whether it can be used to fix unpayable orders. |
| API 19 | Order | Upload Order Logistics Waybill | POST | `/open/v1/order/{id}/logistics` | Bearer token | Mutates paid order logistics/tracking | No direct charge, but requires paid order | No | Phase 4: Fulfillment / Tracking | upload status, tracking number, UUID | High-risk fulfillment mutation; Eolink shows file params but JSON example, confirm content type. |
| API 20 | Product | Copy Product | POST | `/open/v1/product/{id}/copy` | Bearer token likely required | Creates supplier product copy | Likely no charge, resource mutation | No | Do Not Auto-run | copied product id | Not needed for MVP; can create duplicate products. |
| API 21 | Product | Get Products | GET | `/open/v1/product` | Bearer token | No | No | Yes, read-only | Phase 1: Auth + Product Generation | product ids, product status/list data | Use to verify generated product appears by id/list; confirm filters. |
| API 22 | Order | Pay Orders | POST | `/open/v1/orderPay` | Bearer token | Mutates payment and production state | Yes, high risk balance deduction | No | Phase 3: Payment | payment result status/UUID | Must be gated by `SUPPLIER_ALLOW_PAYMENT=true`, `S2BDIY_TEST_MODE=true`, `HUMAN_APPROVED_PAYMENT=true`, confirmed test environment, sufficient balance, confirmed total amount. |
| API 23 | Order | Get Order Detail | GET | `/open/v1/order/{id}` | Bearer token | No | No | Yes, read-only | Phase 2: Unpaid Order + Pricing | `data.id`, `third_order_id`, `pay_status`, `status`, `product_amount`, `shipping_amount`, `discount_amount`, `total_amount`, `order_items[]`, `order_logistics` | Snapshot uses `Key Pricing Fields` instead of exact `Success Response Fields`; add canonical section if editing snapshot. |
| API 24 | Order | Get Orders | GET | `/open/v1/order` | Bearer token | No | No | Yes, read-only | Phase 2: Unpaid Order + Pricing | order list, `third_order_id`, statuses, pricing fields if present | Confirm filters for `third_order_id`, status, time, pagination, sorting. |
| API 25 | Order | Create Order | POST | `/open/v1/order` | Bearer token | Creates supplier order | Likely no charge until `orderPay`, but must confirm | Yes only after supplier confirms create-order is unpaid | Phase 2: Unpaid Order + Pricing | `data.id`, `data.third_order_id`, UUID | Critical mapping: Create Order uses `product_id + size_id + color_id`, not `stock_sku_item_id`. Must query API 23 for final payable amount. |
| API 26 | Order | Cancel an Order | DELETE | `/open/v1/order/{id}` | Bearer token likely required | Mutates supplier order state | No direct charge, but changes order state | No by default | Do Not Auto-run | cancelled order id/status | Only optional cleanup with `SUPPLIER_ALLOW_CANCEL_DRY_RUN_ORDER=true` and unpaid current-run order. |

## High-risk Endpoints

These endpoints must not run automatically in the default supplier dry-run:

- `POST /open/v1/orderPay`
- `POST /open/v1/order/{id}/logistics`
- `POST /open/v1/childUser`
- `POST /open/v1/store`
- `POST /open/v1/product/{id}/copy`
- `DELETE /open/v1/order/{id}`

## Snapshot Audit Notes

- API numbering is continuous from API 01 to API 26.
- Most APIs include the required contract sections, but API 07 is incomplete and must be filled from Eolink before implementation.
- Several APIs use section names such as `Request Parameters`, `Query Parameters`, `Path Parameters`, or `Request Body Parameters` rather than an exact `Params` heading.
- API 02 has a method/body ambiguity: Eolink marks it as `GET` while showing a JSON object request.
- API 19 has a content-type ambiguity: parameter table suggests multipart PDF upload, while Eolink example shows JSON `ids`.
- Create Order is correctly documented as using `product_id + size_id + color_id`, not `stock_sku_item_id`.
- Final payable amount must come from `GET /open/v1/order/{id}` fields `product_amount`, `shipping_amount`, `discount_amount`, and `total_amount`; logistics APIs are estimates only.
- `POST /open/v1/orderPay` is correctly gated and must be skipped by default.
