# PayPal Payment Closure Audit

Date: 2026-08-01

Scope: PayPal sandbox purchase closure only. Refund runtime closure is out of scope for this phase.

## Configuration Findings

| Question | Finding |
| --- | --- |
| Is `pp_paypal_paypal` registered? | Conditionally yes. `medusa-config.ts` registers local provider `./src/modules/paypal` with id `paypal` only when `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, and `PAYPAL_ENVIRONMENT=sandbox` are present. Medusa provider id resolves to `pp_paypal_paypal`. |
| Is `pp_paypal_paypal` enabled on the active region? | Not proven by this read-only audit. `src/lib/paypal-region-setup.ts` can attach `pp_paypal_paypal` to regions, but runtime verification or guarded setup is still required. |
| Medusa versions | `apps/medusa-backend/package.json` declares `@medusajs/medusa`, `@medusajs/framework`, and `@medusajs/payment-stripe` as `^2.14.2`; `package-lock.json` currently resolves them to `2.17.2`. |
| PayPal SDK versions | No PayPal server SDK package is declared or installed. The custom provider uses direct REST calls through `fetch` against `https://api-m.sandbox.paypal.com`. The storefront loads the browser SDK from `https://www.paypal.com/sdk/js`. |
| PayPal documentation | `docs/PAYPAL_SETUP.md` is absent in the current worktree. |
| Environment preflight | Redacted local env read shows `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, `VITE_PAYPAL_CLIENT_ID`, `DATABASE_URL`, `REDIS_URL`, and `VITE_PUBLISHABLE_API_KEY` present; `PAYPAL_ENVIRONMENT=sandbox`. |

## Provider Contract

The current custom PayPal provider stores provider session data under names with a `paypal_` prefix:

```ts
{
  id: paypalOrderId,
  paypal_order_id: paypalOrderId,
  paypal_status: order.status,
  paypal_capture_id: capture?.id,
  paypal_capture_status: capture?.status,
  amount,
  currency,
  currency_code
}
```

The provider does not store PayPal access tokens in session data. Access tokens are cached only in the in-memory `PayPalClient` instance.

Current MVP intent is `CAPTURE`. `PayPalClient.createOrder` sends `intent: "CAPTURE"` and the provider rejects every non-sandbox environment in `validateOptions`.

Authoritative amount and currency come from Medusa payment inputs: `initiatePayment` and `updatePayment` pass `input.amount` and `input.currency_code` into `PayPalClient.createOrder` / `updateOrder`; the storefront only receives and returns the PayPal order id.

## Exact Provider Implementations

### `initiatePayment`

1. Reads `paypal_order_id` from existing payment session data.
2. If present, retrieves that PayPal Order.
3. If retrieval succeeds, returns the existing PayPal order id, normalized status, and merged session data.
4. If retrieval fails with PayPal `INVALID_RESOURCE_ID` / 404, treats the stale unapproved order as disposable and creates a new order.
5. Otherwise creates a PayPal Order through `PayPalClient.createOrder`.
6. Uses Medusa `input.amount`, `input.currency_code`, `input.context?.idempotency_key`, and optional `medusa_payment_session_id`.

### `authorizePayment`

1. Requires `paypal_order_id`.
2. Retrieves the PayPal Order.
3. If the order status is `APPROVED`, calls `PayPalClient.captureOrder`.
4. Returns status derived from the capture status. `COMPLETED` capture maps to Medusa `CAPTURED`; `PENDING` maps to pending authorization; denied/failed/reversed maps to error.
5. If the order is already captured, returns captured without calling capture again.

### `capturePayment`

1. Requires `paypal_order_id`.
2. Retrieves the PayPal Order.
3. Captures only if current order status is `APPROVED`.
4. Throws unless the resulting order maps to Medusa `CAPTURED`.
5. Returns merged session data including `paypal_capture_id`.

### `cancelPayment`

1. Returns original data if no PayPal order id exists.
2. Retrieves the PayPal Order.
3. Ignores stale missing resources and already terminal orders.
4. Does not call a PayPal cancel endpoint because CAPTURE-intent Orders do not have a general cancel endpoint; removing the Medusa session lets the unapproved external order expire.

### `refundPayment`

1. Requires `paypal_capture_id`.
2. Calls `PayPalClient.refundCapture`.
3. Uses `refund_idempotency_key` when present, otherwise Medusa idempotency context.
4. Returns `paypal_refund_id` and `paypal_refund_status`.

Refund is audited here only as provider behavior; refund runtime closure is out of scope for this phase.

### `getPaymentStatus`

1. Requires `paypal_order_id`.
2. Retrieves the PayPal Order.
3. Returns normalized status and session data from the retrieved order.

### `getWebhookActionAndData`

1. Verifies the PayPal webhook signature through `PayPalClient.verifyWebhook`.
2. Attempts to resolve the Medusa payment session id from `resource.custom_id`, `resource.invoice_id`, or `purchase_units[0].custom_id`.
3. For capture webhooks with only `supplementary_data.related_ids.order_id`, retrieves the PayPal Order and reads its purchase-unit `custom_id`.
4. Maps supported events:
   - `PAYMENT.CAPTURE.COMPLETED` -> `PaymentActions.SUCCESSFUL`
   - `PAYMENT.CAPTURE.REFUNDED` -> `PaymentActions.SUCCESSFUL` in the provider, but the canonical route intercepts refund webhooks for refund reconciliation and does not run payment capture processing.
   - `PAYMENT.CAPTURE.PENDING` -> `PaymentActions.PENDING`
   - `PAYMENT.CAPTURE.DENIED` and `PAYMENT.CAPTURE.REVERSED` -> `PaymentActions.FAILED`
   - `CHECKOUT.ORDER.APPROVED` and `PAYMENT.AUTHORIZATION.CREATED` -> `PaymentActions.AUTHORIZED`
   - all others -> `PaymentActions.NOT_SUPPORTED`

`PAYMENT.AUTHORIZATION.VOIDED` is not explicitly mapped and therefore returns `NOT_SUPPORTED`.

## Call Graph

```text
storefront checkout
  -> /store/carts/:id/payment-recovery
       -> ensureCartPaymentReady
       -> create payment collection if missing
       -> create pp_paypal_paypal session
       -> provider.initiatePayment
            -> PayPalClient.createOrder(intent CAPTURE)
       -> paymentModule.updatePaymentSession
            -> links PayPal purchase_unit.custom_id to Medusa payment_session.id
  -> PayPal Buttons createOrder returns session.paypalOrderId
  -> buyer approves PayPal Order
  -> onApprove calls backend complete-cart
  -> /store/carts/:id/complete
       -> completeCartWorkflow / Medusa payment processing
       -> provider.authorizePayment
            -> PayPalClient.captureOrder when order is APPROVED
       -> Medusa order
       -> seed one fulfillment_order as pending_capture
       -> sync paid/captured payment if already available
  -> /hooks/payment/paypal_paypal
       -> provider.getWebhookActionAndData verifies PayPal signature
       -> paypal:{event_id} dedupe
       -> processPaymentWorkflow for successful captures
       -> PaymentEvents.CAPTURED subscriber
       -> markOrderPaidAndFulfillmentWaiting
       -> fulfillment_order pending_capture -> waiting
```

## Linkage

| Identifier | Linkage |
| --- | --- |
| PayPal order id | Stored as `payment_session.data.paypal_order_id`, duplicated as `data.id`, exposed to the storefront as `paypalOrderId`, and saved to checkout payment attempts as `provider_payment_id`. |
| PayPal capture id | Stored as `payment_session.data.paypal_capture_id` after capture evidence is available. |
| Medusa payment session id | The payment-recovery route writes it to PayPal session data as `medusa_payment_session_id` and patches the PayPal Order purchase-unit `custom_id` to the same value. |
| Medusa payment collection id | The checkout payment attempt stores it; fulfillment rows store `payment_collection_id`, allowing `payment.captured` subscriber lookup to resolve the Medusa order. |

## Duplicate And Recovery Controls

- Buyer approval and backend capture are not duplicated in the storefront. The PayPal button only returns the existing PayPal order id and calls the single backend place-order path.
- `authorizePayment` captures only when the PayPal Order is `APPROVED`; retries against already captured orders return captured status without another capture call.
- `PayPalClient.request` sends a hashed `PayPal-Request-Id` when a stable request id is supplied.
- Canonical webhooks dedupe PayPal event ids with `paypal:{event_id}` before running `processPaymentWorkflow`.
- If webhook processing fails after reserving the dedupe key, the route releases the dedupe reservation.
- The shared `payment.captured` subscriber dedupes side effects by `payment.captured:{payment_id}` and the shared fulfillment helper fails closed if more than one fulfillment row exists.

## Current Gaps Before Runtime Closure

1. Region enablement for `pp_paypal_paypal` must be verified or run through a guarded sandbox setup.
2. A PayPal sandbox runtime fixture and buyer approval path still need real sandbox evidence.
3. Runtime evidence must prove exactly one fulfillment order for the completed PayPal order.
4. Failure/recovery runtime evidence is still needed for buyer cancel, duplicate `onApprove`, duplicate complete-cart, and webhook replay.

## Runtime Progress

The guarded PayPal fixture setup was run with:

```text
PAY_PAYPAL_E2E_SETUP=true
PAY_PAYPAL_CREATE_RUNTIME_ACCOUNTS=true
NODE_ENV=development
PAYPAL_ENVIRONMENT=sandbox
```

The fixture created:

```text
store: mkt01_paypal_runtime_20260801_store
product: mkt01_paypal_runtime_20260801_product
seller: mkt01_paypal_seller_runtime_20260801@example.com
native product: prod_01KYXNSXV7EG6EVG5HVVRCG56C
native variant: variant_01KYXNSY9CXG9RW5CQZ8S640DZ
```

`paypal:region:setup` returned `PAYPAL_REGION_ALREADY_ENABLED=all`.

`pay-paypal:http-smoke` proved:

```text
product visible to seller and buyer
buyer carts isolated
priced shipping option selected
region: reg_01KX2M8ZR2CP0MYE4ZA4WMXBFP
providers: pp_paypal_paypal, pp_stripe_stripe
```

`pay-paypal:live-e2e` reached the sandbox approval gate:

```text
cart: cart_01KYXPTEFAR3BAKN5YF650B0FV
payment collection: pay_col_01KYXPTFVY5S9JSKGECS3P3DJN
payment session: payses_01KYXPTFX1HBG19PF92DBZNX74
PayPal order: 3CN848320C473360L
PayPal order status: CREATED
approval URL present: true
closure_claimed: false
```

Current blocker: no PayPal sandbox buyer credentials are configured locally, so buyer approval, capture, Medusa order creation, visibility, captured-payment sync, and exactly-one fulfillment runtime proof are not complete yet.
