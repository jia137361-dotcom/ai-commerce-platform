# Cashback wallet and PayPal withdrawals

This is the manual-credit MVP that the referral/affiliate implementation can call later. All wallet rows are isolated by `store_id` and `customer_id`.

## Money flow

1. Seller selects a buyer and credits an amount in a supported source currency.
2. Backend reads `customer.metadata.buyer_preferences.currency_code` and converts the credit with the fixed development FX table. `auto` keeps the source currency.
3. Buyer sees the available balance in `/account/wallet`.
4. Buyer requests a withdrawal. The backend resolves the email from the buyer's saved PayPal Vault method, creates a debit hold under a distributed lock, and calls PayPal Payouts.
5. Mock payouts complete immediately. Sandbox payouts use PayPal's asynchronous Payouts API and remain `processing` until a wallet refresh observes the final batch/item status.

Amounts are stored as integer minor units. A processing withdrawal is deducted from available balance. A failed payout releases the debit.

## Seller APIs

`GET /admin/buyer-cashback/buyers?q=buyer@example.com`

Lists buyers and their wallet balances for the current `X-Store-Id`.

`POST /admin/buyer-cashback/credit`

```json
{
  "customer_id": "cus_123",
  "amount": 1,
  "currency_code": "hkd",
  "description": "Referral cashback",
  "reference_id": "commission_order_123"
}
```

`reference_id` is optional for the demo and should be supplied by the future commission job. It is unique per store, buyer, and ledger type, so retries do not double-credit.

## Buyer APIs

`GET /store/customers/me/wallet`

Returns balances, masked PayPal email, payout mode, ledger entries, and withdrawals for the authenticated buyer and current store.

`POST /store/customers/me/wallet/withdrawals`

```json
{
  "amount": 1,
  "currency_code": "hkd",
  "request_id": "client-generated-unique-id"
}
```

The recipient email is never accepted from this request. It comes from the buyer's bound PayPal Vault account.
`request_id` is required and uniquely scoped to the store and buyer. Reusing it returns the existing withdrawal instead of creating another ledger debit.
Only currencies supported by PayPal Payouts can be withdrawn. Unsupported buyer display currencies remain visible in the wallet and return a validation error rather than being converted silently at withdrawal time.

## Configuration

```env
PAYPAL_PAYOUTS_MODE=mock
WALLET_MIN_WITHDRAWAL_MAJOR=1
```

- `mock`: local demo; marks the withdrawal paid without sending money.
- `sandbox`: calls PayPal Sandbox Payouts with `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`. The PayPal app must have Payouts permission.
- unset in production: disabled.

This payout is funded by the platform PayPal Business account represented by the backend credentials. A seller's Stripe Connect account and a buyer's PayPal Vault token cannot fund PayPal Payouts. Per-seller PayPal funding requires PayPal Commerce Platform partner onboarding and delegated permissions, which is outside this MVP.

Before using live money, replace the fixed FX table with a versioned rate source, add a signed PayPal Payouts webhook, add finance review/risk controls, and implement reconciliation reporting.
