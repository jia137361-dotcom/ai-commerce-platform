# Payment Reconciliation Design

Date: 2026-08-01

Goal: repair mismatched checkout/refund/fulfillment state without creating a second charge, capture, refund, order, or fulfillment.

## Command Shape

```text
npm --workspace apps/medusa-backend run payment:reconcile -- --cart-id <cart_id>
npm --workspace apps/medusa-backend run payment:reconcile -- --payment-collection-id <pay_col_id>
npm --workspace apps/medusa-backend run payment:reconcile -- --order-id <order_id>
```

The command should be read-only by default and require `--apply` for mutation.

## Entity Map

```text
cart
  -> cart_payment_collection
  -> payment_collection
  -> payment_session
  -> checkout_payment_attempt
  -> payment
  -> capture
  -> refund
  -> order_cart
  -> order
  -> buyer_refund_request
  -> fulfillment_order
  -> shipment
```

Provider map:

- Stripe: payment intent id from payment session/attempt/payment data.
- PayPal: order id from session/attempt/payment data; capture id from payment/session data.

## Idempotency Rules

- Never call provider capture if a completed provider capture already exists.
- Never call provider refund if a provider refund id already exists for the same refund request.
- Never call complete-cart if an order already exists for the cart.
- Never insert fulfillment when any fulfillment row exists for the order; fail closed if more than one exists.
- Never create a new payment session while a provider transaction is approved, completed, captured, or refunded.

## Recovery Cases

| Case | Detection | Safe Repair |
| --- | --- | --- |
| provider captured, complete-cart failed | provider capture exists; no order for cart | retry complete-cart using same payment collection/session; do not capture |
| complete-cart succeeded, client lost response | order exists for cart | return existing order and mark attempt completed |
| webhook delayed | provider captured; Medusa payment pending | run captured-payment sync by payment id/order id |
| webhook duplicated | webhook event id already stored | return duplicate success |
| provider says captured but Medusa pending | provider capture count 1; payment row missing captured_at/capture | run provider-status reconciliation and Medusa capture sync once |
| Medusa says captured but fulfillment pending_capture | order paid metadata/capture row present; one fulfillment pending_capture | call paid-fulfillment sync helper |
| provider refund succeeded but Medusa update failed | provider refund id exists; request `refund_pending`/`refund_failed` | retrieve provider refund and update request/payment refund row once |
| Medusa refund request exists but provider refund failed | request `refund_failed`, no external refund id | allow seller retry with same request id after policy check |
| supplier push failed after payment capture | order paid; fulfillment `waiting` or `failed` with no supplier order id | retry supplier push idempotently by fulfillment id |

## Apply Mode

`--apply` should perform one bounded mutation per run and then exit with a structured result:

```json
{
  "applied": true,
  "action": "sync_paid_fulfillment",
  "cart_id": "cart_...",
  "order_id": "order_...",
  "created_charge": false,
  "created_capture": false,
  "created_refund": false,
  "created_order": false,
  "created_fulfillment": false
}
```

## Required Tests

- duplicate complete-cart returns existing order
- duplicate captured-payment sync does not create another fulfillment
- duplicate webhook does not create another capture/refund
- provider-captured/order-missing retry does not capture twice
- refund-pending/provider-completed reconciliation does not refund twice
- multiple fulfillment rows fail closed
