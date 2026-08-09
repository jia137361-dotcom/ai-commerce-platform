# Payment Capture State Audit

Date: 2026-08-01

Scope: payment closure for the current single-store MVP path while preserving future store-aware architecture.

## Call Graph

```text
storefront checkout
  -> /store/payment-collections
  -> /store/payment-collections/:id/payment-sessions
  -> provider approval/confirmation
  -> /store/carts/:id/complete
       -> ensureCartPaymentReady or Stripe session validation
       -> completeCartWorkflow
       -> setOrderPostCompletePendingMetadata
       -> seedFulfillmentOrderIfMissing
       -> syncPaidIfPaymentAlreadyCaptured
  -> provider webhook /api/hooks/payment/:provider or Medusa provider event
       -> processPaymentWorkflow
       -> PaymentEvents.CAPTURED
       -> subscribers/payment-captured-sync
            -> resolve order through fulfillment_order.payment_collection_id
            -> payment.captured dedupe
            -> markOrderPaidAndFulfillmentWaiting
            -> notify buyer/seller
            -> optional supplier push
```

## Existing Patch Review

The payment-closure helper now enforces the runtime invariant that a single order must not proceed through payment-captured side effects when more than one custom fulfillment order is present. Duplicate rows fail closed with the order ID and fulfillment order IDs in the thrown error.

The only custom fulfillment-row repair performed by `markOrderPaidAndFulfillmentWaiting` is:

```text
pending_capture -> waiting
```

Rows already in `canceled`, `failed`, `pushed`, `in_production`, `shipped`, `delivered`, or `fulfilled` are not moved back to `waiting`. If order metadata already says `payment_status=paid`, the helper does not create fulfillment rows, call provider APIs, notify, or push supplier orders. It can only repair a single `pending_capture` row to `waiting`.

Duplicate `payment.captured` events are deduped by `payment.captured:{payment_id}` before paid notifications and supplier push. If the paid-sync invariant fails after reserving the dedupe key, the subscriber releases the dedupe row and rethrows so the event can be retried by the Medusa event bus instead of being acknowledged as done.

## Stripe Capture Matrix

| Question | Current answer |
| --- | --- |
| Is capture automatic or manual? | Automatic. `apps/medusa-backend/medusa-config.ts` configures `@medusajs/payment-stripe` with `capture: true`. CitiGoo still defers order-paid fulfillment until capture evidence, but Stripe capture is expected to occur as part of provider processing rather than a separate manual CitiGoo capture operation. |
| Which function performs capture? | The official `@medusajs/payment-stripe` provider performs capture during Medusa payment processing/authorization according to its `capture: true` setting. The browser only confirms the PaymentIntent. |
| PaymentIntent creation | Medusa creates it when the store creates a `pp_stripe_stripe` payment session for the cart payment collection. |
| Browser confirmation | The storefront calls Stripe.js `confirmPayment`; the script path can call `/v1/payment_intents/:id/confirm` in Stripe test mode. |
| Authorization | Stripe transitions the PaymentIntent after confirmation. With automatic capture it typically reaches `succeeded`; manual-capture flows would use `requires_capture`, but this repo config does not currently request manual capture. |
| Capture | With `capture: true`, capture is automatic during provider processing. Runtime evidence must inspect Medusa payment/captures, not assume browser success equals Medusa capture. |
| At which exact point is Medusa payment considered captured? | When Medusa payment processing records captured payment evidence (`captured_at` and/or capture rows) and emits `PaymentEvents.CAPTURED`. |
| Which event invokes `markOrderPaidAndFulfillmentWaiting`? | `PaymentEvents.CAPTURED` handled by `apps/medusa-backend/src/subscribers/payment-captured-sync.ts`. |
| Can the event arrive before or after cart completion? | It can only map to a CitiGoo order after cart completion has seeded a fulfillment order with `payment_collection_id`. If provider capture occurs before complete-cart succeeds, `completeCart` calls `syncPaidIfPaymentAlreadyCaptured` after seeding fulfillment. |
| Can the same event be emitted twice? | Yes. The subscriber dedupes with `payment.captured:{payment_id}`. |
| What if provider captured but complete-cart failed? | Checkout attempts can be marked `order_completion_failed`; payment recovery should reuse the existing PaymentIntent/session and retry order completion without creating a second charge. Runtime evidence is still required. |

### Stripe State Trace

```text
payment session created
  -> Stripe PaymentIntent has client_secret
  -> browser confirms PaymentIntent
  -> PaymentIntent status: succeeded/processing/requires_capture
  -> complete cart
  -> Medusa order created
  -> fulfillment_order seeded as pending_capture
  -> Medusa payment capture evidence appears
  -> PaymentEvents.CAPTURED
  -> fulfillment_order pending_capture -> waiting
  -> order metadata payment_status=paid
```

## PayPal Capture Matrix

| Question | Current answer |
| --- | --- |
| Is capture automatic or manual? | Automatic capture after buyer approval. The custom PayPal provider creates Orders with `intent: "CAPTURE"` and captures an approved order in `authorizePayment` or `capturePayment`. |
| Which function performs capture? | `PayPalPaymentProviderService.authorizePayment` calls `PayPalClient.captureOrder` when the PayPal order is `APPROVED`; `capturePayment` also captures if still approved. |
| PayPal order creation | `PayPalPaymentProviderService.initiatePayment` calls `PayPalClient.createOrder` with `intent: "CAPTURE"`. |
| Buyer approval | The storefront PayPal button approves the PayPal Order. |
| Authorization or capture | Approved PayPal Orders are captured by the provider because the order intent is `CAPTURE`; this is not a separate authorization-only flow in the current code. |
| At which exact point is Medusa payment considered captured? | When `statusForOrder` sees the first PayPal capture status as `COMPLETED`, the provider returns `PaymentSessionStatus.CAPTURED`; Medusa payment processing can then emit `PaymentEvents.CAPTURED`. |
| Which event invokes `markOrderPaidAndFulfillmentWaiting`? | `PaymentEvents.CAPTURED` handled by `apps/medusa-backend/src/subscribers/payment-captured-sync.ts`. |
| Can the event arrive before or after cart completion? | As with Stripe, it can only map to an order through the seeded fulfillment row after completion. If capture is externally complete before cart completion succeeds, recovery must reuse the existing PayPal order/session and finish order completion. |
| Can the same event be emitted twice? | Yes. Canonical PayPal webhook handling dedupes PayPal webhook IDs, and the Medusa `payment.captured` subscriber dedupes payment IDs. |
| What if provider captured but complete-cart failed? | The checkout attempt can be marked `order_completion_failed`; recovery is expected to reuse the existing PayPal order ID and avoid a second capture. Runtime closure for PayPal is explicitly out of this Stripe-only phase. |

### PayPal State Trace

```text
payment session created
  -> PayPal Order created with intent CAPTURE
  -> buyer approves PayPal Order
  -> provider authorizePayment/capturePayment captures approved order
  -> provider returns PaymentSessionStatus.CAPTURED after capture COMPLETED
  -> complete cart
  -> Medusa order created
  -> fulfillment_order seeded as pending_capture
  -> PaymentEvents.CAPTURED
  -> fulfillment_order pending_capture -> waiting
  -> order metadata payment_status=paid
```

## Runtime Closure Gate

This document is not runtime proof. Stripe closure requires a real Stripe test-mode run that reaches:

```text
Medusa order + buyer visibility + seller visibility + captured payment evidence + exactly one fulfillment order
```

The required redacted evidence artifact is `docs/evidence/stripe-payment-closure.json`.
