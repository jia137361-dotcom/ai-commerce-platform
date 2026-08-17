# Payment Amount Pipeline Repair

## Scope

Repair the buyer checkout amount pipeline for Stripe and PayPal without redesigning seller settlement or changing historical paid transactions.

The repaired flow must guarantee that one server-derived amount is used by checkout display, the Medusa payment collection, the provider charge, the completed order, refunds, and seller payout calculations.

## Confirmed Failures

Order `#43` proves the current failure mode:

- Cart merchandise was stored as `23392` and shipping as `500`.
- Medusa payment collection and payment session were `23892`.
- The Medusa 2.14 Stripe provider treated `23892` as a major-unit amount and created a Stripe PaymentIntent for `2389200` minor units, charging `HKD 23,892.00`.
- The plan discount `58.48` and payable total `180.44` existed only in order metadata. They did not reduce the cart, payment collection, provider charge, or order summary.
- The success and order views reconstructed totals independently, so they displayed values different from the captured payment.
- Post-order work in the complete route can return HTTP 400 after Medusa has already created the order.
- The customer order-list route can change a completed payment attempt to `expired` after its reservation timestamp.

## Canonical Money Contract

Medusa 2.14 amounts use major currency units throughout application and Medusa module boundaries.

Examples for HKD:

| Boundary | Correct value for HKD 180.44 |
| --- | ---: |
| Product/cart/shipping/adjustment | `180.44` |
| Payment collection/session/payment/capture | `180.44` |
| Stripe PaymentIntent API | `18044` |
| PayPal Orders API decimal | `"180.44"` |
| Storefront/order/refund API | `180.44` |

Only a payment provider converts major units to its external representation. Stripe's installed Medusa provider already performs this conversion. PayPal serializes the major-unit amount as a decimal string.

No browser request may supply the authoritative amount.

## Pricing And Discounts

The backend calculates merchandise, shipping, coupon discount, plan discount, tax, and payable total from the current cart.

Coupon and plan discounts must be represented by Medusa cart line-item adjustments before a payment collection or session is created. The adjustment carries stable metadata identifying its source and is replaced idempotently whenever cart contents, shipping, customer plan, or coupon selection changes.

The resulting Medusa cart total is the canonical checkout amount. The payment collection must equal that total. A provider session must not be exposed when these values differ.

Checkout pricing APIs return the same calculated Medusa totals for display. Order pages and success pages use completed order totals and payment data directly; metadata is descriptive and cannot override monetary totals.

## Payment Session Lifecycle

Before creating or reusing a Stripe or PayPal session:

1. Lock payment preparation by cart and provider.
2. Recalculate and synchronize discount adjustments.
3. Load the calculated cart total.
4. Create or update the payment collection and provider session.
5. Assert currency and amount equality across cart, payment collection, and payment session.
6. Retrieve the external provider object and assert its amount and currency.
7. Return the client secret or PayPal order ID only after all assertions pass.

The existing direct Stripe PaymentIntent amount correction is removed. It is a race-prone repair after the provider boundary and can be overwritten by later Medusa session updates.

Provider switching cannot delete or replace a session whose external payment succeeded or is processing. A successful provider payment is tied to one checkout attempt and can only proceed to order completion.

## Completion And Recovery

Medusa `completeCartWorkflow` remains the source of truth for order creation.

Once the workflow returns an order ID, the route records `completed_order_id` and returns a successful order response. Optional work such as design publishing, fulfillment payload synchronization, supplier push, and display metadata enrichment is isolated so its failure cannot turn an already-created order into HTTP 400.

If a request fails after provider success but before an order response, recovery retrieves the provider payment and searches for an order by `checkout_cart_id`. It completes the original cart or returns the existing order. It never creates a second charge.

`completed` is terminal. Expiry logic must never change an attempt with `completed_order_id`, a completed status, or a successful provider payment to `expired`.

The storefront redirects to `/checkout/success` whenever complete returns an order or recovery returns `completed_order_id`. A no-3DS test card is not expected to open a Stripe popup; only provider-required actions may redirect or display authentication UI.

## Refunds And Payouts

Refund eligibility and full-refund defaults use the captured Medusa payment amount. Refund requests pass major units to the Medusa payment module; providers perform their own external conversion.

Seller payout logic derives its source amount from the captured payment in major units and converts to Stripe transfer minor units exactly once at the Stripe transfer boundary.

Historical overcharges are not automatically rewritten or refunded by this migration. They require explicit reconciliation because provider captures are immutable financial records.

## Data Migration

The migration converts legacy minor-unit values to Medusa major units for:

- active native product variant price-set amounts;
- open and incomplete cart line-item prices;
- open cart shipping-method amounts;
- open payment collections and sessions only when no provider payment has succeeded, been authorized, captured, or entered processing.

The migration does not modify:

- completed carts;
- completed orders or order summaries;
- authorized or captured payments;
- captures, refunds, transfers, or provider objects;
- historical order metadata.

The migration is idempotent and records its version. It performs preflight counts and aborts on ambiguous rows instead of guessing whether an amount is legacy minor or current major format.

## Verification

Automated regression coverage must prove:

- `HKD 233.92` plus `HKD 5.00` minus `HKD 58.48` produces one canonical total of `HKD 180.44`.
- Stripe receives `18044`, not `1804400`.
- PayPal receives `"180.44"`.
- Checkout display, cart total, payment collection, payment session, completed order, captured amount, refundable amount, and payout source all agree.
- A successful card confirmation followed by order completion redirects to success.
- A failure after order creation is recovered as the existing order and never charges again.
- Completed attempts cannot expire.
- Provider switching cannot replace successful payments.
- Migration changes only eligible product/open-cart rows and is idempotent.

Verification uses Stripe test mode and PayPal sandbox only. No new live charge is created during automated testing.
