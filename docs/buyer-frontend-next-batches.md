# Buyer Frontend Next Batches

Date: 2026-06-20

These are frontend implementation batches, not payment/refund backend batches. Each should remain independently reviewable and preserve existing API behavior.

## Batch FE-01: Design System Shell + App Layout

- **Goal:** establish shared tokens, layout, buttons, cards, status, money and API-state primitives.
- **Scope:** primitives plus two demonstration integrations: order history card and authenticated order-detail action block.
- **Routes:** `/account/orders`, `/account/orders/:id` only as demonstration surfaces.
- **Design references:** `订单/Body*.png`, `订单详情页面/Group 83-86.png`, order overlays.
- **Backend APIs:** existing authenticated order list/detail/cancel/refund-request only; no API changes.
- **Files likely to modify:** `src/components/ui/*`, `src/components/layout/PageShell.tsx`, `src/styles/tokens.css`, `src/styles/primitives.css`, `OrderHistoryCard.tsx`, extracted order action component, `main.tsx` style imports.
- **Tests:** MoneyText formatting, StatusBadge mapping, button loading/disabled, modal accessibility, action visibility; desktop/mobile screenshots.
- **Exit criteria:** two surfaces migrated without route/data/action regression; typecheck/build and focused tests pass.
- **Not in scope:** router replacement, full page rewrites, payment/capture/refund changes, broad CSS renaming.

## Batch FE-02: Shop Page + Product Listing

- **Goal:** align `/store` with all `shop page` PNG states using the shared shell.
- **Scope:** top navigation, hero, category/search/menu states, product grid/card, loading/error/empty/fallback notice.
- **Routes:** `/store`.
- **Design references:** `shop page/shop page.png` through `shop page-3.png`; about PNGs only for shared shop chrome reference.
- **Backend APIs:** `GET /store/settings`, `/store/product-categories`, `/store/products`.
- **Files likely to modify:** `StoreHomePage.tsx`, `components/store-home/*`, shared ProductCard/Header/Drawer, `store-home.css`.
- **Tests:** category local filtering, real-vs-fallback notice, unavailable product state, product link, responsive product grid; visual screenshots.
- **Exit criteria:** real API path matches reference structure at desktop/mobile; fallback is explicit and never overwrites non-empty real data.
- **Not in scope:** product detail, cart mutation, store follow, advanced backend search.

## Batch FE-03: Product Detail / 单店

- **Goal:** align product media, purchase panel, reviews and share states without inventing variants.
- **Scope:** gallery, detail hierarchy, quantity, unavailable state, add-to-cart feedback, reviews and share panel.
- **Routes:** `/products/:product_id`.
- **Design references:** `单店/57.png` through `66.png`.
- **Backend APIs:** product detail, reviews, share, cart create/add.
- **Files likely to modify:** `ProductDetailPage.tsx`, `components/product-detail/*`, ProductCard, Modal/Drawer, `product-detail.css`.
- **Tests:** API states, addable guard, cart storage isolation, duplicate submit prevention, review/share fallback labels, selector non-effect on variant; screenshots.
- **Exit criteria:** real product/cart behavior preserved; static color/size selectors are clearly visual-only until backend variants exist.
- **Not in scope:** verified review creation, real variant switching, cart page rewrite.

## Batch FE-04: Cart Details

- **Goal:** complete visual parity for normal, quantity, edit, delete-confirm and empty cart states.
- **Scope:** line layout, quantity stepper, delete modal, totals, errors and recommendations shell.
- **Routes:** `/cart`.
- **Design references:** `购物车详情/Group 96-99.png`, `100.png`.
- **Backend APIs:** cart GET, line-item PUT/DELETE.
- **Files likely to modify:** cart page/components, shared Card/MoneyText/Button/Modal/OrderSummary, `cart.css`.
- **Tests:** real quantity/delete calls, last-line empty state, API error not mock, checkout navigation, responsive line layout; screenshots.
- **Exit criteria:** all five cart states represented and real mutations remain correct.
- **Not in scope:** checkout implementation, coupon logic, saved-for-later backend.

## Batch FE-05: Checkout + Success

- **Goal:** align contact, address, shipping, payment shell, summary and success states while preserving authorization-only truth.
- **Scope:** checkout structure, save states, shipping options/method, disabled reason, submit state, success summary.
- **Routes:** `/checkout`, `/checkout/success`; optionally establish a non-persistent `/checkout/address` shell only after route decision.
- **Design references:** `结算/Group 65-71.png`, all `Delivery address` PNGs.
- **Backend APIs:** cart GET, contact/address update, shipping options/method, cart customer binding, complete.
- **Files likely to modify:** checkout pages/components, AddressBlock, FormField/SelectField, OrderSummary, `checkout.css`.
- **Tests:** shipping-required state machine, no-options, address/method persistence, submit once, success real order data, non-shipping regression; screenshots.
- **Exit criteria:** checkout states match PNGs; UI says authorization/order success without claiming capture; no fake coupon effect.
- **Not in scope:** payment capture, real refund, address book CRUD, coupon API.

## Batch FE-06: Authenticated Orders List / Detail / Tracking

- **Goal:** align order pages and all real states with consistent shared components.
- **Scope:** list tabs/pagination/cards, detail summary/address/actions, tracking timeline/shipments, guest lookup distinction.
- **Routes:** `/account/orders`, `/account/orders/:id`, `/account/orders/:id/tracking`, `/orders/lookup`.
- **Design references:** `订单/Body*.png`, `订单/订单详情页*.png`, `订单/物流追踪页.png`, `订单详情页面/Group 83-86.png`, overlays.
- **Backend APIs:** authenticated list/detail, guest lookup/detail, tracking, cancel, refund-request GET/POST.
- **Files likely to modify:** order pages/components, OrderCard, StatusBadge, Timeline, AddressBlock, OrderSummary, Modal, `orders.css`.
- **Tests:** auth/guest navigation, unknown statuses remain in All, null fields, tracking empty, cancellation capability, capture-gated refund request, pending request state, no fake success; screenshots.
- **Exit criteria:** PNG state coverage and access/security semantics both pass.
- **Not in scope:** real refund, return, reorder, invoice, guest cancellation.

## Batch FE-07: Login / Register / Profile / Account Shell

- **Goal:** align secure account entry and basic profile with shared mobile/desktop shell.
- **Scope:** sign-in/register validation, loading/errors, account navigation, profile edit, authenticated redirects.
- **Routes:** `/account/sign-in`, `/account/register`, `/account`, `/account/profile`.
- **Design references:** `登录注册/Group 72-81.png`, `Profile/*`, account portions of `辅助页`.
- **Backend APIs:** native auth/session, current customer, profile update.
- **Files likely to modify:** account pages/components, BuyerAuthProvider only if presentation state requires it, MobileShell, FormField, `account.css`.
- **Tests:** safe returnTo, session restore, logout, profile validation/update, unauthenticated guard, mobile shell screenshots.
- **Exit criteria:** account flows visually coherent and retain HttpOnly-session behavior.
- **Not in scope:** password reset, verification, MFA, address book, payment methods.

## Batch FE-08: Address / Coupon / Follow / Help / Static Pages

- **Goal:** implement P1/P2 surfaces only to the level supported by real APIs, with honest static-first states.
- **Scope:** route shells, static content, empty/unavailable states, and backend dependency notes per module.
- **Routes:** `/checkout/address`, `/account/addresses`, `/account/security`, `/account/following`, `/account/coupons`, `/account/settings/currency`, `/account/settings/region`, `/help`, `/about`, `/notifications`, `/settings` as individually approved.
- **Design references:** `Delivery address`, `Account & Security`, `Follow`, `coupons`, `Currency`, `Country & region`, `Help Center`, `辅助页`.
- **Backend APIs:** basic profile/cart region where available; most domains missing.
- **Files likely to modify:** new page/component modules, App route inventory, shared shell/forms/states; API client only after real endpoints exist.
- **Tests:** route rendering, auth guards, no mock records, disabled/unavailable actions, static content accessibility, responsive screenshots.
- **Exit criteria:** approved pages match designs without implying unsupported persistence or business actions.
- **Not in scope:** inventing coupon/follow/security/message APIs or fake success.

## Batch FE-09: Buyer-Supplier Message UI Planning

- **Goal:** define message/thread UI and interaction contract before implementation.
- **Scope:** information architecture, thread types, order/product context, unread state, attachment/moderation/access requirements.
- **Routes:** proposed `/messages`, `/messages/:thread_id`; no route implementation in this batch.
- **Design references:** `辅助页/Notifications*`, `Help Center`, product/order contact entry points.
- **Backend APIs:** none today; produce required API/domain contract only.
- **Files likely to modify:** documentation only.
- **Tests:** none beyond document consistency; future implementation must test customer/store/thread isolation.
- **Exit criteria:** approved UX states, security model and API contract ready for a separate backend/frontend implementation decision.
- **Not in scope:** live chat, WebSocket infrastructure, message storage, supplier portal, notifications delivery.

## Cross-Batch Quality Gates

Every coding batch must:

1. change no more than 1-2 primary pages unless explicitly approved
2. preserve real API behavior and access control
3. render loading, error, empty and partial-data states
4. run storefront typecheck/build and focused tests
5. compare desktop and mobile screenshots to the named PNG references
6. verify text does not overlap or overflow controls
7. keep fallback/mock content visibly identified and absent from successful real API paths
8. preserve payment truth: authorization is not capture; pending request is not refund

## Next Implementation Batch

`FE-01: Design System Shell + App Layout` is the next recommended coding batch.

It should stop after shared primitives and two demonstration integrations. FE-02 must be a separate reviewable change.

