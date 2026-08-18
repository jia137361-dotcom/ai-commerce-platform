# Affiliate automatic commission handoff

## Scope

This change implements the CiiVerse `Customized Products` referral program. It covers referral links and codes, automatic commission creation and wallet credit, cancellation/refund reversal, buyer-facing referral pages, and seller-side commission review.

No PayPal, Stripe, buyer, or business sandbox credentials are stored in this change.

## Rules implemented

- First successful referred order: 25%.
- Future successful orders: 8% for 12 months from the first successful order.
- Commission currency: USD.
- Eligible value excludes shipping, taxes, import/export fees, coupons, and discounts.
- Paid order creates a `pending` commission.
- Only an order with status `completed` can become `released` and credit the referrer's wallet.
- Cancelled orders and any successful full or partial refund earn USD 0.
- A refund after release creates an idempotent negative wallet adjustment.
- Matching PayPal payer and referrer payout email cancels the commission as a referral-policy violation.
- Minimum wallet withdrawal defaults to USD 5.

The existing order-completion policy remains authoritative. There is no separate “seven days after receipt” commission timer.

## Buyer routes

- `GET /store/referrals/program`
- `GET /store/customers/me/referrals`
- `POST /store/customers/me/referrals/claim`
- `/affiliates`
- `/affiliates/customized-products`
- `/account/referrals`
- `/account/register?ref=CODE`

## Seller routes

- `GET /admin/referrals/commissions`
- `POST /admin/referrals/commissions/:id/action`

Supported actions are `freeze`, `unfreeze`, `release`, `cancel`, and `adjust`.

## Lifecycle integration

- Payment captured subscriber creates the pending commission.
- Buyer receipt confirmation and automatic order completion release eligible commission.
- Buyer cancellation marks the commission as order-cancelled.
- Successful Stripe or PayPal refund marks it as order-refund and reverses released wallet credit.
- Hourly reconciliation retries pending commission transitions.

## Database migration

Run:

```bash
npm run db:migrate
```

The migration creates:

- `mc_referral_profile`
- `mc_referral_attribution`
- `mc_referral_commission`

## PayPal coordination boundary

This change automates commission release into the internal USD wallet. PayPal account binding, payout fees, and the final monthly PayPal batch schedule remain part of the payment/payout integration and can consume the existing wallet withdrawal records.
