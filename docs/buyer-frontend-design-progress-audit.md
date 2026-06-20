# Buyer Frontend Design Progress Audit

Date: 2026-06-20

## Audit Rules

- PNG files under `designs/buyer-ui` are the visual reference.
- `aligned` means the implemented route substantially follows the target structure and states; it does not mean automated pixel parity has been completed.
- `partial` includes incomplete PNG states, shared shell differences, static selectors, or missing responsive verification.
- `real` means the normal route consumes a live API. Marked fallback data may still exist for API failure handling.
- This document is an audit only; it does not authorize implementation work by itself.

## Design Progress Matrix

| Design module | Expected route | Current route exists? | Current component/page | Backend API ready? | Visual alignment | Data integration | Priority | Next implementation target |
|---|---|---:|---|---|---|---|---|---|
| `shop page` | `/store` | yes | `pages/store/StoreHomePage.tsx`, store-home components | yes | partial | real with marked static/mock fallback | P0 | Screenshot diff for all four shop states; normalize hero/about/search behavior |
| `单店` | `/products/:product_id` | yes | `pages/product/ProductDetailPage.tsx`, product-detail components | partial | partial | real product; reviews/share can fallback | P0 | Real variants/options contract; verify gallery, selectors, review/share overlays against 57-66 |
| `购物车详情` | `/cart` | yes | `pages/cart/CartPage.tsx`, cart components | yes | partial | real | P0 | Compare normal/empty/edit/delete/quantity states and mobile spacing |
| `结算` | `/checkout`, `/checkout/success` | yes | checkout pages/components | partial | partial | real cart/address/shipping/order authorization | P0 | Align all checkout states; explicitly distinguish authorization from capture |
| `订单` | `/account/orders`, `/orders/lookup`, tracking | yes | order history/lookup/tracking pages | partial | partial | real | P0 | Status-tab taxonomy, empty/error states, tracking state visual comparison |
| `订单详情页面` | `/account/orders/:order_id` | yes | `pages/orders/OrderDetailPage.tsx`, detail components | partial | partial | real | P0 | Align Group 83-86; preserve auth/guest action differences and null fields |
| `登录注册` | `/account/sign-in`, `/account/register` | yes | account auth pages/forms | yes | partial | real HttpOnly session | P1 | Map Group 72-81 to validation/success/error/recovery states; password recovery remains missing |
| `Delivery address` | `/checkout/address` preferred; currently embedded `/checkout` | partial | `CheckoutAddressPanel` | partial | partial | real single checkout address, no address book | P0/P1 | Define address-book API and dedicated route before implementing all five PNG states |
| `Profile` | `/account`, `/account/profile` | yes | account home/profile page/form | basic profile only | partial | real basic profile | P1 | Align Profile PNGs; add avatar/preferences only after backend contract |
| `Account & Security` | `/account/security` | no | none | no | missing | missing | P1 | Audit password/email verification/session-management requirements |
| `Follow` | `/account/following` | no | none | no | missing | missing | P1 | Define followed store/product model, APIs, empty/list states |
| `coupons` | `/account/coupons` and checkout coupon panel | no | checkout has static shell only | no | missing | missing/static | P1 | Define coupon eligibility/apply/remove/wallet contract |
| `Currency` | `/account/settings/currency` or global selector | no | top nav language/currency presentation only | partial native region context, no buyer preference | missing | static/missing | P2 | Decide display vs settlement currency and persistence model |
| `Country & region` | `/account/settings/region` or global selector | no | checkout country input only | partial via cart region/address validation | missing | partial | P2 | Define region-switch cart consequences and preference API |
| `Help Center` | `/help`, `/help/:topic` | no | no functional support page | no | missing | static/missing | P2 | Information architecture plus support/contact backend decision |
| `辅助页` | `/about`, `/notifications`, `/settings` | no | legacy footer/nav links only | no | missing | static/missing | P2 | Separate static About from authenticated notifications/settings contracts |

## Current Route Inventory

| Route | Current data source | Important caveat |
|---|---|---|
| `/store` | settings/categories/products APIs | API failure or empty response can show explicitly marked fallback |
| `/products/:id` | product/reviews/share APIs | visual color/size selectors do not change variants |
| `/cart` | cart APIs | store-scoped cart id in localStorage |
| `/checkout` | cart/contact/address/shipping/complete APIs | requires login in current UI; payment is authorized, not captured |
| `/checkout/success` | real complete result/session summary | does not imply provider capture/refund capability |
| `/account/sign-in`, `/account/register` | Medusa native auth/session | password reset/email verification absent |
| `/account`, `/account/profile` | current-customer API | basic profile only |
| `/account/orders` | authenticated orders API | no email enumeration; real pagination/filtering |
| `/account/orders/:id` | authenticated detail when logged in; guest-safe path otherwise | cancel/refund actions only from backend capability objects |
| `/account/orders/:id/tracking` | authenticated or email-verified guest tracking | missing shipment fields render `Not available` |
| `/orders/lookup` | guest email + display id lookup | intentionally single-order access, not order history |

## Structural Findings

1. `App.tsx` routes to the rebuilt pages, but still contains legacy mock order/detail components and imports after the active router block. They are not the current route implementation and are a future code-cleanup candidate, not part of this documentation change.
2. `buyer-api.ts` is the current buyer client. `store-api.ts` and older store components remain historical/legacy references and should not define new UI behavior.
3. Fallback settings/products/reviews/share remain in code. They are visibly marked, but final runtime acceptance should verify that normal local/production configuration never silently uses them.
4. Current CSS is page-oriented (`store-home.css`, `product-detail.css`, `cart.css`, `checkout.css`, `orders.css`, `account.css`). Shared design tokens and shell primitives are not yet consolidated.

## Priority Order

1. P0 visual acceptance checklists for `/store`, product detail, cart, checkout, orders, detail, and tracking.
2. Shared design-system shell without changing API semantics.
3. Dedicated delivery-address experience and real variant/options behavior.
4. Account/security, profile, follow, coupons, support, and auxiliary pages.
5. Messaging and verified-purchase reviews after backend contracts exist.

