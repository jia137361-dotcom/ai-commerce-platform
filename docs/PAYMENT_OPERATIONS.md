# Payment Operations

Date: 2026-08-01

Scope: operational readiness for buyer checkout payments. Seller payout and Stripe Connect settlement are separate domains.

For branch-specific setup, verified evidence boundaries, Cloudflare wallet testing,
and current backend tunnel requirements, see [PAYMENT_HANDOFF.md](PAYMENT_HANDOFF.md).

## Gates

| Gate | Status | Notes |
| --- | --- | --- |
| Stripe purchase closure | runtime_verified | Test-mode closure evidence exists. |
| PayPal purchase closure | runtime_verified | Sandbox closure evidence exists. |
| Stripe refund closure | blocked | Needs runtime test refund id and Medusa refund state. |
| PayPal refund closure | runtime_verified | Sandbox refund `3DT525181Y2054847` completed for capture `1U0155257Y195344J`; see `docs/evidence/paypal-refund-closure.json`. |
| Stripe webhook endpoint | static_verified | Generic `/hooks/payment/[provider]` route exists and delegates to Medusa provider. |
| PayPal webhook endpoint | static_verified | Same route verifies PayPal through provider and dedupes PayPal event ids. |
| Stripe webhook event list | partially_verified | Capture events covered by tests; refund event handling needs explicit reconciliation proof. |
| PayPal webhook event list | partially_verified | Capture/refund events mapped; refund closure is runtime verified, webhook replay remains separate evidence. |
| Signature verification | static_verified | Stripe through payment-stripe provider; PayPal through `verify-webhook-signature`. |
| Webhook dedupe persistence | static_verified | `webhook_events` module and `tryRegisterWebhookDedupe`. |
| Sandbox/test/live isolation | partially_verified | PayPal provider rejects non-sandbox; Stripe requires test/live operational policy. |
| Startup configuration diagnostics | partially_verified | Missing credentials disable/omit providers; formal startup report still missing. |
| Secret rotation process | missing | Needs documented rotation runbook. |
| Logging redaction | partially_verified | Evidence redacted; local `.env` contains secrets and must never be committed. |
| Alerting | missing | No provider/webhook/refund alerting pipeline documented. |
| Database uniqueness constraints | partially_verified | Refund idempotency and external refund indexes exist; checkout/payment uniqueness should be audited. |
| Retry/dead-letter behavior | partially_verified | Locks/dedupe exist; no durable dead-letter workflow. |
| Staging verification procedure | partially_verified | Test/sandbox scripts exist; needs a single staging checklist. |
| Rollback procedure | missing | Needs migration/config rollback steps. |

## Required Stripe Webhook Events

- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.requires_action` or equivalent provider action coverage
- `charge.refunded` / `refund.updated` for refund reconciliation

## Required PayPal Webhook Events

- `CHECKOUT.ORDER.APPROVED`
- `PAYMENT.CAPTURE.COMPLETED`
- `PAYMENT.CAPTURE.PENDING`
- `PAYMENT.CAPTURE.DENIED`
- `PAYMENT.CAPTURE.REVERSED`
- `PAYMENT.CAPTURE.REFUNDED`
- refund denied/failed events where available in the merchant app

## Secret Handling

- Do not commit `.env`, `.env.local`, access tokens, webhook secrets, API keys, buyer passwords, or session cookies.
- Evidence may contain provider object ids, order ids, capture ids, refund ids, status, amount, and currency.
- Logs must not print PayPal access tokens, Stripe secret keys, client secrets, session cookies, or buyer credentials.

## Staging Verification Checklist

1. Confirm providers are test/sandbox only.
2. Confirm region provider availability for Stripe and PayPal.
3. Run purchase closure for Stripe.
4. Run purchase closure for PayPal.
5. Run duplicate complete and duplicate webhook checks.
6. Run Stripe test refund closure.
7. Run PayPal sandbox refund closure with a fresh isolated capture. Existing closure capture `1U0155257Y195344J` is already fully refunded and must not be reused.
8. Confirm exactly one fulfillment row per order.
9. Confirm buyer and seller order/refund visibility.
10. Store redacted evidence under `docs/evidence/`.

## Rollback Outline

- Disable the affected payment provider from the region.
- Stop accepting new checkout attempts for the provider.
- Preserve existing payment sessions and provider ids for reconciliation.
- Roll back code only after recording open carts, captured payments, refunds, and fulfillment rows.
- Run reconciliation dry-run after rollback.

## PayPal Refund Closure Evidence

Runtime closure is verified in Sandbox for order `order_01KYYYA5T3MQMQA6YA5TP6QBDA`.

- Root cause: the original runtime blocker was local payment-context resolution and refund request persistence for the existing order, not a missing PayPal refund primitive.
- Schema fix: refund request migrations preserve raw amounts, provider attempt/idempotency fields, provider status, external refund ids, and uniqueness constraints.
- Payment-context fix: `resolveRefundPaymentContext` resolves the payment collection, payment, PayPal capture id, captured/refunded totals, refund count, remaining refundable amount, and currency from the Medusa graph.
- Guarded recovery: `recover-existing-refund-request` is development-only, explicitly enabled, Sandbox-checked, and preflighted before it calls `executeApprovedRefund` for the existing persistent request.
- Idempotency: provider idempotency derives from refund request id `brr_01KZ0B4JWF95Z4PT19Q8ZVNFF9`.
- Final state: PayPal refund `3DT525181Y2054847` is `COMPLETED`; Medusa has one refund row for `4400`; payment collection refunded amount is `4400`; remaining refundable amount is `0`.
- Re-execution: another recovery is blocked by terminal request status, existing external refund id, existing Medusa refund row, zero remaining refundable amount, and completed PayPal refund evidence.
- Fulfillment: the custom fulfillment order remains `waiting` with no supplier order. Supplier cancellation/refund compensation is a separate future workflow.
