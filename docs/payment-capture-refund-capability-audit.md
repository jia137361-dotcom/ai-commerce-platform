# Payment Capture / Refund Capability Audit

Date: 2026-06-19  
Branch: `feature/buyer-frontend-integration`

## Current Conclusion

The configured checkout provider is `pp_system_default`. Batch 12B runtime proves that it can create an authorized payment, but the current checkout path does not capture it. No provider refund has been executed or verified.

The Payment Module exposes authorize, capture, and refund APIs at framework level. Their presence does not prove that the configured provider implements production-grade capture or refund semantics. Runtime payment evidence is the capability authority.

## Terminal Audit

Run the read-only audit with:

```bash
PAYMENT_CAPABILITY_AUDIT_ENABLED=true \
npm --workspace apps/medusa-backend exec -- \
  medusa exec ./src/scripts/payment-capability-audit.ts
```

The script reads enabled providers, orders, payment collections, payments, sessions, and buyer refund requests. It creates no order, changes no payment state, and calls no capture or refund workflow.

The audit command was attempted in the current workspace on 2026-06-19, but Medusa could not acquire a PostgreSQL connection and repeatedly returned `KnexTimeoutError` for `SELECT 1`. Therefore this document uses the confirmed Batch 12B smoke evidence below and does not claim fresh provider/order counts. Re-run the read-only command after database connectivity is restored.

## Batch 12B Evidence

Pipeline A passed with:

```text
AUTHORIZED_ORDER_ID=order_01KVFKBBKPDKHDVZ0J3MBS2X66
AUTHORIZED_DISPLAY_ID=75
AUTHORIZED_CAPTURED_AMOUNT=0
AUTHORIZED_CANCEL_ALLOWED=true
AUTHORIZED_REFUND_ALLOWED=false
AUTHORIZED_CANCEL_RESULT=PASS
```

The official cancel workflow canceled the order and removed the active uncaptured authorization.

Pipeline B reported:

```text
CAPTURED_SMOKE_UNAVAILABLE=provider_does_not_capture
CAPTURED_REFUND_RESULT=SKIPPED
```

This is an honest capability boundary: an authorized amount is not refundable payment evidence.

## Why Checkout Stops At Authorization

The checkout bridge creates a payment collection/session and calls `completeCartWorkflow`. It does not call `capturePaymentWorkflow`. The local provider/session therefore remains authorized unless another explicit capture lifecycle step runs.

Project metadata helpers can synchronize buyer-facing payment state after capture, but metadata is not provider capture evidence and must not be used to manufacture refund eligibility.

## Provider Capability

| Capability | Current evidence | Conclusion |
|---|---|---|
| Registration | `pp_system_default` enabled | Available locally |
| Authorize | Authorized collection/payment/session in Batch 12B | Runtime verified |
| Capture API | Payment Module method exists | Framework API only |
| Capture provider behavior | No positive captured smoke | Not runtime verified |
| Refund API | Payment Module method exists | Framework API only |
| Refund provider behavior | No provider refund executed | Unverified |

The audit reports `CAPTURE_RUNTIME_SUPPORTED=true` only when stored payment evidence contains captured amount, `payment.captured_at`, or a completed collection. It reports refund runtime as `unverified`; processed buyer refund requests alone do not prove money was returned.

## Refund Request Safety

Pending/approved/processing refund requests are checked against authorized-not-captured orders. Any match is emitted as `SAFETY_VIOLATION_AUTHORIZED_ORDER_HAS_REFUND_REQUEST`. No match emits `REFUND_REQUEST_SAFETY_CHECK=PASS`.

Buyer refund requests remain intent records. They do not call a provider and must keep external refund/transaction identifiers empty until a later provider integration succeeds.

## Why Positive Refund Runtime Was Skipped

Batch 12B requires actual captured payment evidence before creating a positive refund request sample. The local flow produced authorization only, and treating `authorized_amount` as refundable would violate the payment boundary. Therefore Pipeline B correctly returned `SKIPPED` rather than changing payment rows or simulating capture.

## Business Boundary

- **Authorized-not-captured:** may be canceled only when order and fulfillment guards pass; refund request is denied.
- **Captured:** cancellation is denied; an authenticated buyer may create a pending refund request when amount and currency are resolvable.
- **Refund requested:** means pending review, not provider refund success.
- **Refunded:** must only be displayed after provider execution and reconciliation confirm it.

## Batch 12C Prerequisites

1. Select a real payment provider and sandbox account.
2. Document provider authorize, capture, void, full refund, and partial refund APIs.
3. Choose capture timing: immediate checkout capture, manual capture, or supplier-accept capture.
4. Define refund request approval and execution state machines.
5. Define provider idempotency keys for capture and refund attempts.
6. Implement signed webhook reconciliation and replay protection.
7. Define full and partial refund amount allocation, including tax and shipping.
8. Define failed refund retry, timeout, and manual intervention behavior.
9. Define authoritative synchronization among provider, payment collection, order, and buyer refund request states.
10. Provide isolated sandbox credentials and deterministic captured-payment fixtures.

Until these prerequisites are met, Batch 12C must not enable real refund execution.
