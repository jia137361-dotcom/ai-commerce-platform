# Buyer Design Inventory

Date: 2026-06-15

Source directory: `designs/buyer-ui/`

Scope: inventory only. This document is based on folder names, PNG filenames, and image dimensions. Some files are exported as generic names such as `Group 72.png` or `Body-10.png`; those should be visually verified before implementation.

Priority legend:

- P0: required for buyer transaction loop.
- P1: user center or enhanced buyer features.
- P2: settings, support, static, or auxiliary pages.

Page type legend:

- Static page
- List page
- Detail page
- Form page
- Popup
- Status page

API shorthand:

- Settings: `GET /store/settings`
- Categories: `GET /store/product-categories`
- Products: `GET /store/products`
- Product detail: `GET /store/products/:product_id`
- Reviews: `GET /store/products/:product_id/reviews`, `POST /store/products/:product_id/reviews`
- Share: `GET /store/products/:product_id/share`
- Cart: `POST /store/carts`, `GET /store/carts/:cart_id`, `POST /store/carts/:cart_id/line-items`, `PUT /store/carts/:cart_id/line-items/:line_id`, `DELETE /store/carts/:cart_id/line-items/:line_id`
- Checkout complete: `POST /store/carts/:cart_id/complete`
- Order lookup: `GET /store/orders/lookup`
- Order tracking: `GET /store/orders/:order_id/tracking`
- Missing address API: proposed cart address update
- Missing order detail API: proposed `GET /store/orders/:order_id`
- Missing order list API: proposed `GET /store/orders`
- Missing shipping API: shipping options/methods if needed

## Module Inventory

### Storefront And Shop

| File | Page name | Suggested route | Priority | Type | Backend APIs | Can mock first |
|---|---|---|---|---|---|---|
| `shop page/shop page.png` | Shop home, default state | `/store` | P0 | List page | Settings, Categories, Products | Partially: static layout yes, products should use API |
| `shop page/shop page-1.png` | Shop home variant/state 1 | `/store` | P0 | List page | Settings, Categories, Products | Partially |
| `shop page/shop page-2.png` | Shop home variant/state 2 | `/store` | P0 | List page | Settings, Categories, Products | Partially |
| `shop page/shop page-3.png` | Shop home variant/state 3 | `/store` | P0 | List page | Settings, Categories, Products | Partially |
| `shop page/about.png` | Shop about tab/page | `/store/about` or `/store?tab=about` | P2 | Static page | Settings | Yes |
| `shop page/about-1.png` | Shop about variant/state 1 | `/store/about` or `/store?tab=about` | P2 | Static page | Settings | Yes |
| `shop page/about-2.png` | Shop about variant/state 2 | `/store/about` or `/store?tab=about` | P2 | Static page | Settings | Yes |
| `shop page/about-3.png` | Shop about variant/state 3 | `/store/about` or `/store?tab=about` | P2 | Static page | Settings | Yes |
| `shop page/about-4.png` | Shop about variant/state 4 | `/store/about` or `/store?tab=about` | P2 | Static page | Settings | Yes |
| `shop page/about-5.png` | Shop about variant/state 5 | `/store/about` or `/store?tab=about` | P2 | Static page | Settings | Yes |

### Single Store / Product Detail

Folder name `单店` likely represents single-store or item-detail long pages. Treat these as P0 product/store browsing designs until visually confirmed.

| File | Page name | Suggested route | Priority | Type | Backend APIs | Can mock first |
|---|---|---|---|---|---|---|
| `单店/57.png` | Product/store detail state 57 | `/products/:product_id` | P0 | Detail page | Product detail, Reviews, Share, Cart | Partially: layout can mock, product/cart should use API |
| `单店/58.png` | Product/store detail state 58 | `/products/:product_id` | P0 | Detail page | Product detail, Reviews, Share, Cart | Partially |
| `单店/59.png` | Product/store detail state 59 | `/products/:product_id` | P0 | Detail page | Product detail, Reviews, Share, Cart | Partially |
| `单店/60.png` | Product/store detail long state 60 | `/products/:product_id` | P0 | Detail page | Product detail, Reviews, Share, Cart | Partially |
| `单店/61.png` | Product/store detail long state 61 | `/products/:product_id` | P0 | Detail page | Product detail, Reviews, Share, Cart | Partially |
| `单店/62.png` | Product/store detail long state 62 | `/products/:product_id` | P0 | Detail page | Product detail, Reviews, Share, Cart | Partially |
| `单店/63.png` | Product/store detail long state 63 | `/products/:product_id` | P0 | Detail page | Product detail, Reviews, Share, Cart | Partially |
| `单店/64.png` | Product/store detail long state 64 | `/products/:product_id` | P0 | Detail page | Product detail, Reviews, Share, Cart | Partially |
| `单店/65.png` | Product/store detail state 65 | `/products/:product_id` | P0 | Detail page | Product detail, Reviews, Share, Cart | Partially |
| `单店/66.png` | Product/store detail long state 66 | `/products/:product_id` | P0 | Detail page | Product detail, Reviews, Share, Cart | Partially |

### Cart

| File | Page name | Suggested route | Priority | Type | Backend APIs | Can mock first |
|---|---|---|---|---|---|---|
| `购物车详情/Group 96.png` | Cart detail, compact/empty or default state | `/cart` | P0 | List page | Cart | No for transaction loop |
| `购物车详情/Group 97.png` | Cart detail state 97 | `/cart` | P0 | List page | Cart | No |
| `购物车详情/Group 98.png` | Cart detail state 98 | `/cart` | P0 | List page | Cart | No |
| `购物车详情/Group 99.png` | Cart detail state 99 | `/cart` | P0 | List page | Cart | No |
| `购物车详情/100.png` | Cart detail state 100 | `/cart` | P0 | List page | Cart | No |

### Checkout

| File | Page name | Suggested route | Priority | Type | Backend APIs | Can mock first |
|---|---|---|---|---|---|---|
| `结算/Group 65.png` | Checkout step/state 65 | `/checkout` | P0 | Form page | Cart, Missing address API, Missing shipping API, Checkout complete | No for transaction loop |
| `结算/Group 66.png` | Checkout step/state 66 | `/checkout` | P0 | Form page | Cart, Missing address API, Missing shipping API, Checkout complete | No |
| `结算/Group 67.png` | Checkout step/state 67 | `/checkout` | P0 | Form page | Cart, Missing address API, Missing shipping API, Checkout complete | No |
| `结算/Group 68.png` | Checkout step/state 68 | `/checkout` | P0 | Form page | Cart, Missing address API, Missing shipping API, Checkout complete | No |
| `结算/Group 70.png` | Checkout step/state 70 | `/checkout` | P0 | Form page | Cart, Missing address API, Missing shipping API, Checkout complete | No |
| `结算/Group 71.png` | Checkout success/error/extended state 71 | `/checkout/success` or `/checkout` | P0 | Status page | Checkout complete, Order lookup, Missing order detail API | Partially until complete-cart wired |

### Delivery Address

| File | Page name | Suggested route | Priority | Type | Backend APIs | Can mock first |
|---|---|---|---|---|---|---|
| `Delivery address/Delivery address.png` | Delivery address list/default | `/account/addresses` or `/checkout/address` | P0/P1 | Form page | Missing address API | Checkout: no; account management: yes |
| `Delivery address/Delivery address-1.png` | Delivery address state 1 | `/account/addresses` or `/checkout/address` | P0/P1 | Form page | Missing address API | Checkout: no; account management: yes |
| `Delivery address/Delivery address-2.png` | Delivery address state 2 | `/account/addresses` or `/checkout/address` | P0/P1 | Form page | Missing address API | Checkout: no; account management: yes |
| `Delivery address/Delivery address-3.png` | Delivery address state 3 | `/account/addresses` or `/checkout/address` | P0/P1 | Form page | Missing address API | Checkout: no; account management: yes |
| `Delivery address/Delivery address-4.png` | Delivery address modal/confirm state | `/checkout/address` | P0 | Popup | Missing address API | No for real checkout |

### Orders

| File | Page name | Suggested route | Priority | Type | Backend APIs | Can mock first |
|---|---|---|---|---|---|---|
| `订单/Body.png` | Order list default/all | `/account/orders` | P0 | List page | Missing order list API | Temporarily yes, but P0 needs API |
| `订单/Body-1.png` | Order list state 1 | `/account/orders?status=processing` | P0 | List page | Missing order list API | Temporarily yes |
| `订单/Body-2.png` | Order list state 2 | `/account/orders?status=shipped` | P0 | List page | Missing order list API | Temporarily yes |
| `订单/Body-3.png` | Order list state 3 | `/account/orders?status=delivered` | P0 | List page | Missing order list API | Temporarily yes |
| `订单/Body-4.png` | Order list expanded/empty/error state 4 | `/account/orders` | P0 | Status page | Missing order list API | Temporarily yes |
| `订单/Body-5.png` | Order list state 5 | `/account/orders` | P0 | List page | Missing order list API | Temporarily yes |
| `订单/Body-6.png` | Order list state 6 | `/account/orders` | P0 | List page | Missing order list API | Temporarily yes |
| `订单/Body-7.png` | Order list state 7 | `/account/orders` | P0 | List page | Missing order list API | Temporarily yes |
| `订单/Body-8.png` | Order list state 8 | `/account/orders` | P0 | List page | Missing order list API | Temporarily yes |
| `订单/Body-9.png` | Order list state 9 | `/account/orders` | P0 | List page | Missing order list API | Temporarily yes |
| `订单/Body-10.png` | Order list state 10 | `/account/orders` | P0 | List page | Missing order list API | Temporarily yes |
| `订单/Body-11.png` | Order list state 11 | `/account/orders` | P0 | List page | Missing order list API | Temporarily yes |
| `订单/Body-12.png` | Order list state 12 | `/account/orders` | P0 | List page | Missing order list API | Temporarily yes |
| `订单/Body-13.png` | Order list state 13 | `/account/orders` | P0 | List page | Missing order list API | Temporarily yes |
| `订单/订单详情页.png` | Order detail | `/account/orders/:order_id` | P0 | Detail page | Missing order detail API, Order tracking | Temporarily yes |
| `订单/订单详情页-1.png` | Order detail state 1 | `/account/orders/:order_id` | P0 | Detail page | Missing order detail API, Order tracking | Temporarily yes |
| `订单/物流追踪页.png` | Logistics tracking page | `/account/orders/:order_id/tracking` | P0 | Detail page | Order tracking | Partially: tracking API exists |
| `订单/Group 46.png` | Order module state/dialog 46 | `/account/orders` | P1 | Status page | Missing order list API or Missing order detail API | Yes |
| `订单/Overlay+OverlayBlur.png` | Order action modal overlay | `/account/orders/:order_id` | P1 | Popup | Missing order detail API, maybe Reviews | Yes |
| `订单/Overlay+OverlayBlur-1.png` | Order action modal overlay state 1 | `/account/orders/:order_id` | P1 | Popup | Missing order detail API, maybe Reviews | Yes |
| `订单/Overlay+OverlayBlur-2.png` | Order action modal overlay state 2 | `/account/orders/:order_id` | P1 | Popup | Missing order detail API, maybe Reviews | Yes |

### Order Detail Long Pages

| File | Page name | Suggested route | Priority | Type | Backend APIs | Can mock first |
|---|---|---|---|---|---|---|
| `订单详情页面/Group 83.png` | Full order detail long state 83 | `/account/orders/:order_id` | P0 | Detail page | Missing order detail API, Order tracking | Temporarily yes |
| `订单详情页面/Group 84.png` | Full order detail long state 84 | `/account/orders/:order_id` | P0 | Detail page | Missing order detail API, Order tracking | Temporarily yes |
| `订单详情页面/Group 85.png` | Full order detail long state 85 | `/account/orders/:order_id` | P0 | Detail page | Missing order detail API, Order tracking | Temporarily yes |
| `订单详情页面/Group 86.png` | Full order detail long state 86 | `/account/orders/:order_id` | P0 | Detail page | Missing order detail API, Order tracking | Temporarily yes |

### Login And Registration

| File | Page name | Suggested route | Priority | Type | Backend APIs | Can mock first |
|---|---|---|---|---|---|---|
| `登录注册/Group 72.png` | Auth state 72 | `/auth/login` | P1 | Form page | Missing buyer auth API | Yes |
| `登录注册/Group 73.png` | Auth state 73 | `/auth/register` | P1 | Form page | Missing buyer auth API | Yes |
| `登录注册/Group 74.png` | Auth state 74 | `/auth/verify` | P1 | Form page | Missing buyer auth API | Yes |
| `登录注册/Group 75.png` | Auth state 75 | `/auth/forgot-password` | P1 | Form page | Missing buyer auth API | Yes |
| `登录注册/Group 76.png` | Auth state 76 | `/auth/reset-password` | P1 | Form page | Missing buyer auth API | Yes |
| `登录注册/Group 77.png` | Auth state 77 | `/auth/login` | P1 | Form page | Missing buyer auth API | Yes |
| `登录注册/Group 78.png` | Auth state 78 | `/auth/register` | P1 | Form page | Missing buyer auth API | Yes |
| `登录注册/Group 79.png` | Auth state 79 | `/auth/verify` | P1 | Form page | Missing buyer auth API | Yes |
| `登录注册/Group 80.png` | Auth state 80 | `/auth/login` | P1 | Status page | Missing buyer auth API | Yes |
| `登录注册/Group 81.png` | Auth state 81 | `/auth/register` | P1 | Status page | Missing buyer auth API | Yes |

### Profile

| File | Page name | Suggested route | Priority | Type | Backend APIs | Can mock first |
|---|---|---|---|---|---|---|
| `Profile/Profile.png` | Profile overview | `/account/profile` | P1 | Detail page | Missing buyer profile API | Yes |
| `Profile/Profile-1.png` | Profile edit state 1 | `/account/profile/edit` | P1 | Form page | Missing buyer profile API | Yes |
| `Profile/Profile-2.png` | Profile edit state 2 | `/account/profile/edit` | P1 | Form page | Missing buyer profile API | Yes |
| `Profile/Profile-3.png` | Profile state 3 | `/account/profile` | P1 | Status page | Missing buyer profile API | Yes |
| `Profile/Profile-4.png` | Profile state 4 | `/account/profile` | P1 | Status page | Missing buyer profile API | Yes |

### Account And Security

| File | Page name | Suggested route | Priority | Type | Backend APIs | Can mock first |
|---|---|---|---|---|---|---|
| `Account & Security/Group 60.png` | Account security overview | `/account/security` | P2 | Detail page | Missing buyer auth/security API | Yes |
| `Account & Security/Group 61.png` | Account security state 61 | `/account/security` | P2 | Form page | Missing buyer auth/security API | Yes |
| `Account & Security/Group 62.png` | Account security state 62 | `/account/security` | P2 | Form page | Missing buyer auth/security API | Yes |
| `Account & Security/Group 63.png` | Account security state 63 | `/account/security` | P2 | Status page | Missing buyer auth/security API | Yes |
| `Account & Security/Group 64.png` | Account security state 64 | `/account/security` | P2 | Status page | Missing buyer auth/security API | Yes |

### Follow

| File | Page name | Suggested route | Priority | Type | Backend APIs | Can mock first |
|---|---|---|---|---|---|---|
| `Follow/Follow.png` | Followed stores/products | `/account/following` | P1 | List page | Missing follow API, Settings, Products | Yes |
| `Follow/Follow-1.png` | Followed stores/products state 1 | `/account/following` | P1 | List page | Missing follow API, Settings, Products | Yes |
| `Follow/Follow-2.png` | Followed stores/products state 2 | `/account/following` | P1 | List page | Missing follow API, Settings, Products | Yes |

### Coupons

| File | Page name | Suggested route | Priority | Type | Backend APIs | Can mock first |
|---|---|---|---|---|---|---|
| `coupons/coupons.png` | Coupon list | `/account/coupons` | P1 | List page | Missing coupon/promotion API | Yes |
| `coupons/coupons (1).png` | Coupon list state 1 | `/account/coupons` | P1 | List page | Missing coupon/promotion API | Yes |

### Country, Currency, Language

| File | Page name | Suggested route | Priority | Type | Backend APIs | Can mock first |
|---|---|---|---|---|---|---|
| `Country & region/Country & region.png` | Country and region selector | `/settings/country-region` | P2 | Form page | Static config or Missing localization API | Yes |
| `Currency/Currency.png` | Currency selector | `/settings/currency` | P2 | Form page | Static config or Missing currency API | Yes |
| `辅助页/Language/Language.png` | Language selector | `/settings/language` | P2 | Form page | Static config or Missing localization API | Yes |

### Help Center

| File | Page name | Suggested route | Priority | Type | Backend APIs | Can mock first |
|---|---|---|---|---|---|---|
| `Help Center/Help Center.png` | Help center | `/help` | P2 | Static page | Static CMS or Missing help API | Yes |
| `Help Center/Help Center-1.png` | Help center state 1 | `/help` | P2 | Static page | Static CMS or Missing help API | Yes |

### Auxiliary Pages

| File | Page name | Suggested route | Priority | Type | Backend APIs | Can mock first |
|---|---|---|---|---|---|---|
| `辅助页/辅助页.png` | Auxiliary page hub | `/settings` | P2 | Static page | Settings | Yes |
| `辅助页/Settings & Information.png` | Settings and information | `/settings` | P2 | Static page | Settings | Yes |
| `辅助页/About.png` | About page | `/about` | P2 | Static page | Settings | Yes |
| `辅助页/About-1.png` | About page state 1 | `/about` | P2 | Static page | Settings | Yes |
| `辅助页/About-2.png` | About page state 2 | `/about` | P2 | Static page | Settings | Yes |
| `辅助页/Notifications.png` | Notifications list/default | `/account/notifications` | P2 | List page | Missing notifications API | Yes |
| `辅助页/Notifications-1.png` | Notifications state 1 | `/account/notifications` | P2 | List page | Missing notifications API | Yes |
| `辅助页/Notifications-2.png` | Notifications state 2 | `/account/notifications` | P2 | List page | Missing notifications API | Yes |
| `辅助页/Notifications-3.png` | Notifications state 3 | `/account/notifications` | P2 | List page | Missing notifications API | Yes |
| `辅助页/Notifications-4.png` | Notifications state 4 | `/account/notifications` | P2 | List page | Missing notifications API | Yes |
| `辅助页/二期页面.png` | Phase 2 placeholder/page collection | `/phase-2` | P2 | Static page | TBD | Yes |

## Recommended Implementation Order

1. P0 store foundation:
   - Implement shared layout from shop/store designs.
   - Wire `GET /store/settings`, `GET /store/product-categories`, and `GET /store/products`.
   - Pages: `shop page/shop page*.png`.

2. P0 product detail and add-to-cart:
   - Implement product detail from `单店/*.png`.
   - Wire `GET /store/products/:product_id`, reviews list, share, and cart add.
   - Keep variant/color/size behavior explicit; current backend only exposes `medusa_variant_id`.

3. P0 cart:
   - Implement `购物车详情/*.png`.
   - Wire create/get/add/update/delete cart APIs.

4. P0 checkout shell plus backend gap:
   - Implement `结算/*.png` and `Delivery address/*.png`.
   - Add/wire cart address update before treating checkout as real.
   - Add shipping options only if Medusa checkout requires it.

5. P0 order confirmation, lookup, tracking, and detail:
   - Wire `POST /store/carts/:cart_id/complete`.
   - Implement order lookup/tracking using existing APIs.
   - Add full order detail API before replacing all order detail mock data.
   - Pages: `订单/订单详情页*.png`, `订单/物流追踪页.png`, `订单详情页面/*.png`.

6. P0/P1 order list:
   - Implement `订单/Body*.png`.
   - Add order list API or define guest/account access model.

7. P1 account and engagement:
   - Login/register, profile, follow, coupons.
   - These can be mocked until buyer auth/profile/follow/coupon APIs are planned.

8. P2 settings/support/static:
   - Country/region, currency, language, help center, notifications, about, settings.
   - Prefer static config or mock data first unless product scope requires persistence.

## Backend Gaps Highlighted By Designs

- Cart address update is required for checkout and delivery address screens.
- Full order detail is required for order detail long pages.
- Order list is required for order center tabs/states.
- Shipping options may be required depending on checkout design and Medusa completion constraints.
- Buyer auth/profile/security APIs are required for login, profile, account security, and account-owned order list.
- Follow, coupon, notification, localization, and help-center APIs are P1/P2 unless explicitly pulled into P0.

## Notes For UI Build

- Use these PNGs as visual source of truth; use `apps/storefront` only as API-client reference.
- Preserve every filename in implementation tracking tasks so design QA can map screens back to source images.
- For generic filenames, visually inspect before coding and rename internal tasks/components with clearer names.
- Do not block P0 transaction pages on P1/P2 account settings APIs; mock those modules until backend scope is approved.
