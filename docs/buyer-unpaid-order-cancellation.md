# Buyer Unpaid / Unfulfilled Order Cancellation

Date: 2026-06-18
Branch: `feature/buyer-frontend-integration`

## 1. Scope

Batch 12A implements a strictly limited buyer cancellation flow:

`authenticated buyer + owns order + same store + unpaid + unfulfilled + no captured payment + no fulfillment records -> cancel`

This batch does not implement:

- paid order cancellation
- payment refund
- partial refund
- refund request
- return flow
- supplier cancellation
- guest cancellation
- admin approval flow
- shipped/fulfilled order cancellation

## 2. Eligibility Rules

The backend uses a single cancellation eligibility helper.

Allowed only when all are true:

- request has `x-publishable-api-key`
- request has `X-Store-Id`
- request has authenticated customer session
- `order.customer_id === req.auth_context.actor_id`
- order store matches current store
- order is not already cancelled
- order is not completed or terminal
- payment relation state is reliably loaded
- payment status is unpaid/pending/awaiting or an empty status on a loaded payment state
- no payment captures exist
- no successful/captured/authorized payment record exists
- fulfillment relation state is reliably loaded
- fulfillment status is none/not fulfilled/unfulfilled or an empty status on a loaded fulfillment state
- no native Medusa fulfillment records exist
- no custom `fulfillment_order` records exist

Denied states return explicit codes:

- `ORDER_NOT_FOUND`
- `ORDER_ACCESS_DENIED`
- `ORDER_WRONG_STORE`
- `ORDER_ALREADY_CANCELLED`
- `ORDER_NOT_CANCELLABLE`
- `ORDER_PAYMENT_CAPTURED`
- `ORDER_ALREADY_PAID`
- `ORDER_HAS_FULFILLMENT`
- `ORDER_ALREADY_FULFILLED`
- `ORDER_CANCEL_REASON_INVALID`
- `ORDER_CANCEL_REASON_TOO_LONG`
- `ORDER_CANCEL_WORKFLOW_ERROR`

The helper intentionally does not use email as ownership proof.

## 3. API Contract

### POST `/store/customers/me/orders/:id/cancel`

Headers:

- `x-publishable-api-key`
- `X-Store-Id`
- authenticated customer session cookie

Request body:

```json
{
  "reason": "Ordered by mistake"
}
```

`reason` is optional, trimmed, capped at 500 characters, and rejects HTML-like `<` / `>` characters.

Success:

```json
{
  "order": {
    "id": "order_...",
    "display_id": 123,
    "status": "cancelled",
    "payment_status": "pending",
    "fulfillment_status": "none",
    "cancelled_at": "2026-06-18T08:00:00.000Z"
  },
  "cancelled": true,
  "cancellation": {
    "allowed": false,
    "code": "ORDER_ALREADY_CANCELLED",
    "message": "This order has already been cancelled."
  }
}
```

Idempotent already-cancelled response:

```json
{
  "order": {},
  "cancelled": true,
  "already_cancelled": true,
  "cancellation": {
    "allowed": false,
    "code": "ORDER_ALREADY_CANCELLED",
    "message": "This order has already been cancelled."
  }
}
```

Business rejection:

```json
{
  "error": {
    "code": "ORDER_ALREADY_PAID",
    "message": "Paid orders require a refund request instead of cancellation."
  },
  "cancellation": {
    "allowed": false,
    "code": "ORDER_ALREADY_PAID",
    "message": "Paid orders require a refund request instead of cancellation."
  }
}
```

## 4. Security Model

- Customer identity comes only from `req.auth_context.actor_id`.
- Frontend never sends customer id.
- Email is not an authenticated ownership fallback.
- Store isolation uses `X-Store-Id` plus order store metadata/helper.
- Guest order detail never receives an actionable cancellation state.
- Paid or fulfilled orders fail closed.
- Internal workflow errors return `500` with a stable code and do not expose stack traces.

## 5. State Transitions

Allowed transition:

`pending/unpaid/unfulfilled -> cancelled`

Disallowed transitions in this batch:

- `paid -> cancelled`
- `captured -> cancelled`
- `fulfilled -> cancelled`
- `shipped -> cancelled`
- `guest -> cancelled`

The route calls Medusa official `cancelOrderWorkflow`. It does not directly update the order table, payment state, or inventory.

## 6. UI Behavior

Order detail response now includes:

```json
{
  "cancellation": {
    "allowed": true,
    "code": null,
    "message": null
  }
}
```

Frontend rules:

- Authenticated detail shows `Cancel order` only when backend returns `cancellation.allowed=true`.
- Guest detail does not show cancel.
- Paid/fulfilled/unsupported orders show no active cancel button.
- Confirmation modal includes an optional reason field.
- Duplicate submit is prevented while submitting.
- Success updates current order detail to cancelled and hides the button.
- No refund success copy is shown.

## 7. Runtime Evidence

Batch 12A now includes a local smoke setup script for creating a real unpaid/unfulfilled authenticated order sample:

```bash
XDG_CONFIG_HOME="$PWD/.tmp/medusa-config" \
BATCH12A_CANCEL_SMOKE_ENABLED=true \
BATCH12A_CUSTOMER_EMAIL=sijingtamctsy@gmail.com \
BATCH12A_CANCEL_SMOKE_VARIANT_ID=variant_01KTKH18WFHSGH5MXG2YG74PXM \
npm --workspace apps/medusa-backend exec -- \
medusa exec ./src/scripts/batch12a-cancel-smoke-setup.ts
```

The script uses official Medusa cart/update/complete workflows plus module services. It does not call the project paid-sync helper, does not create fulfillment records, and fails if the completed order is not cancellable.

Latest local DB evidence:

- Medusa v2 order line data is connected through `order_item.order_id` and `order_item.item_id -> order_line_item.id`; `order_line_item.order_id` is not the correct shape.
- Batch 11 successful shippable orders `order_01KVCQGGD8Z9MSQF3RW77RVMA3`, `order_01KVCQP5W3ZX5F2DBEFE2RKKX3`, and `order_01KVCQSAK0VJ02DDMTH52CA987` used `sales_channel_id=sc_01KRECKG3QNQS36N4X1QGVRDVY`, `region_id=reg_01KRMT56X5MCH0A9DTSNZ81GFW`, `currency_code=usd`, `product_id=prod_01KSNA40DBV62HFP07PCNTGXTY`, `variant_id=variant_01KSNA40DZZ79AW9Z8EHHXPWTX`, and `unit_price=2250`.
- That successful product currently has no `product_sales_channel` link, so missing product-sales-channel link is not sufficient to explain the Batch 12A smoke failure.
- The first Batch 12A failure was caused by calling `updateCartWorkflow` after a line item already existed on the cart. That triggered `update-cart -> refresh-cart-items -> get-variant-items-with-prices` and failed with `Cannot read properties of undefined (reading 'calculated_amount')`.
- The smoke setup now binds customer/email/metadata on the empty cart first, then adds the line item, and does not call `updateCartWorkflow` after items exist.
- Latest runtime proved that post-item update is no longer the active blocker: `medusa exec` initialized successfully, entered business logic, and failed at `last_step=add_line_item`.
- The remaining blocker for the originally requested variant `variant_01KTKH18WFHSGH5MXG2YG74PXM` is add-to-cart calculated price lookup. The variant has a raw USD price, but Medusa `add-to-cart -> get-variant-items-with-prices` still returned no usable `calculated_amount`.
- The smoke setup now preflights store-core cart addability and Pricing Module `calculatePrices` before add-to-cart. If the requested variant is unavailable, it emits an explicit reason and can fall back to another non-shippable cart-addable variant. It fails with `SMOKE_VARIANT_PRICE_UNAVAILABLE`, `SMOKE_VARIANT_NOT_CART_ADDABLE`, or `NO_CART_ADDABLE_SMOKE_VARIANT_FOUND` instead of leaking Medusa's internal `undefined.calculated_amount`.
- Batch 12A then passes the preflight `calculated_amount` as `unit_price` into the project `addLineItemWorkflow`. The workflow logs the actual add-to-cart payload context (`cart_id`, `variant_id`, `quantity`, `region_id`, `sales_channel_id`, `currency_code`, `unit_price`) and sends `unit_price` to Medusa core `addToCartWorkflow`, avoiding the core `get-variant-items-with-prices` branch that dereferences a missing `calculatedPriceSet`.

Successful output shape:

```json
{
  "customer_id": "cus_...",
  "customer_email": "buyer@example.com",
  "cart_id": "cart_...",
  "order_id": "order_...",
  "display_id": 123,
  "requested_variant_id": "variant_...",
  "actual_variant_id": "variant_...",
  "variant_resolution_source": "requested_variant",
  "sales_channel_id": "sc_...",
  "region_id": "reg_...",
  "currency_code": "usd",
  "line_item_unit_price": 2250,
  "order_status": "pending",
  "payment_status": "pending",
  "captured_amount": 0,
  "fulfillment_status": "none",
  "fulfillment_count": 0,
  "store_id": "default_store",
  "cancellation_allowed": true
}
```

Existing completed buyer orders from Batch 11 are paid/waiting and therefore intentionally not cancellable by this batch.

Current local runtime attempt:

- `http://127.0.0.1:9000/health` returned OK.
- `medusa exec ./src/scripts/batch12a-cancel-smoke-setup.ts` reached script execution but the independent Medusa CLI process repeatedly failed DB checkout with `KnexTimeoutError` on `SELECT 1`.
- Retrying with explicit `DATABASE_URL=postgres://medusa:medusa@localhost:5433/ai_commerce` produced the same DB timeout.
- The smoke setup could not complete until the local DB/Medusa process state is reset.

Expected runtime smoke after DB connectivity is restored:

1. Create or locate authenticated order with no captured payment and no fulfillment rows.
2. Open `/account/orders/:order_id`.
3. Confirm `Cancel order` is visible.
4. Submit modal.
5. Confirm exactly one `POST /store/customers/me/orders/:id/cancel`.
6. Confirm response `cancelled=true`.
7. Refresh detail and `/account/orders`.
8. Confirm cancelled status persists.
9. Repeat POST and confirm idempotent success.
10. Confirm paid/fulfilled/guest orders are rejected.

## 8. Inventory Behavior

The implementation relies on Medusa `cancelOrderWorkflow`.

The installed workflow deletes reservations by line item during cancellation. Batch 12A does not directly write inventory or reservation tables.

Runtime inventory verification is still required with the unpaid sample:

- reservation rows before cancel
- reservation rows after cancel
- stock level after cancel
- emitted order cancelled event
- no supplier order side effects

## 9. Known Limitations

- No unpaid runtime sample was available during implementation.
- Cancel reason is validated but not persisted to order metadata in this batch, to avoid direct order mutation outside the official workflow.
- Any custom fulfillment row blocks cancellation, even if status is `pending_capture`; this is intentionally conservative.
- Authenticated order history shows cancelled status through `canceled_at` mapping, but no special cancelled tab was added.
- Frontend has no test script; validation is through typecheck/build.

## 10. Excluded Paid / Refund Cases

Paid orders remain blocked because refund/provider behavior is not buyer-ready.

Future paid cancellation must first solve:

- payment capture lookup
- real provider refund support
- refund records and order transactions
- supplier/POD cancellation policy
- admin approval or request flow

## 11. Follow-up Batch 12B

Recommended next batch:

`Batch 12B - Refund request workflow`

This should create a buyer request record and admin/operator review path without executing real payment refunds.
