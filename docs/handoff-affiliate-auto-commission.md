# Affiliate automatic commission handoff

## Scope

This change implements the CiiVerse `Customized Products` referral program. It covers referral links and codes, automatic commission creation and wallet credit, cancellation/refund reversal, buyer-facing referral pages, seller-side commission review, merchant-approved withdrawal requests, and the monthly PayPal payout queue.

No PayPal, Stripe, buyer, or business sandbox credentials are stored in this change.

## Rules implemented

- Default first successful referred order rate: 25%.
- Default future successful order rate: 8% for 12 months from the first successful order completion. Each store can update these rates and the earning period.
- Commission currency: USD.
- Eligible value excludes shipping, taxes, import/export fees, coupons, and discounts.
- Paid order creates a `pending` commission.
- Only an order with status `completed` can become `released` and credit the referrer's wallet.
- Cancelled orders and any successful full or partial refund earn USD 0.
- A refund after release creates an idempotent negative wallet adjustment.
- Matching PayPal payer email or payer ID with the referrer's bound PayPal identity cancels the commission as a referral-policy violation.
- The first attribution wins during the active 12-month relationship. After expiry, the relationship is marked `expired` and the buyer can bind a new referrer.
- The referrer dashboard includes both the referred-customer list and order commission list.
- Minimum wallet withdrawal defaults to USD 5.
- PayPal payout currency is USD and `amount >= minimum_withdrawal` is accepted.
- A withdrawal reserves wallet funds as `pending`, requires merchant approval, and is processed on the 20th in Hong Kong time.
- The requested wallet amount is gross. The default user fee estimate is 2% with a USD 50 cap, so a USD 5 request sends an estimated USD 4.90 payout. PayPal's actual item fee is stored when returned and an idempotent wallet adjustment reconciles any difference.
- Platform/configuration payout failures retry automatically up to three attempts. Recipient failures require corrected user details and merchant retry or rejection.

The existing order-completion policy remains authoritative. There is no separate “seven days after receipt” commission timer.

## Buyer routes

- `GET /store/referrals/program`
- `GET /store/customers/me/referrals`
- `POST /store/customers/me/referrals/claim`
- `GET /store/customers/me/wallet`
- `POST /store/customers/me/wallet/withdrawals`
- `/affiliates`
- `/affiliates/customized-products`
- `/account/referrals`
- `/account/register?ref=CODE`

## Seller routes

- `GET /admin/referrals/commissions`
- `POST /admin/referrals/commissions/:id/action`
- `GET|POST /admin/referrals/program`
- `GET /admin/wallet/withdrawals`
- `POST /admin/wallet/withdrawals/:id/action`

Commission actions are `freeze`, `unfreeze`, `release`, `cancel`, and `adjust`. Withdrawal actions are `approve`, `reject`, and `retry`.

Commission status and withdrawal status are intentionally separate:

- Commission: `pending`, `released`, `frozen`, `order_cancelled`, `order_refund`, `cancelled`, `expired`.
- Withdrawal: `pending`, `approved`, `processing`, `paid`, `failed`, `rejected`.

## Lifecycle integration

- Payment captured subscriber creates the pending commission.
- Buyer receipt confirmation and automatic order completion release eligible commission.
- Buyer cancellation marks the commission as order-cancelled.
- Successful Stripe or PayPal refund marks it as order-refund and reverses released wallet credit.
- Hourly reconciliation retries pending commission transitions.
- A 15-minute scheduler checks HKT day 20 and sends merchant-approved withdrawals to the existing PayPal Payouts integration.

## Database migration

Run:

```bash
npm run db:migrate
```

The migration creates:

- `mc_referral_profile`
- `mc_referral_attribution`
- `mc_referral_commission`
- `mc_referral_program_setting`

The follow-up migration also expands withdrawal statuses and makes the referral-attribution uniqueness constraint apply only to active relationships.

## PayPal coordination boundary

PayPal account binding continues to provide `email + vault_id`; payer ID is retained when PayPal supplies it. The withdrawal service calls the existing PayPal Payouts wrapper only after merchant approval and during the HKT monthly settlement window. Sandbox/production credentials remain environment-only and must never be committed.

PayPal Payouts requires the sender balance to cover the payout amount plus provider fees. The application therefore deducts the configured user fee before sending, then reconciles it against PayPal's returned item fee. Configure `PAYPAL_PAYOUT_USER_FEE_BPS` and `PAYPAL_PAYOUT_USER_FEE_CAP_MAJOR` if the merchant's PayPal pricing differs from the default business rule.

Using wallet balance as a checkout tender is not implemented here. That requires a separate Cart/Payment contract so wallet reservations, partial payment, cancellation, and refund behavior remain atomic with order creation.
