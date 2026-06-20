# Project Current State And Roadmap

Date: 2026-06-20
Branch: `feature/buyer-frontend-integration`

This is the single primary planning entry for buyer, order, support, and payment work. Detailed subsystem evidence remains in the linked historical and capability documents, but future scope decisions should start here.

## 1. Current Stage

The repository has moved beyond backend foundation into an integrated buyer transaction prototype. The P0 browser-to-order path exists with real APIs: customer auth, catalog, product detail, cart, contact/address, shipping selection, complete cart, authenticated order history/detail, guest lookup/detail/tracking, restricted cancellation, and pending refund requests.

It is not yet a final commerce product. The largest product gaps are complete design fidelity, real payment capture/refund, address book and account settings, coupons/follow/support, verified-purchase reviews, messaging, and supplier/admin review workflows.

Payment truth is especially important:

- provider: `pp_system_default`
- authorization: runtime verified
- capture: not currently performed by checkout; captured runtime unavailable in the latest audit
- real refund: not implemented
- buyer refund request: creates a `pending` intent record only
- authorized-not-captured order: cancellation candidate, never refund-request eligible
- captured order: cancellation denied; refund request may be eligible when real amount/currency evidence exists

## 2. Capability Summary

### Done

- Vite React storefront runtime and store-aware API client.
- Store home, product detail, cart, checkout, success, auth, profile, order list, order detail, guest lookup, and tracking routes.
- Real store settings, categories, products, cart, checkout, auth, order, shipping, cancellation, and refund-request API integration.
- HttpOnly customer session with authenticated cart binding and order ownership.
- Store isolation through `X-Store-Id` and trusted backend ownership checks.
- Non-shipping and shippable checkout smoke paths.
- Authorized-not-captured cancellation through Medusa official workflow.
- Pending buyer refund-request workflow with no fake provider success.
- Payment capability audit tooling and safety tests.

### Partial

- Visual alignment: implemented transaction pages follow the PNG direction but are not a complete pixel-level implementation of every state.
- Product variants: color/size selectors are visual when backend options are unavailable; they do not switch `variant_id`.
- Reviews: product review read API exists; failures may use marked mock fallback. Verified-purchase review creation is missing.
- Share: API/fallback link exists; full share/contact interactions are incomplete.
- Tracking: real endpoint and real fields are shown, but absent carrier/events remain `Not available`.
- Checkout: real authorization and order creation work; payment capture does not.
- Profile: basic name/phone update exists; address book, security management, and account deletion do not.
- Refund: request creation and status are present; review/approval/provider execution are missing.
- Supplier/admin: catalog and fulfillment bridge routes exist, but buyer-facing cancellation/refund/return coordination is not complete.

### Missing Or Blocked

- Real payment provider capture, refund, webhooks, idempotency, reconciliation, and sandbox fixtures.
- Return workflow and supplier cancellation synchronization.
- Coupon application and account coupon wallet.
- Followed stores/products.
- Customer address book and dedicated `/checkout/address` experience.
- Account security screens: password reset/change, email verification, MFA, sessions.
- Help Center/contact support workflow.
- Buyer-seller messaging.
- Verified-purchase review write/moderation flow.
- Complete supplier portal for order decisions, refund review, returns, messaging, and reviews.

## 3. Final Buyer Product Pipeline

| Step | Final product expectation | Status | Frontend route | Backend/API | Design reference | Blocker | Next action |
|---|---|---|---|---|---|---|---|
| Register / sign in | Secure customer identity and recoverable session | done | `/account/register`, `/account/sign-in` | Medusa auth/session + `/store/customers/me` | `登录注册`, `Account & Security` | Password reset/verification absent | Consolidate visual states, then add recovery design/API |
| Browse store/products | Real store branding, categories, product filters | partial | `/store` | `GET /store/settings`, `/store/product-categories`, `/store/products` | `shop page` | Fallback data remains; advanced filters missing | Pixel audit and remove fallback dependence from normal runtime |
| Product detail | Images, price, description, reviews, share, real variants | partial | `/products/:product_id` | product detail/reviews/share APIs | `单店` | Variant options and verified review writes missing | Define variant/options contract; retain explicit fallback markers |
| Choose spec/quantity | Variant-dependent availability and price | mock-only | product detail | only one `medusa_variant_id` bridge | `单店` | Backend options not exposed | Add normalized variants/options API before enabling selectors |
| Add to cart | Store-isolated cart with valid native variant | done | product detail -> `/cart` | cart create/add APIs | `单店`, `购物车详情` | None for current bridge products | Regression coverage and design polish |
| Cart management | Real quantities, delete, totals, empty/error states | done | `/cart` | GET/PUT/DELETE cart line APIs | `购物车详情` | Metadata quality varies by product | Normalize option metadata and improve mobile alignment |
| Address / delivery | Saved address, options, persistent method | partial | `/checkout` | address, shipping-options, shipping-methods | `Delivery address`, `结算` | No address book/dedicated address route | Build address domain and dedicated UI after design shell |
| Place order | Bind customer, save contact, authorize payment, complete once | done for authorization | `/checkout`, `/checkout/success` | contact/customer/complete | `结算` | Capture is absent | Keep authorize semantics explicit; do not claim paid funds |
| Payment state | Authorize, capture, failure, retry, reconciliation | blocked | checkout/order detail | only authorization runtime verified | `结算`, `订单详情页面` | Real provider and webhook design | Planning Phase 8 prerequisites |
| Order list | Authenticated, paginated, filtered own orders | done | `/account/orders` | `GET /store/customers/me/orders` | `订单` | Some fields may be null | Visual alignment and status taxonomy polish |
| Order detail | Authenticated and guest-safe detail | done | `/account/orders/:id` | authenticated detail and guest detail | `订单`, `订单详情页面` | Partial payment/fulfillment evidence | Keep missing fields explicit; no invented values |
| Logistics | Carrier, tracking link, real events only | partial | `/account/orders/:id/tracking` | tracking API | `订单/物流追踪页.png` | Local shipments often empty | Supplier/carrier event synchronization |
| Cancel order | Own-store authorized/unpaid, unfulfilled only | done, restricted | order detail | `POST /store/customers/me/orders/:id/cancel` | order overlays | Paid/fulfilled/supplier cancellation excluded | Preserve fail-closed rules; later coordinate supplier state |
| Return / refund | Submit request, review, provider execution, return logistics | partial / blocked | order detail | refund-request GET/POST | order overlays/details | Only pending request exists; no capture/refund runtime | Build review workflow before provider execution |
| Refund status | Accurate pending/approved/processing/failed/completed | partial | order detail | custom refund-request record | `订单`, overlays | No admin review UI/provider reconciliation | Add supplier/admin decision lifecycle |
| Product review | Purchased buyer can rate/review; moderation and display | partial | product detail; future order action | GET reviews only | `单店`, `订单` | No verified-purchase write API | Add order-item entitlement and moderation contract |
| Buyer/seller messaging | Product/order threads, unread state, moderation | missing | future `/messages` | none | `辅助页/Notifications*`, Help Center | No message module/API/design mapping | Define thread model, permissions, retention, notifications |

## 4. Supplier / Merchant Pipeline

| Step | Final expectation | Status | Current capability | Blocker | Next action |
|---|---|---|---|---|---|
| Merchant login | Secure supplier/admin identity and scoped store access | partial | Medusa admin foundation | Product-grade supplier RBAC/portal not audited | Separate supplier auth/access audit |
| Product management | Draft, publish, category, supplier sync | partial | admin product/category/supplier routes | No complete merchant UX | Define supplier product lifecycle UI |
| Receive orders | Store-filtered queue with buyer/order evidence | partial | admin orders and supplier-order routes | Supplier portal state model incomplete | Normalize operational statuses and ownership |
| Ship / logistics | Create fulfillment, carrier/tracking, buyer sync | partial | fulfillment order, mock shipment, supplier push routes | Real carrier/provider sync incomplete | Replace mock shipment with provider events |
| Cancellation | Review buyer cancellation and stop supplier work | missing/partial | buyer pre-fulfillment cancel only | No supplier cancellation handshake | Define acceptance/production cutoff state machine |
| Refund / return review | Approve/reject request, record reasons, execute provider later | missing | pending buyer request record | No review UI/API; no payment provider | Build review workflow before real refund |
| Reply to messages | Product/order support conversations | missing | none | Message domain absent | Design and implement secure threads |
| View/respond to reviews | Review dashboard and merchant reply | missing | review read foundation | Write/moderation/merchant response absent | Define verified review lifecycle |

## 5. Document Authority And Relationships

### Primary Entry

- **Current plan:** `docs/project-current-state-and-roadmap.md`
- Frontend implementation plan: `docs/buyer-frontend-implementation-plan.md`
- Design system shell: `docs/buyer-frontend-design-system-shell.md`
- Frontend batch plan: `docs/buyer-frontend-next-batches.md`
- Frontend design status: `docs/buyer-frontend-design-progress-audit.md`
- Backend/API status: `docs/backend-capability-map.md`
- Document lifecycle decisions: `docs/document-cleanup-report.md`
- Documentation index: `docs/README.md`

### Current Subsystem References

- Auth: `buyer-auth-architecture.md`, `buyer-auth-api-contract.md`, `buyer-auth-security-gap.md`
- Checkout: `buyer-checkout-contact-persistence.md`, `buyer-checkout-shipping-smoke.md`
- Orders: `buyer-authenticated-orders-api.md`, `buyer-authenticated-orders-security.md`
- Cancellation: `buyer-unpaid-order-cancellation.md`
- Refund request: `buyer-refund-request-workflow.md`
- Payment limitation: `payment-capture-refund-capability-audit.md`
- Design evidence: module-specific `buyer-*-design-notes.md`

### Historical Reference

Early gap maps and batch plans explain why code evolved, but are not current planning authority. In particular, `buyer-api-contract.md`, `buyer-page-api-map.md`, `buyer-frontend-current-state.md`, and `buyer-frontend-rebuild-plan.md` predate auth, authenticated orders, cancellation, refund request, and payment audit work.

## 6. Old Plan Status

No document is deleted in this consolidation. The obvious duplicate `docs/buyer-frontend-current-state 2.md` is a `delete_candidate`; stale gap/plan documents are `archive` candidates. Exact decisions and replacements are listed in `docs/document-cleanup-report.md`.

## 7. Recommended Planning Phases

### Planning Phase 1: Documentation Consolidation

- **Goal:** one trusted roadmap and explicit historical references.
- **Scope:** these four consolidation documents and future doc index hygiene.
- **Dependencies:** current code/routes/design inventory.
- **Deliverables:** roadmap, frontend audit, backend map, cleanup report.
- **Exit criteria:** future work links to this roadmap; stale plans are not treated as current facts.

### Planning Phase 2: Frontend Design Gap Audit

- **Goal:** turn every PNG state into an acceptance checklist.
- **Scope:** viewport/state/component mapping, no feature implementation.
- **Dependencies:** design inventory and current route screenshots.
- **Deliverables:** per-route visual diffs and prioritized state list.
- **Exit criteria:** each P0/P1 screen has a measurable visual acceptance target.

### Planning Phase 3: Design System Shell

- **Goal:** shared navigation, footer, spacing, type, forms, modals, status patterns.
- **Scope:** presentation foundation without changing commerce semantics.
- **Dependencies:** Phase 2 tokens and component inventory.
- **Deliverables:** reusable shell and visual regression fixtures.
- **Exit criteria:** new pages no longer duplicate layout/style primitives.

### Planning Phase 4: P0 Buyer Transaction Pages

- **Goal:** final-design store, product, cart, address, checkout, and success flow.
- **Scope:** 1-2 pages per implementation batch; real APIs only in normal runtime.
- **Dependencies:** design shell and stable API contracts.
- **Deliverables:** visually aligned P0 transaction path.
- **Exit criteria:** responsive visual checks plus real store/cart/order smoke pass.

### Planning Phase 5: Orders / Cancel / Refund UI Polish

- **Goal:** consistent order states and honest action capability UX.
- **Scope:** list/detail/tracking/cancel/refund-request views, not real refund execution.
- **Dependencies:** current secure APIs and payment truth model.
- **Deliverables:** complete loading/error/empty/modal/status coverage.
- **Exit criteria:** guest/auth access and action guards pass; no fake payment language.

### Planning Phase 6: Account / Support Pages

- **Goal:** profile, address book, security, follow, coupons, settings, Help Center, messages.
- **Scope:** P1/P2 account and support domains.
- **Dependencies:** design shell; new backend contracts per capability.
- **Deliverables:** prioritized account/support implementation batches.
- **Exit criteria:** each route uses secure identity and real or clearly unavailable data.

### Planning Phase 7: Supplier / Admin Review Workflow

- **Goal:** operational handling of orders, cancellations, refund requests, returns, and messages.
- **Scope:** supplier/admin state machines and review APIs/UIs.
- **Dependencies:** store/customer isolation and supplier ownership model.
- **Deliverables:** auditable decision workflow and buyer status synchronization.
- **Exit criteria:** pending buyer requests can be safely approved/rejected without provider refund claims.

### Planning Phase 8: Real Payment Provider Integration

- **Goal:** production-grade authorize/capture/refund lifecycle.
- **Scope:** provider selection, sandbox, idempotency, webhooks, reconciliation, retries, full/partial refunds.
- **Dependencies:** Phase 7 approval workflow and `payment-capture-refund-capability-audit.md` prerequisites.
- **Deliverables:** provider contract, implementation, security tests, runtime evidence.
- **Exit criteria:** captured payment and refund are provider-confirmed, reconciled, and never inferred from metadata.
