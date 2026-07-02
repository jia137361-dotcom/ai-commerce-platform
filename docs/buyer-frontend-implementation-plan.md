# Buyer Frontend Implementation Plan

Date: 2026-06-20

## 1. Purpose And Boundaries

This is the executable frontend implementation plan for Planning Phase 2. It follows `project-current-state-and-roadmap.md` and does not reopen payment/refund implementation scope.

Non-negotiable product facts:

- payment provider is `pp_system_default`
- runtime proves authorization only; captured orders remain unavailable in the current evidence
- an authorized-not-captured order may expose `Cancel order` only when backend cancellation capability allows it
- `Request refund` is only valid for a genuinely captured order and backend `refund_request.allowed=true`
- refund request creates a pending review record; it does not return money
- no Batch 12C or real refund work belongs in these frontend batches

## 2. Current Frontend Foundation

### Active Routes

| Route | Page | State/data ownership |
|---|---|---|
| `/store` and default path | `StoreHomePage` | real settings/categories/products with marked fallback |
| `/products/:product_id` | `ProductDetailPage` | product/reviews/share and cart add |
| `/cart` | `CartPage` | store-scoped cart id and real cart mutations |
| `/checkout` | `CheckoutPage` | cart/contact/address/shipping/customer binding/complete |
| `/checkout/success` | `CheckoutSuccessPage` | real completion summary |
| `/orders/lookup` | `OrderLookupPage` | guest email + display-id lookup |
| `/account/sign-in`, `/account/register` | auth pages | Medusa auth and HttpOnly session |
| `/account`, `/account/profile` | account pages | auth context and basic customer profile |
| `/account/orders` | `OrderHistoryPage` | authenticated order pagination/filtering |
| `/account/orders/:id` | `OrderDetailPage` | authenticated detail or guest-safe detail |
| `/account/orders/:id/tracking` | `OrderTrackingPage` | authenticated or email-verified guest tracking |

### Current Shared Infrastructure

- API client: `src/lib/buyer-api.ts`
- auth/session: `BuyerAuthProvider`, `useBuyerAuth`
- cart persistence: `citigoo:${storeId}:cart_id`
- page styles: `store-home.css`, `product-detail.css`, `cart.css`, `checkout.css`, `orders.css`, `account.css`
- layout elements: `StoreTopBar`, `TopNav`, `StoreFooter`, account navigation/sidebar
- state components exist in multiple page-specific forms but are not unified
- order action truth comes from backend `cancellation` and `refund_request` capability objects

`App.tsx` has working route dispatch but also retains legacy mock order/detail code. FE-01 should not replace the router. Legacy removal should be a separately reviewed cleanup after import/reachability tests.

## 3. Page Implementation Matrix

| Design module | Target route | Current implementation | Backend API readiness | Visual alignment | Data integration status | Priority | Implementation batch | Required shared components | Risks / blockers |
|---|---|---|---|---|---|---|---|---|---|
| `shop page` | `/store` | rebuilt page and store-home components | ready | partial | real with explicit fallback | P0 | FE-02 | PageShell, Header, ProductCard, MoneyText, SectionHeader, states | Hero/search/menu PNG variants; fallback must not mask runtime issues |
| `单店` | `/products/:id` | rebuilt detail/gallery/purchase/review/share | partial | partial | real product; review/share fallback | P0 | FE-03 | PageShell, ProductCard, MoneyText, StatusBadge, buttons, Modal, FormField | Real variants/options absent; visual selectors must remain non-functional/TODO |
| `购物车详情` | `/cart` | real cart page and mutations | ready | partial | real | P0 | FE-04 | PageShell, Card, MoneyText, buttons, Empty/Loading/Error, Modal | Product option metadata can be incomplete |
| `结算` | `/checkout`, `/checkout/success` | real contact/address/shipping/complete | partial | partial | real authorization/order | P0 | FE-05 | PageShell, SectionHeader, FormField, SelectField, AddressBlock, OrderSummary, buttons, states | Never label authorization as captured/paid funds; coupon remains static |
| `订单` | `/account/orders`, `/orders/lookup`, tracking | real list/lookup/tracking | partial | partial | real | P0 | FE-06 | PageShell, BottomNav, OrderCard, StatusBadge, MoneyText, Timeline, states | Tracking data often absent; unknown statuses must remain visible |
| `订单详情页面` | `/account/orders/:id` | secure authenticated/guest detail with actions | partial | partial | real | P0 | FE-06 | Card, OrderSummary, AddressBlock, StatusBadge, Modal, buttons, Timeline | Auth/guest actions differ; refund button must stay capture-gated |
| `登录注册` | `/account/sign-in`, `/account/register` | native auth integration | ready | partial | real | P1 | FE-07 | MobileShell, FormField, PrimaryButton, Error/Loading | Recovery/email verification designs exceed backend capability |
| `Delivery address` | `/checkout/address` target; embedded in checkout today | embedded address panel | partial | partial | real checkout address only | P0/P1 | FE-05 shell, FE-08 full domain | AddressBlock, FormField, SelectField, Drawer | No address book API; dedicated route should not pretend persistence |
| `Profile` | `/account`, `/account/profile` | basic real profile | partial | partial | real basic profile | P1 | FE-07 | PageShell, BottomNav, Card, FormField, buttons, states | Avatar/preferences not backed by API |
| `Account & Security` | `/account/security` | missing | missing | missing | missing | P1 | FE-08 | PageShell, SectionHeader, Card, FormField, Modal | Password reset/change, verification, sessions require backend work |
| `Follow` | `/account/following` | missing | missing | missing | missing | P1 | FE-08 | PageShell, BottomNav, ProductCard/Card, EmptyState | UI may be static-first only; do not fabricate followed data |
| `coupons` | `/account/coupons`; checkout coupon area | missing/static shell | missing | missing | static-first | P1 | FE-08 | PageShell, Card, StatusBadge, EmptyState, FormField | No apply/remove/wallet API; checkout totals cannot be faked |
| `Currency` | `/account/settings/currency` | missing | missing/partial platform context | missing | static-first | P2 | FE-08 | MobileShell, SectionHeader, SelectField, Modal | Display vs settlement currency unresolved |
| `Country & region` | `/account/settings/region` | missing; checkout country input exists | partial | missing | static-first | P2 | FE-08 | MobileShell, SelectField, Modal | Region change may invalidate/reprice cart |
| `Help Center` | `/help`, `/help/:topic` | missing | missing | missing | static-first | P2 | FE-08 | PageShell, SectionHeader, Card, FormField, EmptyState | Static content vs support ticket product decision |
| `辅助页` | `/about`, `/notifications`, `/settings` | missing | missing | missing | static-first | P2 | FE-08 | PageShell/MobileShell, BottomNav, Card, StatusBadge, states | Notifications/settings require contracts; About can be static |

## 4. Implementation Order

1. **FE-01:** shared shell and primitives, demonstrated only in order history card and order detail action block.
2. **FE-02 to FE-06:** migrate P0 transaction/order pages one small batch at a time.
3. **FE-07:** auth/account shell and basic profile visual alignment.
4. **FE-08:** static-first or backend-gated P1/P2 account/support modules.
5. **FE-09:** messaging UI planning only, pending a secure backend domain.

## 5. Static / Mock-First Rules

Static-first is acceptable for layout and copy only when the backend domain is absent:

- Account & Security unsupported actions
- Follow empty state
- Coupon wallet empty state and non-functional visual shell
- Currency/region preferences
- Help Center/About
- Notifications/settings placeholders

Static-first pages must:

- say unavailable or coming later where an action would imply persistence
- never render invented customer/order/coupon/message records
- never mutate cart/order/payment state
- not expose buttons that produce fake success toasts

Existing fallback product/review data is a development resilience mechanism, not acceptance data for final visual or integration checks.

## 6. FE-01 Recommendation

Proceed with **FE-01: Design System Shell + app layout** before page rewrites. The current route dispatch is sufficient for this batch; replacing it first would add routing risk without improving design consistency.

### Minimum Code Scope

- add `src/components/ui` primitives and `src/components/layout/PageShell.tsx`
- add a small token/primitives stylesheet; do not rewrite page CSS
- implement Button, Card, MoneyText, StatusBadge, LoadingState, ErrorState, EmptyState
- demonstrate adoption in:
  - `OrderHistoryCard`
  - authenticated `OrderDetailPage` action block or its extracted action component
- preserve existing API calls, auth checks, cart behavior, and order action guards
- add component/state tests and two desktop/mobile screenshots

### Explicitly Not In FE-01

- no shop/cart/checkout rewrite
- no router replacement
- no backend changes
- no payment/capture/refund changes
- no broad CSS rename
- no removal of legacy code unless independently proven unreachable and reviewed

### FE-01 Exit Criteria

- existing routes and API behavior remain unchanged
- authorization-only orders still show Cancel only when allowed
- Request refund remains hidden unless backend capture eligibility allows it
- primitives render consistently at desktop and mobile widths
- storefront typecheck/build and focused UI tests pass
- screenshot comparison shows no accidental regressions on the two demonstration surfaces

