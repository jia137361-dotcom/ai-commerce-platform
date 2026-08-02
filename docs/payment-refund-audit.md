# Payment Refund Audit

Date: 2026-08-01

Scope: refund request and execution architecture for Stripe test mode and PayPal sandbox. PayPal Sandbox refund closure was runtime verified on 2026-08-02.

## Flow

```text
buyer refund request
  -> authenticated customer/session check
  -> order ownership and store check
  -> email verification check
  -> refundable amount calculation
  -> refund policy decision from fulfillment/production state
  -> auto execution or seller review
  -> locked provider refund execution
  -> Medusa payment refund persistence
  -> refund request status update
  -> buyer and seller refund visibility
```

Seller review flow:

```text
seller refund list
  -> seller user session
  -> seller store binding
  -> store-scoped refund request
  -> approve/reject/request information
  -> locked provider refund execution on approve
```

## Authorization And Ownership

- Buyer route requires `x-publishable-api-key`, `X-Store-Id`, authenticated customer actor, exact order `customer_id`, and current store match.
- Buyer route requires verified email before creating a refund request.
- Seller route requires seller/admin user identity and a seller store session, then filters refund requests by seller `store_id`.
- Seller decision route loads requests only by request id plus seller `store_id`.

## Refundable Amount Calculation

`resolveRefundableAmount` is server-side. It prefers captured/completed payment collection evidence, captured payment rows, capture rows, paid payment rows, then order total. Existing financially reserved refund requests reduce the remaining refundable amount. Optional item-selection refunds calculate the line-item proportional amount server-side from order items and quantities.

## Duplicate Prevention

- Buyer request creation uses an idempotency key from the `Idempotency-Key` header/body or a stable fallback.
- `buyer_refund_request.idempotency_key` has a partial unique index where not deleted.
- Provider execution is locked by `refund-request:{refundRequestId}`.
- Terminal or in-flight statuses return without a second provider refund.
- Provider execution injects `refund_idempotency_key = request.id` into payment data before calling Medusa refund workflow.
- PayPal provider passes that stable request id as `PayPal-Request-Id`.

## Provider Matrix

| Capability | Stripe | PayPal |
| --- | --- | --- |
| Full refund supported | static_verified via Medusa `refundPaymentWorkflow` and payment-stripe provider | static_verified via `refundPayment` using capture id |
| Partial refund supported | static_verified via explicit `amount` passed to `refundPaymentWorkflow` | static_verified via explicit amount/currency passed to `/v2/payments/captures/{capture_id}/refund` |
| Provider transaction ID used | payment id/provider data handled by Medusa payment-stripe | `paypal_capture_id`, not PayPal order id |
| Idempotency key | Medusa workflow/provider idempotency path; needs runtime proof for Stripe provider header | `refund_idempotency_key`/context id passed as `PayPal-Request-Id` |
| Duplicate request behavior | static_verified for request idempotency, lock, and terminal/in-flight returns | static_verified for request idempotency, lock, and PayPal request id |
| Failed refund behavior | static_verified: deterministic provider rejection marks `refund_failed`; indeterminate errors mark `refund_pending` | static_verified: provider failed statuses map to `refund_failed`; indeterminate errors mark `refund_pending` |
| Webhook behavior | partially_verified: generic route relies on provider `getWebhookActionAndData`; no Stripe-specific refund reconciliation found | static_verified: `PAYMENT.CAPTURE.REFUNDED` reconciles `external_refund_id` to refund request |
| Buyer state synchronization | static_verified via buyer refund request serialization/listing | static_verified via buyer refund request serialization/listing |
| Seller state synchronization | static_verified via seller refund request listing and decision route | static_verified via seller refund request listing and decision route |
| Fulfillment/supplier compensation | partially_verified: policy blocks shipped/delivered into return/claim flow; no supplier compensation ledger | partially_verified: policy blocks shipped/delivered into return/claim flow; no supplier compensation ledger |
| Runtime verification status | blocked_pending_runtime_refund | runtime_verified |

## Findings

1. Purchase closure is runtime verified and should not be refactored while adding refund closure.
2. PayPal refund implementation correctly requires `paypal_capture_id`; it does not refund by order id alone.
3. Refund request state is store-aware and buyer/seller visible through separate routes.
4. PayPal refund webhook reconciliation exists, but Stripe refund webhook reconciliation is not explicitly implemented in the custom webhook route.
5. Runtime refund closure still needs provider refund IDs and Medusa refund rows for Stripe.
6. Supplier compensation is a policy decision, not a settled accounting system. Current code prevents simple auto-refund after shipped/delivered by routing to return/claim.

## PayPal Runtime Closure

PayPal Sandbox full refund closure is verified for order `order_01KYYYA5T3MQMQA6YA5TP6QBDA`, payment collection `pay_col_01KYXPTFVY5S9JSKGECS3P3DJN`, payment `pay_01KYYYA9ACX6BBV1TF5AXQD4S6`, capture `1U0155257Y195344J`, and refund request `brr_01KZ0B4JWF95Z4PT19Q8ZVNFF9`.

Final evidence:

- PayPal refund `3DT525181Y2054847` is `COMPLETED` for `44.00 USD`.
- PayPal capture `1U0155257Y195344J` is `REFUNDED`, and the capture exposes one refund link.
- Medusa has exactly one `buyer_refund_request` for the order, with status `refunded`, attempt count `1`, provider idempotency key `brr_01KZ0B4JWF95Z4PT19Q8ZVNFF9`, and external refund id `3DT525181Y2054847`.
- Medusa has exactly one refund row for `4400`; the payment collection refunded amount is `4400`, leaving remaining refundable amount `0`.
- Buyer route visibility is backed by the authenticated order/refund filters: customer `cus_01KYXNV5932TGV6SKJ17F1J6T5` plus store `mkt01_paypal_runtime_20260801_store`.
- Seller route visibility is backed by the seller session store filter. The same-store seller can see the request; another store cannot match the route filter.
- Fulfillment remains `waiting`; no supplier order was created. Fulfillment cancellation after a payment refund is a separate business workflow, not part of the current payment refund closure.

Detailed redacted evidence is stored in `docs/evidence/paypal-refund-closure.json`.

## PayPal Closure Root Cause And Fixes

The runtime blocker was not PayPal refund capability. It was local payment-context resolution and refund-request persistence around the existing order. The original buyer route attempt could not complete because the order/payment context was not resolved through the current graph shape, and the refund request schema needed the new amount/idempotency/provider fields to preserve recovery-safe state.

Fixes applied before closure:

- Schema migration added durable refund request fields for raw amount storage, provider attempts, idempotency, provider status, provider/external transaction ids, and uniqueness constraints.
- `resolveRefundPaymentContext` extracts the payment collection, payment, captured/refunded totals, PayPal capture id, refund count, remaining refundable amount, and currency from the order payment graph.
- `executeApprovedRefund` locks on `refund-request:{refundRequestId}`, writes `refund_processing` plus incremented attempt count before the provider call, injects `refund_idempotency_key = request.id`, and updates the persistent request from Medusa/provider state after the workflow.
- The guarded development recovery script refuses production, requires explicit enablement, performs strict preflight checks, and calls `executeApprovedRefund` only for the existing persistent request.

Idempotency and re-execution behavior:

- Provider idempotency derives from `brr_01KZ0B4JWF95Z4PT19Q8ZVNFF9`.
- A second recovery invocation would be refused by preflight because the request status is `refunded`, `external_refund_id` is present, Medusa already has a refund row, remaining refundable amount is `0`, and PayPal already reports the refund completed.
- If PayPal succeeds but local persistence fails, `recover-existing-refund-request` classifies the result as `succeeded_local_persistence_failed` when provider refund evidence exists without the expected local refund row, so follow-up reconciliation is explicit instead of silently retrying.

## Runtime Verification Plan

Stripe:

- Prefer a fresh isolated Stripe order so existing purchase evidence remains stable.
- Create buyer refund request with stable idempotency key.
- For auto-approve eligible `waiting` fulfillment, verify one Stripe refund and one Medusa refund row.
- Replay duplicate request and seller decision only after confirming no second provider refund.

PayPal:

- Completed with PayPal refund `3DT525181Y2054847`; do not execute another refund for capture `1U0155257Y195344J`.
- Preserve `docs/evidence/paypal-refund-closure.json` as the authoritative redacted closure evidence.
- Any future PayPal refund verification must use a fresh isolated order/capture.
