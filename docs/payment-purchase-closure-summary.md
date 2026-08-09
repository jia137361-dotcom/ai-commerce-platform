# Payment Purchase Closure Summary

Date: 2026-08-01

Scope: buyer checkout purchase closure for Stripe test mode and PayPal sandbox. Refunds, seller payout, and Stripe Connect settlement are separate payment domains.

## Status

| Provider | Mode | Status | Evidence |
| --- | --- | --- | --- |
| Stripe | test | runtime_verified | `docs/evidence/stripe-payment-closure.json` |
| PayPal | sandbox | runtime_verified | `docs/evidence/paypal-payment-closure.json` |

## Verified Invariants

| Invariant | Stripe | PayPal |
| --- | --- | --- |
| One provider payment | runtime_verified | runtime_verified |
| One provider/Medusa capture | runtime_verified | runtime_verified |
| One Medusa order | runtime_verified | runtime_verified |
| Buyer order visibility | runtime_verified | runtime_verified |
| Seller order visibility | runtime_verified | runtime_verified |
| Exactly one fulfillment order | runtime_verified | runtime_verified |
| Fulfillment status | `waiting` | `waiting` |

## Runtime Identifiers

Stripe:

- cart: `cart_01KYWNRTYEYEE7PT6NP57E58MG`
- payment collection: `pay_col_01KYWNRW4GSE0WDQ37DF34T446`
- payment session: `payses_01KYWNS4E4NZ70T6Y8P4APAYTN`
- payment intent: `pi_3TzKqhRz4711Gbmd1TEuQo00`
- order: `order_01KYWNSNKJCXVX3HKVT4KZ201V`
- fulfillment order: `01KYWNSQ0ASSWP3VGRZR162VCA`

PayPal:

- cart: `cart_01KYXPTEFAR3BAKN5YF650B0FV`
- payment collection: `pay_col_01KYXPTFVY5S9JSKGECS3P3DJN`
- payment session: `payses_01KYXPTFX1HBG19PF92DBZNX74`
- PayPal order: `69907622C8410804N`
- PayPal capture: `1U0155257Y195344J`
- Medusa payment: `pay_01KYYYA9ACX6BBV1TF5AXQD4S6`
- Medusa capture: `capt_01KYYYA9DCB3MYEJCXAZAA3NEG`
- order: `order_01KYYYA5T3MQMQA6YA5TP6QBDA`
- fulfillment order: `01KYYYAA83XX7ZQE1Y6FBK9WDE`

## Secret And Redaction Review

Evidence files contain runtime IDs, statuses, amounts, and redacted diagnostics only. They do not contain:

- access tokens
- client secrets
- webhook secrets
- session cookies
- buyer passwords
- full payer personal data

Diff review found expected code references to environment variable names such as `PAYPAL_CLIENT_SECRET`, `STRIPE_API_KEY`, and `STRIPE_WEBHOOK_SECRET`. Local env files in the dirty worktree contain test/sandbox secret values and must remain uncommitted. No evidence file should copy values from local env files.

## PayPal Fixture Password Reset Script Review

`apps/medusa-backend/src/scripts/pay-paypal-reset-test-buyer-password.ts` is a local Medusa exec script, not an HTTP route. Static and focused unit-test review confirms it:

- refuses `NODE_ENV` values other than `development`
- requires `PAY_PAYPAL_E2E_SETUP=true`
- requires `PAYPAL_ENVIRONMENT=sandbox`
- targets only customer `cus_01KYXNV5932TGV6SKJ17F1J6T5`
- targets only email `mkt01_paypal_buyer_runtime_20260801_a@example.com`
- verifies the auth identity is bound to that exact customer before mutation
- reads the new password only from `PAY_PAYPAL_TEST_PASSWORD`
- does not print or persist the password

The script was not needed for final PayPal purchase closure because the existing browser session completed the cart.
