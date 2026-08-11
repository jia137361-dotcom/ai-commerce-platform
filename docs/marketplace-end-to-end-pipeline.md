# Marketplace End-to-End Pipeline Audit

Date: 2026-06-21
Branch: `merge-seller-into-buyer`
Batch: MKT-01

## Executive Result

The repository is an integrated marketplace prototype, not a production marketplace. Buyer authentication, catalog, cart, authorization-only checkout, orders, restricted cancellation, refund-request intent, seller product publishing, seller orders, supplier-order synchronization and tracking reads exist. Production Stripe, native multi-variant publishing, saved addresses, coupon redemption, returns/exchanges, chat and carrier tracking do not.

MKT-01 applies only safe fixes: buyer-scoped cart keys, country selection, shipping-price failure handling, honest payment UI, multi-native-variant frontend selection, seller-to-buyer store profile metadata, and tracking layout/data states. It does not add Stripe, coupons, address book, capture/refund, carrier APIs or chat.

## CART_ISOLATION_AUDIT

- cart key format before: `citigoo:{storeId}:cart_id`
- cart key format after: `citigoo:{storeId}:cart:{buyer:<customerId>|guest:<sessionId>}` (identity is URL encoded)
- includes store id: yes
- includes buyer/customer/session id: yes
- guest cart behavior: one random browser guest-session namespace; legacy shared key is quarantined/removed
- logged-in buyer cart behavior: customer-id namespace; server still binds the cart to the authenticated customer during checkout
- sign out behavior: buyer cart remains in its buyer namespace but becomes invisible to the guest namespace
- switch account behavior: next customer resolves a different key and cannot discover the previous buyer cart through the storefront
- can buyer A see buyer B cart: no through normal client routing after MKT-01; possession of a raw cart ID remains a backend hardening concern
- risk: backend cart reads still rely partly on cart-ID possession; customer-bound cart list/merge and signed possession are future work

## CART_ISOLATION_POLICY

- guest cart: isolated by store and browser guest-session ID
- logged-in buyer cart: isolated by store and Medusa customer ID
- sign out: do not delete the buyer cart; switch to the guest namespace
- switch account: use the new buyer namespace; never reuse the old buyer key
- login after guest cart: replace/isolate, not merge; guest cart stays in its guest namespace and the signed-in buyer starts/resumes the buyer cart. A server-validated merge is a backend TODO.

The `seller_admin_token` is untouched.

## STORE_PAGE_AUDIT

- buyer store page status: partial, production-like structure with real store/category/product/follow APIs
- seller store settings status: functional form and API; MKT-01 adds about, announcement, banner URL and gallery URLs
- backend store profile fields: `brand_name`, `logo_url`, `support_email`, SEO fields and extensible metadata
- fields connected buyer<->seller: name, logo, support email, description/about, announcement, banner, gallery, currency/language metadata and follower count
- missing fields: first-class typed gallery/profile model, banner upload pipeline, policies, opening hours, seller messaging and multi-store route resolution
- fixed: seller metadata no longer overwrites unrelated metadata; buyer hero/about/gallery consume the same saved fields
- remaining TODO: STORE-01 if typed validation, image upload lifecycle and `/store/:storeId` become necessary

## VARIANT_RUNTIME_AUDIT

- seller AI product can create multiple supplier variants: yes, draft/editor rows can contain several supplier variants
- seller publish creates native Medusa variants: no; `native-product-bridge.ts` creates one native `Default` option/variant
- buyer API returns native variants array: supported by the normalizer when the API supplies it
- buyer product normalizer preserves all native variants: yes
- ProductPurchasePanel can select multiple variants: yes
- Add to cart uses selected native variant id: yes
- current DB has multi-variant fixture: unknown; no live database assertion was used for this source audit
- fixed: product-level addability now recognizes any purchasable returned native variant instead of requiring only the legacy singular `medusa_variant_id`
- remaining: SUP-01 Supplier native variant mapping must create and persist one Medusa variant per supplier variant, including prices/options/inventory and reverse mapping

## ADD_TO_CART_AUTH_AUDIT

- logged-out browse store: allowed
- logged-out view product: allowed
- logged-out add to cart: redirects to `/account/sign-in?returnTo=<product URL>`
- login returnTo: validated same-origin relative path
- registered user returnTo: same behavior
- guest checkout remaining behavior: checkout action can still complete a valid historical guest cart, but the current UI cannot create a new guest cart because add-to-cart requires sign-in
- conflict: legacy guest checkout code remains for backward compatibility; product acquisition policy is authenticated-only

## CHECKOUT_AUDIT

- country select fixed: yes; ten displayed country names map to lowercase ISO codes
- delivery method handling fixed: yes; missing-price methods are disabled and raw Medusa errors are replaced with an actionable unavailable message
- payment method honest state: `pp_system_default`, authorization only, no capture; disabled card preview collects/stores nothing
- Stripe TODO: PAY-01 provider/security/state-machine audit; PAY-02 Stripe test-mode Payment Element, failure-to-pending flow, 15-minute payment window, timeout cancellation, webhook idempotency and reconciliation

## REVIEW_AFTERSALES_AUDIT

- product rating UI: reads real averages/counts when available
- product review list: real GET API exists; mock fallback remains visibly marked when the backend fails
- purchased-only review capability: backend POST checks order/product/email and one review per order/product/email, but does not yet require delivered/received state and the buyer composer is absent
- after-sales entry in order detail: cancellation and pending refund-request intent exist; tracking quick action marks return unavailable
- return/exchange workflow: missing
- seller approval workflow: missing
- buyer-seller chat: missing

Planned: `REVIEW-01` (authenticated order-item entitlement, delivered/received guard, moderation and UI), `AFTERSALES-01` (return/refund/exchange state machine), `CHAT-01` (buyer-seller order/product threads).

## TRACKING_DESIGN_AUDIT

- current status: partial, visually structured around the reference design
- supplier status connected: yes, normalized from stored S2BDIY order-detail fields
- carrier tracking connected: reads stored shipment/carrier fields; no real carrier provider
- demo tracking added: existing seller `Mock Shipment` action retained for test use
- fake logistics avoided: yes; timeline/status only render backend evidence and empty state says waiting for seller/supplier dispatch
- remaining TODO: replace mock shipment with S2BDIY shipment events, accept carrier webhook/polling data, and remove seller-controlled mock action

The current mock endpoint accepts `carrier`, `tracking_number`, and `tracking_url`, matching the canonical fields consumed by buyer tracking. It is explicitly not a real S2BDIY or carrier integration.

## SELLER_PIPELINE_AUDIT

1. seller register/login: login exists; self-service seller registration/provisioning is missing
2. store creation/setup: settings for the resolved store exist; self-service store creation is missing
3. store name/info/banner/logo/about: connected through store settings; logo has upload, banner/gallery currently use URLs
4. AI product generation: present through backend job + AI worker
5. generated images: mockup/design/print assets supported
6. product specs/variants: seller can edit supplier-variant rows; native publish mapping is incomplete
7. one-click publish: present
8. published product visible to buyer: yes when bridge publish succeeds
9. seller receives buyer order: admin order list exists
10. seller order detail: fulfillment route exists
11. S2BDIY production/fulfillment sync: partial; push/sync/retry routes exist, deep production lifecycle remains incomplete
12. cancellation/refund/return handling: buyer restricted cancellation and refund-request intent only; seller decision UI is missing
13. buyer-seller chat: missing

## Service Startup

```bash
docker compose -f infra/docker-compose.yml up -d postgres redis
```

Backend:

```bash
DATABASE_URL="postgres://medusa:medusa@127.0.0.1:5432/ai_commerce" \
npm --workspace apps/medusa-backend run dev
```

AI worker:

```bash
cd apps/ai-worker
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

Seller:

```bash
npm --workspace apps/seller-dashboard run dev
```

Buyer:

```bash
npm --workspace apps/storefront run dev
```

## Manual End-to-End Smoke Checklist

1. Start PostgreSQL, Redis, backend, AI worker, seller dashboard and buyer storefront.
2. Open the seller dashboard and sign in. Seller self-registration is not available.
3. Open Settings and save store name, description/about, announcement, logo, banner and gallery URLs.
4. Open AI Studio and generate a product.
5. Edit title, description, images, supplier variants/specs, price and `requires shipping`.
6. Publish once; record the product ID and verify publish succeeds.
7. Open buyer `/store`; verify the saved store identity, hero/about/gallery and real product grid.
8. Open the product; verify all native variants returned by the API are selectable. A single bridge product will honestly show `Default option`.
9. Sign out, click Add to cart and verify redirect to sign-in/registration with `returnTo`.
10. Sign in/register and verify return to the product; add the selected variant.
11. Open cart. Switch buyers and verify the previous buyer cart does not appear; switch back and verify that buyer’s cart returns.
12. Open checkout and save contact.
13. Select a country by name, enter the address and save. Verify the request carries its ISO code.
14. Select an available priced delivery method. If pricing is missing, verify an unavailable message appears and Place order remains disabled.
15. Confirm payment states `pp_system_default`, authorization only, and that disabled card fields do not collect data.
16. Place order. Current behavior authorizes and completes; it does not prove capture.
17. Open success then order detail; verify order ID, items, status and totals.
18. Open tracking. Before dispatch it must say waiting, not invent transit/delivery events.
19. In seller Orders, open fulfillment. Push fulfillment, then use `Mock Shipment` only for local demonstration. Reopen buyer tracking and verify stored status/carrier fields.
20. Verify seller can see the order and supplier status. Do not claim S2BDIY production success unless the supplier API returned it.
21. Cancellation/refund/return: only restricted pre-capture cancellation and pending refund-request intent are current. Real capture refund, return/exchange and seller approval are future.
22. Buyer-seller chat is future `CHAT-01`.

After PAY-02 the checklist must add Stripe card payment, failed payment to pending-payment page, 15-minute retry window, and timeout auto-cancel. These are not implemented in MKT-01.

## Phased Plan (Shortest Safe Dependency Order)

1. **SUP-01 Supplier native variant mapping**: unblock real selectable specifications before scaling catalog tests.
2. **STORE-01 Store profile hardening**: validate/upload banner/gallery and add multi-store route lookup only when needed.
3. **PAY-01 Stripe integration audit plan**: provider choice, PCI boundary, intent lifecycle, capture timing, idempotency/webhooks and failure states.
4. **PAY-02 Stripe test-mode payment**: Payment Element, pending payment, 15-minute expiry and webhook-backed reconciliation.
5. **REVIEW-01 Purchased-user reviews**: authenticated order-item entitlement and delivered/received guard.
6. **AFTERSALES-01**: seller-reviewed return/refund/exchange state machine; provider refund only after capture exists.
7. **CHAT-01**: scoped buyer-seller threads after order/product identity and moderation rules are stable.
8. Later: ADDRESS-01, COUPON-01, REGION-01/CURRENCY-01 and real carrier tracking.

## Known Caveats

- Frontend cart namespacing closes the observed account-switch leak, but backend cart-possession hardening and safe server merge remain TODOs.
- Store profile additions use existing metadata for a low-risk bridge; typed fields and image lifecycle are not complete.
- Seller-editable variant rows are not yet native Medusa variant rows.
- Review POST currently proves purchase, not delivery/receipt.
- `Mock Shipment` is an explicit test facility and must be removed when real S2BDIY shipment data is authoritative.
- System-provider authorization is not capture, payment, or refund evidence.
