# Buyer Refund Request Workflow

Date: 2026-06-19  
Branch: `feature/buyer-frontend-integration`

## 1. Scope

Batch 12B lets an authenticated buyer submit a full-order refund request for an order that has paid or captured payment evidence. The request is stored with `pending` status for later admin, supplier, and payment-provider review.

This batch does not execute a refund, modify Medusa payment/refund state, update refunded amounts, or claim that money was returned.

## 2. Why This Is Not A Real Refund

Creating `buyer_refund_request` only records buyer intent. No Medusa refund workflow or provider API is called. Provider fields are placeholders for Batch 12C and default to `null` or `not_connected`.

Buyer-facing copy is limited to `Refund request submitted` and `Pending review`. It never says `Refund completed`, `Refunded`, or `Money returned`.

## 3. API Contract

All routes require:

- `x-publishable-api-key`
- `X-Store-Id`
- authenticated customer HttpOnly session

### POST `/store/customers/me/orders/:id/refund-requests`

Request:

```json
{
  "reason": "Ordered by mistake",
  "note": "Optional note"
}
```

Success: `201`

```json
{
  "refund_request": {
    "id": "brr_...",
    "order_id": "order_...",
    "display_id": 72,
    "status": "pending",
    "reason": "Ordered by mistake",
    "note": null,
    "requested_amount": 2125,
    "currency_code": "usd",
    "provider_status": "not_connected",
    "created_at": "2026-06-19T00:00:00.000Z"
  }
}
```

An existing open request returns `409 ORDER_REFUND_REQUEST_EXISTS`.

### GET `/store/customers/me/orders/:id/refund-requests`

Returns requests belonging to the authenticated customer, requested order, and current store. Provider payload and internal transaction details are not exposed.

## 4. Data Model

Custom module/table: `buyer_refund_request`.

Core fields:

- order/customer/store identity
- display id and currency
- requested and approved amounts
- reason, note, status
- provider identifiers/status placeholders
- review/process/failure timestamps
- metadata `{ "scope": "full_order" }`

Open statuses are `pending`, `approved`, and `processing`. Closed statuses are `rejected`, `processed`, `failed`, and `cancelled`.

The table is separate from Medusa payment, refund, and order tables.

## 5. Eligibility Rules

Allowed when:

- authenticated actor owns the order
- order belongs to current store
- order is not cancelled
- no open refund request exists
- payment state is resolved
- payment evidence shows capture/payment through at least one of:
  - captured amount greater than zero
  - payment `captured_at`
  - payment collection `completed_at`
  - explicit paid/captured/completed status
- requested amount and currency can be determined

Denied examples:

- `ORDER_AUTHORIZED_NOT_CAPTURED`: use Batch 12A cancellation instead
- `ORDER_CANCELLED`
- `ORDER_NOT_PAID`
- `ORDER_REFUND_REQUEST_EXISTS`
- `ORDER_ACCESS_DENIED`
- `ORDER_WRONG_STORE`
- `ORDER_REFUND_NOT_SUPPORTED`

Requested amount is the smaller positive value of captured amount and order total. If capture evidence exists without a numeric captured amount, the order total is used for the pending review request. This does not represent an executed refund.

## 6. Security Model

- Customer identity comes only from `req.auth_context.actor_id`.
- Email and frontend customer ids are never ownership proof.
- The order must match authenticated customer and `X-Store-Id`.
- Guest detail cannot create or expose actionable refund controls.
- Duplicate open requests are rejected.
- Reason is required, trimmed, HTML-like input rejected, maximum 200 characters.
- Note is optional, maximum 1000 characters, HTML-like input rejected.
- Provider payload is never serialized to buyer responses.

## 7. Frontend Behavior

Authenticated order detail receives a `refund_request` capability object.

- Paid/captured eligible order: `Request refund` button.
- Authorized-not-captured order: `Cancel order`; no refund request button.
- Cancelled order: neither action.
- Open request: `Refund requested` and `Pending review` status.
- Guest detail: no refund request button.

The modal collects a reason and optional note, prevents duplicate submit, and updates the current detail state after the API returns a real pending request.

## 8. Provider Integration Placeholders

The model reserves payment provider, external payment/refund/transaction ids, provider status/payload, and processing timestamps. Batch 12B does not populate or execute these fields beyond `provider_status=not_connected`.

## 9. Runtime Evidence

The terminal-only pipeline smoke does not require a browser session or customer cookie:

```bash
BATCH12B_PIPELINE_SMOKE_ENABLED=true \
BATCH12B_PIPELINE_SMOKE_VARIANT_ID="variant_01KTKH18WFHSGH5MXG2YG74PXM" \
npm --workspace apps/medusa-backend exec -- \
  medusa exec ./src/scripts/batch12b-order-pipeline-smoke.ts
```

Pipeline A creates an authenticated authorized-not-captured order through the same cart and complete workflows used by Batch 12A. It verifies refund-request rejection, cancellation eligibility, official order cancellation, zero captured amount, and removal of the active payment authorization.

Pipeline B first searches for real capture evidence. If none exists, it may create a second authorized order and call Medusa's official `capturePaymentWorkflow`. It never updates payment state directly and never invokes a refund workflow. A captured order creates one `pending` buyer refund request; repeating the eligibility check produces `ORDER_REFUND_REQUEST_EXISTS`, equivalent to the authenticated route's HTTP 409 response.

Expected positive evidence includes:

```text
AUTHORIZED_CANCEL_RESULT=PASS
AUTHORIZED_CAPTURED_AMOUNT=0
AUTHORIZED_REFUND_ALLOWED=false
CAPTURED_REFUND_ALLOWED=true
REFUND_REQUEST_STATUS=pending
DUPLICATE_RESULT=409
CAPTURED_REFUND_RESULT=PASS
```

If the local provider cannot produce a captured payment, the script reports this explicitly instead of fabricating payment evidence:

```text
CAPTURED_SMOKE_UNAVAILABLE=provider_does_not_capture
CAPTURED_REFUND_RESULT=SKIPPED
```

`pp_system_default` may produce only authorized-not-captured orders depending on local provider configuration. In that case the terminal smoke fully verifies the cancellation pipeline and refund-request rejection, while positive refund-request runtime remains dependent on a captured payment fixture or provider.

On 2026-06-19 the script was invoked against the current local workspace, but Medusa could not acquire a PostgreSQL connection and repeatedly returned `KnexTimeoutError` for `SELECT 1`, including after the running Medusa processes were stopped. No pipeline PASS or SKIPPED result was recorded from that attempt. Re-run the command after the database service or connection quota is restored; the script intentionally does not translate infrastructure failure into a smoke result.

No real refund is triggered by this smoke.

## 10. Known Limitations

- full-order request only
- no item/quantity partial request
- no admin review UI
- no provider refund execution
- no webhook reconciliation
- no supplier cancellation or return logistics
- no guest refund request
- no notification/email workflow

## 11. Follow-up

Batch 12C should implement real payment-provider refund integration only after provider capability, idempotency, webhook reconciliation, and admin approval are defined and runtime verified.
