# Payment Handoff

Date: 2026-08-09

## Overview

This branch closes the current payment work for the single-store MVP:

- Stripe card checkout and saved-card checkout
- PayPal Sandbox checkout
- Stripe Apple Pay and Google Pay through `ExpressCheckoutElement`
- buyer refund requests and seller refund decisions
- provider refund execution, idempotency, and recovery evidence
- payment-capture synchronization and fulfillment gating
- Cloudflare HTTPS and Vite host-allowlist guidance for wallet testing

Status words in this document are deliberate:

- **IMPLEMENTED**: source code and focused tests exist.
- **RUNTIME VERIFIED**: recorded test/sandbox evidence proves a completed flow.
- **STILL NEEDS E2E**: use a fresh cart and do not infer runtime success from source or unit tests.

## Repository And Layout

- Repository: `jia137361-dotcom/ai-commerce-platform`
- Branch: `codex/ciiverse-0714-web-fixes`
- Example worktree: `/Users/Zhuanz/Downloads/ai-commerce-platform/.worktrees/ciiverse_0714`
- Backend: `apps/medusa-backend`
- Storefront: `apps/storefront`
- Storefront development port: `5174`
- Medusa development port: `9000`

The worktree path is only a local example. Use the path of your own checkout.

## Local Start

Install dependencies:

```bash
npm install
```

Apply backend migrations:

```bash
npm --workspace apps/medusa-backend run db:migrate
```

Start Medusa:

```bash
npm --workspace apps/medusa-backend run dev
```

Start the storefront in a second terminal:

```bash
npm --workspace apps/storefront run dev
```

The backend uses PostgreSQL and Redis. A historical local setup used
`postgres://medusa:medusa@localhost:5433/ai_commerce`; it is only a development
example, not a requirement for another engineer's database.

Relevant environment variable names, without values:

```text
DATABASE_URL
REDIS_URL
JWT_SECRET
COOKIE_SECRET
STORE_CORS
AUTH_CORS
ADMIN_CORS
DEFAULT_STORE_ID
STRIPE_API_KEY
STRIPE_WEBHOOK_SECRET
VITE_STRIPE_PK
PAYPAL_CLIENT_ID
PAYPAL_CLIENT_SECRET
PAYPAL_ENVIRONMENT
PAYPAL_WEBHOOK_ID
PAYPAL_BRAND_NAME
PAYPAL_RETURN_URL
PAYPAL_CANCEL_URL
STOREFRONT_URL
VITE_PAYPAL_CLIENT_ID
VITE_MEDUSA_BASE_URL
NEXT_PUBLIC_MEDUSA_BACKEND_URL
VITE_PUBLISHABLE_API_KEY
```

Do not commit `.env`, `.env.local`, provider credentials, webhook secrets,
buyer passwords, cookies, or generated runtime output.

## Stripe Card

**IMPLEMENTED.** The card entry point is
`apps/storefront/src/components/checkout/CheckoutPaymentPanel.tsx`. It selects
the official `pp_stripe_stripe` provider and mounts `StripePaymentForm` inside
Stripe `Elements` only when the backend returns a valid PaymentIntent
`client_secret`.

The payment session is prepared/recovered through:

```text
POST /store/carts/:id/payment-recovery
```

The route reuses a viable payment collection/session/PaymentIntent where
possible. `CheckoutPaymentPanel` treats **Card form ready** as the
`PaymentElement.onReady` lifecycle event, not merely the presence of a client
secret. The button remains disabled until the element is ready.

Stripe.js loading is centralized in
`apps/storefront/src/lib/stripe-loader.ts`. It keeps one promise per
publishable key and evicts a failed/null load so a retry does not pin a
transient browser/CDN failure. The checkout panel records safe diagnostics for
Stripe.js loading, Elements initialization, Element readiness, and Element
load errors.

The browser runs `elements.submit()` and `stripe.confirmPayment()` with
`redirect: "if_required"`. Only `succeeded`, `processing`, or
`requires_capture` proceeds to `completeCart`. The payment-method label is
derived from the confirmed payment method and returned with the completed
order state.

Medusa registers `@medusajs/payment-stripe` only when `STRIPE_API_KEY` is
present. `medusa-config.ts` sets:

```ts
capture: true
automaticPaymentMethods: true
```

Capture evidence is synchronized by `payment-captured-sync.ts`. The helper
dedupes `payment.captured:{payment_id}`, fails closed if an order has multiple
custom fulfillment rows, and only repairs a single `pending_capture` row to
`waiting`.

**RUNTIME VERIFIED (historical fixture):** Stripe test purchase closure is
recorded in `docs/evidence/stripe-payment-closure.json`: one PaymentIntent,
one Medusa order, one capture, buyer/seller visibility, and one fulfillment
row in `waiting`.

**STILL NEEDS E2E:** Run a fresh post-UI-change Stripe card purchase. Do not
describe the latest Card UI as fully runtime verified until a fresh purchase
and order closure are recorded.

## PayPal Sandbox

**IMPLEMENTED.** PayPal needs two separate things:

1. **PayPal Developer App credentials** for the backend and browser SDK:
   `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENVIRONMENT=sandbox`,
   `PAYPAL_WEBHOOK_ID`, and storefront `VITE_PAYPAL_CLIENT_ID`.
2. A **PayPal Sandbox Personal buyer account** to log into the popup and
   approve a purchase.

Developer App credentials are not a Sandbox buyer login.

When all required backend variables exist and the environment is exactly
`sandbox`, Medusa loads `apps/medusa-backend/src/modules/paypal` as
`pp_paypal_paypal`. The payment-recovery route creates or reuses the payment
collection/session and stores the PayPal Order ID. The storefront loads the
PayPal JS SDK Buttons with the publishable client ID, returns the existing
backend-created Order ID from `createOrder`, verifies it on approval, prevents
double approval with a single-flight guard, then uses the one backend
complete-cart path. The provider captures an `APPROVED` order and treats an
already captured order as a reuse, not a second capture.

The backend uses minor units internally and converts them for PayPal provider
requests. The frontend validates the provider Order ID before rendering the
button. Payment recovery records provider payment IDs and supports stale
session/order recovery.

**RUNTIME VERIFIED (historical fixture):**

```text
store: mkt01_paypal_runtime_20260801_store
product: mkt01_paypal_runtime_20260801_product
cart: cart_01KYXPTEFAR3BAKN5YF650B0FV
payment collection: pay_col_01KYXPTFVY5S9JSKGECS3P3DJN
payment session: payses_01KYXPTFX1HBG19PF92DBZNX74
PayPal Order: 69907622C8410804N
PayPal Capture: 1U0155257Y195344J
Medusa Order: order_01KYYYA5T3MQMQA6YA5TP6QBDA
```

This fixture is closed. Do not recapture, refund, recover, or otherwise mutate
it. Any new PayPal E2E must create a fresh cart.

## PayPal Full Refund Closure

**RUNTIME VERIFIED.** The closed Sandbox refund is recorded in
`docs/evidence/paypal-refund-closure.json`.

```text
refund request: brr_01KZ0B4JWF95Z4PT19Q8ZVNFF9
order: order_01KYYYA5T3MQMQA6YA5TP6QBDA
provider: pp_paypal_paypal
amount: 4400 minor units (USD 44.00)
original capture: 1U0155257Y195344J
PayPal refund: 3DT525181Y2054847
```

Final state:

- buyer refund request status: `refunded`
- provider attempt count: `1`
- Medusa refund rows: `1`
- PayPal refund count: `1`
- refunded amount: `4400`
- remaining refundable amount: `0`
- PayPal capture status: `REFUNDED`

Do not call recovery, submit another buyer refund request, or call the
provider refund endpoint for this fixture. The fulfillment row remains
`waiting`; payment refund closure is complete, while fulfillment
cancellation/compensation is a separate workflow gap.

## Refund Architecture

**IMPLEMENTED.** Buyer refund requests use authenticated and store-scoped
order access through `apps/medusa-backend/src/lib/buyer-order-access.ts`.
Buyer routes require the publishable key, store context, an authenticated
customer, ownership of the order, and verified email. Seller routes resolve
the seller session and filter by seller `store_id`.

`apps/medusa-backend/src/lib/refund-payment-context.ts` resolves the order,
payment collection, captured payment, PayPal capture ID, refunded total,
remaining refundable amount, and currency from the Medusa graph. Provider
execution in `refund-execution.ts` locks by refund request ID, persists
in-flight state, uses `refundPaymentWorkflow`, and records terminal provider
state without issuing a duplicate refund.

Key persistence migrations:

```text
apps/medusa-backend/src/modules/buyer-refund-requests/migrations/Migration20260619000100.ts
apps/medusa-backend/src/modules/buyer-refund-requests/migrations/Migration20260731000200.ts
apps/medusa-backend/src/modules/buyer-refund-requests/migrations/Migration20260802000300.ts
```

`model.bigNumber()` requires raw JSONB companion columns in the Medusa DML
schema; `Migration20260802000300.ts` adds and backfills
`raw_requested_amount`, `raw_eligible_amount`, and `raw_approved_amount`.

`apps/medusa-backend/src/scripts/recover-existing-refund-request.ts` is a
development-only, explicitly enabled, Sandbox-checked recovery tool for an
already interrupted refund request. It is not the normal buyer refund API
path.

**STILL NEEDS E2E:** Stripe refund closure remains blocked pending a fresh
authorized Stripe fixture and runtime proof of one provider refund plus one
Medusa refund row. Stripe refund webhook reconciliation also needs explicit
runtime proof.

## Apple Pay And Google Pay

**IMPLEMENTED; NOT YET RUNTIME VERIFIED.** Wallets are not separate Medusa
providers or fake buttons. `StripePaymentForm` uses Stripe
`ExpressCheckoutElement`, then reuses the same Stripe PaymentIntent, Medusa
payment session, payment collection, confirmation function, and `completeCart`
path as card payment.

The intended UI is:

```text
Payment method: Card
Quick pay: Stripe ExpressCheckoutElement
or pay with card
Stripe PaymentElement
Pay now
```

Never replace the Stripe Express Checkout element with a hand-drawn Apple Pay
or Google Pay button.

`apps/storefront/src/lib/stripe-wallet.ts` uses:

```text
development/test: applePay = "always", googlePay = "always"
production:       applePay = "auto",   googlePay = "auto"
```

The values affect presentation request behavior; Stripe's
`ExpressCheckoutElement.onReady.availablePaymentMethods` is the meaningful
availability result. A five-second development timeout is only a diagnostic
fallback and must not be read as an explicit Stripe `false`.

Apple Pay E2E prerequisites:

- HTTPS storefront
- storefront hostname registered in Stripe Sandbox/Test Payment Method Domains
- supported Apple device/browser
- configured Apple Wallet
- Safari preferred
- Stripe test mode

Google Pay E2E prerequisites:

- HTTPS storefront
- storefront hostname registered in Stripe Sandbox/Test Payment Method Domains
- supported Chrome/browser
- configured Google Pay or Google Wallet context
- Stripe test mode

Google Pay being unavailable on local HTTP does not prove a code failure;
localhost HTTP does not meet the wallet runtime prerequisite.

Development diagnostics report origin, protocol, HTTPS status, browser family,
and Apple Pay/Google Pay availability. For card troubleshooting, an Incognito
profile previously loaded PaymentElement where a normal Chrome profile timed
out. Treat that as profile/extension/cache/privacy/proxy evidence, not a
backend payment defect. Use a normal wallet-configured Chrome profile for
Google Pay and Safari with Apple Wallet for Apple Pay.

## Cloudflare HTTPS And Vite

Use a temporary storefront tunnel for wallet testing:

```bash
cloudflared tunnel \
  --protocol http2 \
  --edge-ip-version 4 \
  --url http://127.0.0.1:5174
```

Quick Tunnel creates `https://<random>.trycloudflare.com`; it is temporary,
its terminal must remain running, and a new tunnel can receive a new hostname.
When QUIC cannot connect on port 7844 but HTTP/2 works, the explicit
`--protocol http2` option is valid for this environment.

Vite is currently `5.4.21`, started as:

```text
vite --host 127.0.0.1 --port 5174 --strictPort
```

The current source includes an exact Vite `server.allowedHosts` entry for the
currently observed Quick Tunnel hostname. This is a narrow development
allowlist, not `allowedHosts: true` and not a wildcard for
`.trycloudflare.com`.

**IMPLEMENTED; PUBLIC RUNTIME RE-VERIFY REQUIRED.** A prior tunnel returned
HTTP 403 because Vite host validation rejected the Quick Tunnel Host header.
For every newly generated Quick Tunnel hostname, update the exact development
allowlist deliberately and restart Vite before testing. Do not put temporary
Quick Tunnel hostnames in production configuration.

Register the storefront host, not a URL, path, or backend host:

```text
Stripe Dashboard, Sandbox/Test mode
Payment Method Domains
Add domain
<storefront-host>.trycloudflare.com
```

Quick Tunnel hostnames are ephemeral, so re-register a new hostname when it
changes. Production requires a stable HTTPS storefront hostname and matching
live-mode domain configuration.

## Backend Tunnel Requirement

**CURRENT ANSWER: YES.**

Vite has proxies for `/auth`, `/store`, and `/admin`, but both storefront API
clients construct URLs from `VITE_MEDUSA_BASE_URL`, then
`NEXT_PUBLIC_MEDUSA_BACKEND_URL`. The current local storefront configuration
sets:

```text
VITE_MEDUSA_BASE_URL=http://127.0.0.1:9000
```

Therefore checkout, payment recovery, cart, buyer auth, orders, and refund
requests are currently requested directly by the browser at
`http://127.0.0.1:9000/...`. A remote browser viewing an HTTPS Quick Tunnel
storefront resolves that loopback address on the remote user's machine and
also hits mixed-content restrictions.

For the current architecture, expose the backend with a separate HTTPS tunnel:

```bash
cloudflared tunnel \
  --protocol http2 \
  --edge-ip-version 4 \
  --url http://127.0.0.1:9000
```

Then configure the storefront's `VITE_MEDUSA_BASE_URL` to the temporary HTTPS
backend URL and configure `STORE_CORS`, `AUTH_CORS`, and, where relevant,
seller/admin CORS to allow the HTTPS storefront origin. Do not commit that
temporary URL.

The alternative future change is to make browser API URLs relative
(`/store/...`, `/auth/...`) so Vite's same-origin proxy can serve:

```text
HTTPS storefront -> Vite proxy -> http://127.0.0.1:9000
```

Only after that change would the backend tunnel be unnecessary for storefront
traffic.

## Runtime Status

| Flow | Code | Focused tests | Runtime E2E | Status |
| --- | --- | --- | --- | --- |
| Stripe Card purchase | Implemented | Present | Historical test closure | RUNTIME VERIFIED; fresh post-UI E2E required |
| Stripe refund | Implemented | Present | Not completed | STILL NEEDS E2E |
| PayPal purchase | Implemented | Present | Sandbox closure | RUNTIME VERIFIED |
| PayPal full refund | Implemented | Present | Sandbox closure | RUNTIME VERIFIED |
| Buyer refund UI/API | Implemented | Present | PayPal fixture | RUNTIME VERIFIED for PayPal fixture |
| Seller refund decision | Implemented | Present | PayPal fixture visibility/evidence | RUNTIME VERIFIED for PayPal fixture |
| Apple Pay | Implemented | Focused tests | Not completed | STILL NEEDS E2E |
| Google Pay | Implemented | Focused tests | Not completed | STILL NEEDS E2E |
| Cloudflare Quick Tunnel | Command/config present | N/A | Tunnel connection observed | Public storefront re-check required |
| Vite public host | Exact allowlist present | N/A | Prior 403; post-change not proven | STILL NEEDS E2E |
| Fulfillment compensation after refund | Not implemented | N/A | Not completed | Known gap |

## Evidence And Related Documents

- `docs/evidence/stripe-payment-closure.json`
- `docs/evidence/stripe-refund-closure.json`
- `docs/evidence/paypal-payment-closure.json`
- `docs/evidence/paypal-refund-closure.json`
- `docs/payment-purchase-closure-summary.md`
- `docs/payment-capture-state-audit.md`
- `docs/payment-reconciliation-design.md`
- `docs/paypal-payment-closure-audit.md`
- `docs/payment-refund-audit.md`
- `docs/PAYMENT_OPERATIONS.md`

## Safe Next Steps

1. Fetch and checkout `codex/ciiverse-0714-web-fixes`.
2. Install dependencies and start PostgreSQL plus Redis.
3. Run `npm --workspace apps/medusa-backend run db:migrate`.
4. Start Medusa with the required test/sandbox environment variables.
5. Start storefront with `npm --workspace apps/storefront run dev`.
6. Verify local Stripe card behavior with a fresh cart.
7. Verify PayPal with a fresh cart and a real Sandbox Personal buyer account.
8. Verify the exact Vite allowed host for the current Quick Tunnel.
9. Start a storefront HTTPS tunnel and, under the current direct-backend
   architecture, a backend HTTPS tunnel.
10. Register the current storefront hostname in Stripe Sandbox Payment Method
    Domains.
11. Inspect `ExpressCheckoutElement.onReady.availablePaymentMethods`.
12. Run fresh Google Pay E2E with a configured Chrome wallet.
13. Run fresh Apple Pay E2E with Safari and Apple Wallet.
14. Run read-only reconciliation against resulting orders, captures, refunds,
    buyer visibility, seller visibility, and exactly one fulfillment row.
15. Do not mutate the closed historical PayPal refund fixture.

The first command for the next engineer is:

```bash
git switch codex/ciiverse-0714-web-fixes
```
