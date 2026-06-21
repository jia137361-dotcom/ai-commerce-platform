# PAY-STRIPE-01 Test-Mode Checkout

Date: 2026-06-21
Branch: `merge-seller-into-buyer`

## Implemented Flow

1. Medusa registers `@medusajs/payment-stripe` only when `STRIPE_API_KEY` is present.
2. Installed-version options use `capture: true` and `automaticPaymentMethods: true`.
3. `npm --workspace apps/medusa-backend run stripe:region:setup` preserves existing region providers and adds `pp_stripe_stripe`.
4. Storefront lists official region providers through `GET /store/payment-providers?region_id=...`.
5. Stripe selection creates/reuses the cart payment collection through `POST /store/payment-collections`.
6. It creates the official session through `POST /store/payment-collections/:id/payment-sessions`.
7. Payment Element renders only with `VITE_STRIPE_PK=pk_test_...` and a returned PaymentIntent `client_secret`.
8. Stripe confirmation must return `succeeded`, `processing`, or `requires_capture` before storefront calls the existing Medusa cart-complete bridge.
9. Backend rejects Stripe completion without an existing official session/client secret using `STRIPE_PAYMENT_SESSION_REQUIRED`.
10. Success UI displays backend-returned payment status and never stores or renders a client secret.

No custom payment endpoint was created.

## Isolated Fixture

- seller: `mkt01_stripe_seller_20260621_01@example.com`
- store: `mkt01_stripe_test_store_20260621_01`
- product: `mkt01_stripe_test_product_20260621_01`
- native product: `prod_01KVM7Z8CK4PP4B6KYZGN77PN7`
- native variant: `variant_01KVM7Z8DV5AVHTB4JH1KDFGPB`
- product price: USD 39
- shipping required: yes
- Buyer A: `mkt01_stripe_buyer_a_20260621_01@example.com`
- Buyer B: `mkt01_stripe_buyer_b_20260621_01@example.com`

Passwords and Stripe secrets are not committed. `PAY_STRIPE_TEST_PASSWORD` is required by the HTTP smoke script.

The fixture setup is idempotent and creates at most one product:

```bash
PAY_STRIPE_E2E_SETUP=true \
npm --workspace apps/medusa-backend run pay-stripe:e2e:setup
```

## Live Verification Reached

- seller token authenticated and seller product list returned the test product
- buyer `/store/products` and product detail returned the same real product
- buyer native variant matched `variant_01KVM7Z8DV5AVHTB4JH1KDFGPB`
- two authenticated buyer accounts were created
- buyer carts used different cart IDs and different customer IDs
- both cart lines used the same selected native variant
- Medusa price calculation returned 3900 minor units
- product requires shipping
- cart region resolved to `reg_01KRMT56X5MCH0A9DTSNZ81GFW` and country `cn`
- the region currently returns a historical `pp_stripe-blik_stripe` relation, not the required enabled card provider `pp_stripe_stripe`

## Current External Blockers

The local environment has no:

- `STRIPE_API_KEY=sk_test_...`
- `STRIPE_WEBHOOK_SECRET=whsec_...`
- storefront `VITE_STRIPE_PK=pk_test_...`
- installed/authenticated Stripe CLI

The test product shipping profile also needs the existing flat-rate setup command below. Its execution was attempted but rejected by the execution environment’s elevated-command usage limit; no fake shipping amount was substituted.

## Exact Continuation Commands

Configure local, uncommitted env files first. Restart Medusa after adding the secret key.

```bash
BATCH11_SMOKE_VARIANT_ID=variant_01KVM7Z8DV5AVHTB4JH1KDFGPB \
npm --workspace apps/medusa-backend exec -- \
  medusa exec ./src/scripts/batch11-shipping-smoke-setup.ts
```

Enable the registered card provider without removing the system/manual providers:

```bash
npm --workspace apps/medusa-backend run stripe:region:setup
```

Run the isolated alignment/cart smoke:

```bash
PAY_STRIPE_TEST_PASSWORD='<local-test-password>' \
npm --workspace apps/medusa-backend run pay-stripe:http-smoke
```

Start webhook forwarding after installing and authenticating Stripe CLI:

```bash
stripe listen \
  --events payment_intent.amount_capturable_updated,payment_intent.succeeded,payment_intent.payment_failed,payment_intent.partially_funded \
  --forward-to localhost:9000/hooks/payment/stripe_stripe
```

Copy the CLI-generated `whsec_...` only into `apps/medusa-backend/.env`, restart backend, and use Stripe test card `4242 4242 4242 4242` in Payment Element.

## Seller Tenancy Caveat

The seller dashboard authenticates a Medusa admin user but selects custom-store scope from client-supplied `X-Store-Id`. The fixture records `owner_user_id` and a `store_member`, but current middleware does not enforce that membership. This is suitable for an isolated local test, not production seller authorization.
