# Buyer Refund / Cancel Gap Audit

Date: 2026-06-18
Branch: `feature/buyer-frontend-integration`

## 1. Executive Summary

Batch 12 is an audit-only pass. No buyer cancel/refund API is implemented in this batch.

Current buyer order capabilities are:

- Guest single-order lookup/detail/tracking with `email + display_id` or `order_id + matching email`.
- Authenticated customer order list/detail/tracking with customer identity from `req.auth_context.actor_id`.
- Store isolation through `X-Store-Id` and order metadata/store helpers.
- Real cart complete for both non-shipping and shippable checkout flows.

Current cancel/refund capabilities are not buyer-ready:

- Medusa has Admin workflows for order cancel, fulfillment cancel, and payment refund.
- This project does not yet expose safe Store API buyer routes for cancel or refund.
- Current local checkout uses `pp_system_default` by default, and custom code marks local orders as paid/waiting after complete. That is sufficient for buyer demo order visibility, but it is not proof of real funds movement or real refund support.
- Supplier/POD cancellation is not wired. Order cancel does not automatically mean supplier order cancel.

Recommendation:

- Do not enable buyer-visible Cancel or Refund buttons yet.
- Next safe batch should be `Batch 12A - Unpaid/unfulfilled authenticated cancellation`, and only if the order has no captured payment, no Medusa fulfillment, no supplier order, and official Medusa cancel workflow succeeds.
- Refund should start as `Batch 12B - Refund request workflow`, not direct buyer-executed refund.

## 2. Current Capability

### Existing Buyer APIs

| Capability | Route | Status | Security model |
|---|---|---:|---|
| Guest lookup | `GET /store/orders/lookup?email=...&display_id=...` | Ready | Email + display id + store isolation |
| Guest/auth detail | `GET /store/orders/:id/detail?email=...` | Ready | Auth customer id if logged in; otherwise matching email |
| Guest/auth tracking | `GET /store/orders/:id/tracking?email=...` | Ready | Auth customer id if logged in; otherwise matching email |
| Auth order history | `GET /store/customers/me/orders` | Ready | `req.auth_context.actor_id` + store isolation |
| Buyer cancel | none | Missing | Not implemented |
| Buyer refund | none | Missing | Not implemented |
| Buyer refund request | none | Missing | Not implemented |

### Existing Medusa Admin / Workflow Capability

| Capability | Evidence | Notes |
|---|---|---|
| Cancel order workflow | `cancelOrderWorkflow` is used by Medusa Admin `POST /admin/orders/:id/cancel` | Cancels uncaptured payments, refunds captured payments, deletes reservations, and marks order canceled when allowed. Buyer wrapper does not exist. |
| Cancel fulfillment workflow | `cancelOrderFulfillmentWorkflow` exists and rejects shipped fulfillments | Buyer wrapper does not exist. It must not be used without ownership and store checks. |
| Refund payment workflow | `refundPaymentWorkflow` is used by Medusa Admin `POST /admin/payments/:id/refund` | Requires a payment id and provider support. Buyer direct execution is not safe by default. |
| Refund reasons | Medusa Admin refund reason routes exist | No buyer refund-request model exists yet. |

## 3. Order State Matrix

Status fields currently used by buyer pages:

- `order.status`: native Medusa order status.
- `order.metadata.payment_status`: custom display value such as `pending` or `paid`.
- `order.metadata.mc_fulfillment_status`: custom fulfillment stage such as `none`, `waiting`, `pushed`, or `shipped`.
- `order.canceled_at`: native cancellation timestamp when present.
- Payment collection/payment/capture/refund records: not exposed through current buyer Store API.
- Fulfillment order rows: custom `fulfillment_order` module with `pending_capture`, `waiting`, `pushed`, `fulfilled`, `failed`, `canceled`.
- Shipment rows: custom `shipment` module with `pending`, `shipped`, `delivered`.

| Order state | Payment state | Fulfillment state | Cancel allowed | Refund allowed | Notes |
|---|---|---|---:|---:|---|
| pending | unpaid / no capture | unfulfilled / no supplier order | Potentially yes | No | Best candidate for Batch 12A if Medusa workflow succeeds and inventory reservation release is verified. |
| pending | paid | unfulfilled | Not yet | Not yet | Requires refund workflow/provider validation before cancel. |
| completed | paid | waiting | Not safe | Not safe | Medusa cancel workflow rejects completed orders; use return/refund/request flow instead. |
| completed | paid | pushed | Not safe | Request only | Supplier order may already exist; needs supplier cancellation policy. |
| completed | paid | shipped | No | Request/return only | Fulfillment cancellation rejects shipped fulfillments. |
| cancelled | any | any | Idempotent no-op or 409 | Depends on previous refund state | Must not repeat provider operations. |
| any | refunded | any | No direct cancel | Already refunded | UI may show status only. |
| any | partially_refunded | any | No direct cancel | Additional refund requires provider/admin policy | Needs partial refund accounting. |
| any | failed payment | unfulfilled | Potentially yes | No | Needs payment session cleanup and reservation release. |
| any | no payment provider | unfulfilled | Potentially yes | No | Only safe if no captured payment and no fulfillment/supplier order. |
| any | manual/system paid | unfulfilled | Not yet | Request only | Current local paid status may be demo/manual, not real card funds. |
| guest order | any | any | Not supported | Not supported | Guest action needs OTP/signed token, not plain email. |
| authenticated order | any | any | Only after state guards | Only after state guards | Ownership must be `order.customer_id === auth_context.actor_id`. |

## 4. Payment Provider Audit

Current runtime/provider observations:

- Checkout complete defaults to `pp_system_default` when no `payment_provider_id` is supplied.
- `medusa-config.ts` only registers Stripe if `STRIPE_API_KEY` is present.
- Local docs/tests use `pp_system_default` for Phase 1 demo checkout.
- `sync-order-paid-fulfillment.ts` marks custom metadata `payment_status=paid` and `mc_fulfillment_status=waiting` after non-Stripe complete.
- The custom paid sync is display/workflow glue for local buyer demo. It is not proof that a real external payment provider captured funds.

Provider capability conclusion:

| Capability | Current conclusion |
|---|---|
| Real card refund | Not verified |
| Manual/system refund | Not safe to call buyer-side as "money returned" |
| Capture | Medusa Admin payment capture workflow exists, but buyer flow does not expose explicit capture |
| Cancel authorization | Medusa cancel workflow can cancel uncaptured payments, but buyer wrapper is missing |
| Partial refund | Medusa refund workflow accepts optional `amount`, but provider/accounting validation is not buyer-ready |
| Webhook/state sync | Stripe capture sync path exists conceptually, but not verified for local buyer runtime |

Refund copy must therefore say `Request refund`, not `Refund now`, until a real provider path is verified.

## 5. Fulfillment Audit

Current fulfillment pieces:

- Medusa fulfillment workflows exist, including `cancelOrderFulfillmentWorkflow`.
- Project has a custom `fulfillment_order` module:
  - statuses: `pending_capture`, `waiting`, `pushed`, `fulfilled`, `failed`, `canceled`
  - tracks `supplier_order_id`, `payload`, `pushed_at`, `failed_reason`
- Project has a custom `shipment` module:
  - statuses: `pending`, `shipped`, `delivered`
  - tracks carrier, tracking number, tracking URL, shipped/delivered timestamps
- S2BDIY sync maps supplier statuses including `cancelled`, `shipped`, and production-ish states into local fulfillment/shipment rows.

Important separation:

`Order cancel != Fulfillment cancel != Supplier order cancel`

Open fulfillment gaps:

- No buyer route cancels a custom `fulfillment_order`.
- No buyer route cancels a supplier/S2BDIY order.
- No policy decides whether POD production can still be canceled after `waiting` or `pushed`.
- No return flow exists for shipped items.
- No inventory/reservation release has been verified for buyer-owned orders.

## 6. Cancel Workflow Audit

Medusa `cancelOrderWorkflow` behavior from installed code:

- Rejects an already canceled order.
- Rejects `COMPLETED` orders with a message directing callers to return/refund/exchange.
- Rejects orders with non-canceled fulfillments.
- Refunds captured payments through a nested refund workflow.
- Cancels uncaptured payments.
- Deletes reservations for line items.
- Sets payment collection status to canceled.
- Marks the order canceled.

### Cancel Before Payment

Potentially safe only when all are true:

- Authenticated customer owns the order.
- Order belongs to current store.
- Order is not completed.
- No captured payment exists.
- No Medusa fulfillment exists, or all fulfillments are canceled.
- No custom `fulfillment_order` has been pushed to supplier.
- No supplier order id exists.
- Official Medusa cancel workflow succeeds.

This is a candidate for Batch 12A.

### Cancel After Payment Before Fulfillment

Not safe yet.

Reasons:

- Medusa cancel may refund captured payments, but buyer route must prove payment provider refund support.
- `pp_system_default` local paid state is not a real external payment refund.
- Custom fulfillment rows may already be `waiting`.
- Supplier/POD cancellation policy is not defined.

### Cancel After Fulfillment / Shipped

Not safe.

Reasons:

- Medusa fulfillment cancel workflow rejects shipped fulfillments.
- Shipped orders should go through return/refund workflow, not direct cancel.
- Current buyer UI has no return flow.

### Suggested Future Cancel API

Only after Batch 12A guard work:

```http
POST /store/customers/me/orders/:id/cancel
```

Required checks:

- `x-publishable-api-key`
- `X-Store-Id`
- valid customer session
- `order.customer_id === req.auth_context.actor_id`
- `readOrderStoreId(order) === current store`
- no frontend `customer_id`
- idempotent duplicate handling
- status/payment/fulfillment/supplier guards
- official workflow invocation only after guards pass

Guest cancel should not be opened with email-only access.

## 7. Refund Workflow Audit

Medusa `refundPaymentWorkflow` behavior from installed code:

- Loads the payment, captures, and existing refunds.
- Validates refund amount does not exceed captured amount.
- Calls payment provider refund step.
- Looks up the order payment collection.
- Writes order transaction lines for refunds.
- Creates order refund credit lines when applicable.
- Emits a payment refunded event.

### Real Payment Refund

Not buyer-ready.

Required before enabling:

- Payment collection and payment id exposed internally to a secure backend action.
- Successful capture exists.
- Provider supports refund in runtime.
- Provider failure leaves order/payment state unchanged or clearly failed.
- Refund records and order transaction records are verified.
- Store/customer isolation and idempotency are tested.

### Manual / Offline Refund

Current local/system provider should be treated as offline/manual for buyer UX.

Safe UX:

- Buyer can submit a `Refund request`.
- Admin/operator reviews and executes refund outside buyer runtime.
- UI shows `Request submitted` or `Pending review`, not `Refunded`.

Unsafe UX:

- Do not show `Refund now`.
- Do not show `Refund completed` unless provider/workflow confirms it.
- Do not mutate order metadata to `refunded` without provider/refund record.

### Suggested Future Refund Request API

Preferred before real provider refund:

```http
POST /store/customers/me/orders/:id/refund-request
```

Suggested body:

```json
{
  "reason": "string",
  "items": [
    { "line_item_id": "string", "quantity": 1 }
  ],
  "note": "string"
}
```

This should create a request record, not a payment refund.

## 8. Security Model

Any future cancel/refund API must follow the authenticated order model:

1. Customer identity comes only from `req.auth_context.actor_id`.
2. Order ownership is `order.customer_id === actor_id`.
3. Store isolation uses `X-Store-Id` and trusted order store metadata/helper.
4. Frontend must not pass `customer_id`.
5. Email must not be used as authenticated ownership.
6. Guest order lookup remains single-order only.
7. Guest cancel/refund needs OTP or signed expiring token; plain email is insufficient.
8. Operation must be idempotent.
9. Logs must not print tokens, cookies, full addresses, or payment secrets.
10. Backend errors must not be converted into fake success.

## 9. Frontend UI Audit

Current buyer order detail actions:

- `Track order`
- `Back to store`
- `Search another order`

Current order history cards:

- `View order`
- `Track order`

No buyer-facing Cancel order, Request refund, Return item, Reorder, or Download invoice action is currently enabled on order detail/history.

| Action | Currently visible | Real API exists | State guard exists | Safe to enable | Recommendation |
|---|---:|---:|---:|---:|---|
| Cancel order | No | No buyer API | No | No | Hide until Batch 12A. |
| Request refund | No | No | No | No | Add only after refund-request backend exists. |
| Contact support | Footer/help links exist | Static only | N/A | Yes | Use as fallback copy for paid/shipped cases. |
| Track order | Yes | Yes | Yes | Yes | Keep enabled. Missing shipment fields show Not available. |
| Reorder | No | No | No | No | Out of scope. |
| Download invoice | No | No | No | No | Out of scope. |
| Return item | No | No | No | No | Out of scope until return flow exists. |

UI rule:

- If no real API exists, do not show a successful toast.
- Prefer hidden action or disabled action with `Not available yet`.
- For refund, use `Request refund` terminology unless provider refund is truly executed.

## 10. API Gap Matrix

| Capability | Existing backend | Existing frontend | Provider support | Security ready | Runtime verified | Gap |
|---|---:|---:|---:|---:|---:|---|
| Cancel unpaid order | Admin workflow only | No | N/A | No buyer wrapper | No | Need authenticated route + guards + tests |
| Cancel paid unfulfilled order | Admin workflow may refund | No | Not verified | No buyer wrapper | No | Needs provider refund validation |
| Cancel fulfilled order | Workflow rejects active fulfillments/shipped | No | N/A | No | No | Should route to return/refund request |
| Cancel fulfillment | Admin workflow only | No | Fulfillment provider dependent | No buyer wrapper | No | Needs fulfillment id and supplier policy |
| Release inventory | Medusa cancel workflow deletes reservations | No | N/A | No buyer wrapper | No | Need runtime proof for buyer orders |
| Full refund | Admin payment workflow only | No | Not verified for `pp_system_default` as real money | No | No | Needs payment id mapping + provider proof |
| Partial refund | Admin payment workflow accepts amount | No | Not verified | No | No | Needs item/amount accounting |
| Refund request | No | No | N/A | Not yet | No | Recommended Batch 12B |
| Refund status display | Metadata helpers support limited payment strings | No full refund model | N/A | Partial | No | Need real refund records/status mapping |
| Guest cancel | No | No | N/A | No | No | Requires OTP/signed token |
| Authenticated cancel | No | No | N/A | Model ready, route missing | No | Candidate Batch 12A |
| Admin approval | Medusa admin has refund/cancel actions | No buyer request queue | Admin-only | Admin auth only | Not buyer runtime | Need request model |
| Supplier cancellation sync | No buyer path | No | S2BDIY policy unknown | No | No | Need supplier API/policy audit |
| Return flow | Medusa admin return workflows exist | No | Provider/logistics dependent | No | No | Out of current scope |

## 11. Design Gap

Scanned design files with order-related names:

- `designs/buyer-ui/订单/订单详情页.png`
- `designs/buyer-ui/订单/订单详情页-1.png`
- `designs/buyer-ui/订单/物流追踪页.png`
- `designs/buyer-ui/订单/Body*.png`
- `designs/buyer-ui/订单/Overlay+OverlayBlur*.png`
- `designs/buyer-ui/订单详情页面/Group 83.png`
- `designs/buyer-ui/订单详情页面/Group 84.png`
- `designs/buyer-ui/订单详情页面/Group 85.png`
- `designs/buyer-ui/订单详情页面/Group 86.png`

No filename explicitly identifies:

- Cancel order modal
- Refund request modal
- Return item flow
- Refund success/failure state
- Cancel reason form

Potentially reusable patterns:

- `Overlay+OverlayBlur*.png` may be modal/overlay references, but they are not named as refund/cancel-specific.
- Existing order detail/tracking layouts can host future action cards without a page redesign.

Missing UI components for future batches:

- Cancel confirmation modal
- Cancel reason textarea
- Refund request modal
- Refund reason selector
- Optional item/quantity selector
- Pending review state
- Unsupported action state
- Provider/workflow error state

## 12. Runtime Evidence

This audit uses the latest completed buyer integration runtime facts from Batch 5-11.

Known completed orders:

| Sample | order_id | display_id | customer_id | store_id | payment status | fulfillment status | payment provider | cancel possible | refund possible | Reason |
|---|---|---:|---|---|---|---|---|---:|---:|---|
| Non-shipping early smoke | `order_01KV7B2G9WTKBG34VSS1N3FJ97` | 62 | null | `default_store` | paid | waiting | `pp_system_default` | No | No | Email/customer missing; demo provider; no buyer action route |
| Contact persistence smoke | `order_01KV7MNM9RCGWQJVSJ4GAPDKV0` | 63 | null | `default_store` | paid | waiting | `pp_system_default` | No | Request-only later | Guest email lookup works; no guest cancel/refund model |
| Guest shippable smoke | `order_01KVCQGGD8Z9MSQF3RW77RVMA3` | 69 | null | `default_store` | paid | waiting | `pp_system_default` | No | Request-only later | Guest order; shippable; no guest action auth |
| Auth shippable smoke | `order_01KVCQP5W3ZX5F2DBEFE2RKKX3` | 70 | `cus_01KVCQP4NAPD3NHT8E7EH6DXN7` | `default_store` | paid | waiting | `pp_system_default` | Not yet | Request-only later | Auth ownership/list/detail verified; paid demo provider |
| Auth detail smoke | `order_01KVCQSAK0VJ02DDMTH52CA987` | 71 | `cus_01KVCQS7MH12D4S355D5GVJPWQ` | `default_store` | paid | waiting | `pp_system_default` | Not yet | Request-only later | Auth detail verified without email query |

Limitations:

- This Batch 12 pass did not re-run read-only SQL because local elevated database access was blocked by the execution environment.
- Existing Batch 11 runtime docs still contain an earlier note saying final shippable complete needed re-run. The latest runtime confirmation from the integration thread supersedes that note: shippable authenticated orders with display ids 70/71 are visible in authenticated order list/detail.
- No unpaid order sample was confirmed in this audit. That is required before implementing unpaid cancellation.
- No fulfilled/shipped order sample was confirmed in this audit. Tracking currently supports empty or unavailable shipment fields.

## 13. Safe Implementation Scope

### Safe to implement now, after one more targeted smoke

`Batch 12A - Unpaid/unfulfilled authenticated cancellation`

Allowed only if all are true:

- Customer is authenticated.
- Order belongs to current customer.
- Order belongs to current store.
- Order is not completed.
- No captured payment exists.
- No active Medusa fulfillment exists.
- No custom fulfillment order has `supplier_order_id`.
- No custom fulfillment order is `pushed` or `fulfilled`.
- Official `cancelOrderWorkflow` succeeds.

### Requires provider/backend work

- Paid order cancellation with automatic refund.
- Full refund.
- Partial refund.
- Refund by item/quantity.
- Shipping fee/tax refund accounting.
- Provider webhook refund state sync.
- Supplier order cancellation.
- Inventory restoration proof for buyer orders.

### Recommended request-only path

`Batch 12B - Refund request workflow`

- Create refund request record.
- Require authenticated ownership.
- Capture reason and optional item/quantity selection.
- Admin/operator reviews.
- UI says `Pending review`.
- No provider refund is executed automatically.

### Out of scope

- Chargebacks/disputes.
- Full return logistics.
- Automatic supplier compensation.
- Cross-border refund settlement.
- Reorder.
- Invoice download.

## 14. Recommended Next Batch

Recommended split:

1. `Batch 12A - Unpaid/unfulfilled cancellation`
   - Build authenticated-only route and action guard.
   - Add UI disabled/hidden action states.
   - Verify one unpaid order.
2. `Batch 12B - Refund request workflow`
   - Buyer request record and admin review gap.
   - No real refund execution.
3. `Batch 12C - Real payment refund integration`
   - Stripe/provider runtime, capture/refund records, webhook sync.
4. `Batch 12D - Return / supplier cancellation`
   - Supplier cancellation rules, return states, shipment/return tracking.

## 15. Risks

- Treating `pp_system_default` as real payment can mislead buyers about refund completion.
- Calling Medusa cancel workflow on paid orders can attempt refunds without a verified provider path.
- Canceling a Medusa order does not necessarily cancel a supplier/POD order.
- Guest cancel/refund using only email would allow weak order operation access.
- Frontend success toasts without backend confirmation would create false financial state.
- Store isolation must not rely on frontend-provided store/customer identifiers.
- Existing custom metadata payment/fulfillment statuses are display-oriented and should not be the only source of refund/cancel truth.

