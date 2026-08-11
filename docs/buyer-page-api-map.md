# Buyer Page API Map

Date: 2026-06-15

Sources:

- `docs/buyer-api-contract.md`
- `docs/buyer-design-inventory.md`

Legend:

- Data source: `real API`, `mock temporary`, `static design content`
- Backend support: `supported`, `partial`, `backend_missing`, `not_required`
- Implementation marker: `ui_first`, `backend_first`, `backend_missing`
- P0 pages are listed first.

## P0 Transaction Loop

### Store Home And Product Browsing

| Design path | Route | Display data | Data source | APIs | Frontend client functions | Backend support | Marker |
|---|---|---|---|---|---|---|---|
| `designs/buyer-ui/shop page/shop page.png` | `/store` | Store brand/header, category navigation, product grid, product images/prices/ratings, cart-ready state | real API + static design content | `GET /store/settings`; `GET /store/product-categories`; `GET /store/products` | `fetchStoreSettings()`; `fetchProductCategories()`; `fetchProducts()` | supported; product filtering/sort is partial | `ui_first` |
| `designs/buyer-ui/shop page/shop page-1.png` | `/store` | Shop home variant/state: same data as store home | real API + static design content | `GET /store/settings`; `GET /store/product-categories`; `GET /store/products` | `fetchStoreSettings()`; `fetchProductCategories()`; `fetchProducts()` | supported; product filtering/sort is partial | `ui_first` |
| `designs/buyer-ui/shop page/shop page-2.png` | `/store` | Shop home variant/state: same data as store home | real API + static design content | `GET /store/settings`; `GET /store/product-categories`; `GET /store/products` | `fetchStoreSettings()`; `fetchProductCategories()`; `fetchProducts()` | supported; product filtering/sort is partial | `ui_first` |
| `designs/buyer-ui/shop page/shop page-3.png` | `/store` | Shop home variant/state: same data as store home | real API + static design content | `GET /store/settings`; `GET /store/product-categories`; `GET /store/products` | `fetchStoreSettings()`; `fetchProductCategories()`; `fetchProducts()` | supported; product filtering/sort is partial | `ui_first` |

### Product Detail

| Design path | Route | Display data | Data source | APIs | Frontend client functions | Backend support | Marker |
|---|---|---|---|---|---|---|---|
| `designs/buyer-ui/单店/57.png` | `/products/:product_id` | Product media, title, description, price, rating, review summary, share options, add-to-cart state | real API + static design content | `GET /store/products/:product_id`; `GET /store/products/:product_id/reviews`; `GET /store/products/:product_id/share`; cart APIs | `fetchProductDetail()`; `fetchProductReviews()`; `fetchProductShare()`; `createCart()`; `addCartLineItem()` | supported; variant option UX is partial | `ui_first` |
| `designs/buyer-ui/单店/58.png` | `/products/:product_id` | Product detail state/variant | real API + static design content | Product detail; Reviews; Share; Cart | `fetchProductDetail()`; `fetchProductReviews()`; `fetchProductShare()`; `addCartLineItem()` | supported; variant option UX is partial | `ui_first` |
| `designs/buyer-ui/单店/59.png` | `/products/:product_id` | Product detail state/variant | real API + static design content | Product detail; Reviews; Share; Cart | `fetchProductDetail()`; `fetchProductReviews()`; `fetchProductShare()`; `addCartLineItem()` | supported; variant option UX is partial | `ui_first` |
| `designs/buyer-ui/单店/60.png` | `/products/:product_id` | Long product detail content, recommendations or specs | real API + mock temporary + static design content | Product detail; Reviews; Share; Cart | `fetchProductDetail()`; `fetchProductReviews()`; `fetchProductShare()`; `addCartLineItem()` | supported; specs/recommendations may need mock | `ui_first` |
| `designs/buyer-ui/单店/61.png` | `/products/:product_id` | Long product detail state/variant | real API + mock temporary + static design content | Product detail; Reviews; Share; Cart | `fetchProductDetail()`; `fetchProductReviews()`; `fetchProductShare()`; `addCartLineItem()` | supported; specs/recommendations may need mock | `ui_first` |
| `designs/buyer-ui/单店/62.png` | `/products/:product_id` | Long product detail state/variant | real API + mock temporary + static design content | Product detail; Reviews; Share; Cart | `fetchProductDetail()`; `fetchProductReviews()`; `fetchProductShare()`; `addCartLineItem()` | supported; specs/recommendations may need mock | `ui_first` |
| `designs/buyer-ui/单店/63.png` | `/products/:product_id` | Long product detail state/variant | real API + mock temporary + static design content | Product detail; Reviews; Share; Cart | `fetchProductDetail()`; `fetchProductReviews()`; `fetchProductShare()`; `addCartLineItem()` | supported; specs/recommendations may need mock | `ui_first` |
| `designs/buyer-ui/单店/64.png` | `/products/:product_id` | Long product detail state/variant | real API + mock temporary + static design content | Product detail; Reviews; Share; Cart | `fetchProductDetail()`; `fetchProductReviews()`; `fetchProductShare()`; `addCartLineItem()` | supported; specs/recommendations may need mock | `ui_first` |
| `designs/buyer-ui/单店/65.png` | `/products/:product_id` | Product detail state/variant | real API + static design content | Product detail; Reviews; Share; Cart | `fetchProductDetail()`; `fetchProductReviews()`; `fetchProductShare()`; `addCartLineItem()` | supported; variant option UX is partial | `ui_first` |
| `designs/buyer-ui/单店/66.png` | `/products/:product_id` | Long product detail state/variant | real API + mock temporary + static design content | Product detail; Reviews; Share; Cart | `fetchProductDetail()`; `fetchProductReviews()`; `fetchProductShare()`; `addCartLineItem()` | supported; specs/recommendations may need mock | `ui_first` |

### Cart

| Design path | Route | Display data | Data source | APIs | Frontend client functions | Backend support | Marker |
|---|---|---|---|---|---|---|---|
| `designs/buyer-ui/购物车详情/Group 96.png` | `/cart` | Cart lines, product image/title/options, quantity, remove action, subtotal/total, checkout entry | real API | `POST /store/carts`; `GET /store/carts/:cart_id`; `PUT /store/carts/:cart_id/line-items/:line_id`; `DELETE /store/carts/:cart_id/line-items/:line_id` | `createCart()`; `fetchCart()`; `updateCartLineItem()`; `deleteCartLineItem()` | supported | `ui_first` |
| `designs/buyer-ui/购物车详情/Group 97.png` | `/cart` | Cart state/variant | real API | Cart APIs | `fetchCart()`; `updateCartLineItem()`; `deleteCartLineItem()` | supported | `ui_first` |
| `designs/buyer-ui/购物车详情/Group 98.png` | `/cart` | Cart state/variant | real API | Cart APIs | `fetchCart()`; `updateCartLineItem()`; `deleteCartLineItem()` | supported | `ui_first` |
| `designs/buyer-ui/购物车详情/Group 99.png` | `/cart` | Cart state/variant | real API | Cart APIs | `fetchCart()`; `updateCartLineItem()`; `deleteCartLineItem()` | supported | `ui_first` |
| `designs/buyer-ui/购物车详情/100.png` | `/cart` | Cart state/variant | real API | Cart APIs | `fetchCart()`; `updateCartLineItem()`; `deleteCartLineItem()` | supported | `ui_first` |

### Checkout And Address

| Design path | Route | Display data | Data source | APIs | Frontend client functions | Backend support | Marker |
|---|---|---|---|---|---|---|---|
| `designs/buyer-ui/结算/Group 65.png` | `/checkout` | Cart summary, contact info, delivery address, payment/default provider, place order action | real API + form state | `GET /store/carts/:cart_id`; missing cart address update; missing shipping option if needed; `POST /store/carts/:cart_id/complete` | `fetchCart()`; `updateCartAddress()`; `completeCart()` | partial; address/shipping missing | `backend_missing`, `backend_first` |
| `designs/buyer-ui/结算/Group 66.png` | `/checkout` | Checkout state/variant | real API + form state | Cart; address update; shipping; checkout complete | `fetchCart()`; `updateCartAddress()`; `completeCart()` | partial; address/shipping missing | `backend_missing`, `backend_first` |
| `designs/buyer-ui/结算/Group 67.png` | `/checkout` | Checkout state/variant | real API + form state | Cart; address update; shipping; checkout complete | `fetchCart()`; `updateCartAddress()`; `completeCart()` | partial; address/shipping missing | `backend_missing`, `backend_first` |
| `designs/buyer-ui/结算/Group 68.png` | `/checkout` | Checkout state/variant | real API + form state | Cart; address update; shipping; checkout complete | `fetchCart()`; `updateCartAddress()`; `completeCart()` | partial; address/shipping missing | `backend_missing`, `backend_first` |
| `designs/buyer-ui/结算/Group 70.png` | `/checkout` | Checkout state/variant | real API + form state | Cart; address update; shipping; checkout complete | `fetchCart()`; `updateCartAddress()`; `completeCart()` | partial; address/shipping missing | `backend_missing`, `backend_first` |
| `designs/buyer-ui/结算/Group 71.png` | `/checkout/success` | Order success/error state, order id/number, payment/fulfillment status | real API + mock temporary | `POST /store/carts/:cart_id/complete`; `GET /store/orders/lookup`; missing full order detail | `completeCart()`; `lookupOrder()`; `fetchOrderDetail()` | partial; full detail missing | `backend_missing`, `backend_first` |
| `designs/buyer-ui/Delivery address/Delivery address.png` | `/checkout/address` or `/account/addresses` | Address list/form, selected delivery address | form state + mock temporary | missing cart address update | `updateCartAddress()` | backend_missing | `backend_missing`, `backend_first` for checkout |
| `designs/buyer-ui/Delivery address/Delivery address-1.png` | `/checkout/address` or `/account/addresses` | Address state/variant | form state + mock temporary | missing cart address update | `updateCartAddress()` | backend_missing | `backend_missing`, `backend_first` for checkout |
| `designs/buyer-ui/Delivery address/Delivery address-2.png` | `/checkout/address` or `/account/addresses` | Address state/variant | form state + mock temporary | missing cart address update | `updateCartAddress()` | backend_missing | `backend_missing`, `backend_first` for checkout |
| `designs/buyer-ui/Delivery address/Delivery address-3.png` | `/checkout/address` or `/account/addresses` | Address state/variant | form state + mock temporary | missing cart address update | `updateCartAddress()` | backend_missing | `backend_missing`, `backend_first` for checkout |
| `designs/buyer-ui/Delivery address/Delivery address-4.png` | `/checkout/address` | Address popup/confirmation state | form state + mock temporary | missing cart address update | `updateCartAddress()` | backend_missing | `backend_missing`, `backend_first` |

### Orders And Tracking

| Design path | Route | Display data | Data source | APIs | Frontend client functions | Backend support | Marker |
|---|---|---|---|---|---|---|---|
| `designs/buyer-ui/订单/Body.png` | `/account/orders` | Order list, order number, status, item preview, total, action buttons | mock temporary | missing order list API | `fetchOrders()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/订单/Body-1.png` | `/account/orders?status=processing` | Filtered order list state | mock temporary | missing order list API | `fetchOrders()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/订单/Body-2.png` | `/account/orders?status=shipped` | Filtered order list state | mock temporary | missing order list API | `fetchOrders()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/订单/Body-3.png` | `/account/orders?status=delivered` | Filtered order list state | mock temporary | missing order list API | `fetchOrders()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/订单/Body-4.png` | `/account/orders` | Order list empty/error/expanded state | mock temporary | missing order list API | `fetchOrders()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/订单/Body-5.png` | `/account/orders` | Order list state | mock temporary | missing order list API | `fetchOrders()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/订单/Body-6.png` | `/account/orders` | Order list state | mock temporary | missing order list API | `fetchOrders()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/订单/Body-7.png` | `/account/orders` | Order list state | mock temporary | missing order list API | `fetchOrders()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/订单/Body-8.png` | `/account/orders` | Order list state | mock temporary | missing order list API | `fetchOrders()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/订单/Body-9.png` | `/account/orders` | Order list state | mock temporary | missing order list API | `fetchOrders()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/订单/Body-10.png` | `/account/orders` | Order list state | mock temporary | missing order list API | `fetchOrders()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/订单/Body-11.png` | `/account/orders` | Order list state | mock temporary | missing order list API | `fetchOrders()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/订单/Body-12.png` | `/account/orders` | Order list state | mock temporary | missing order list API | `fetchOrders()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/订单/Body-13.png` | `/account/orders` | Order list state | mock temporary | missing order list API | `fetchOrders()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/订单/订单详情页.png` | `/account/orders/:order_id` | Order header, items, totals, address, payment status, fulfillment status, actions | mock temporary + partial real tracking | missing full order detail; `GET /store/orders/:order_id/tracking` | `fetchOrderDetail()`; `fetchOrderTracking()` | backend_missing for full detail; tracking supported | `backend_missing`, `ui_first` |
| `designs/buyer-ui/订单/订单详情页-1.png` | `/account/orders/:order_id` | Order detail state | mock temporary + partial real tracking | missing full order detail; Order tracking | `fetchOrderDetail()`; `fetchOrderTracking()` | backend_missing for full detail; tracking supported | `backend_missing`, `ui_first` |
| `designs/buyer-ui/订单/物流追踪页.png` | `/account/orders/:order_id/tracking` | Tracking timeline, carrier, shipment status, fulfillment status | real API + mock temporary for display details | `GET /store/orders/:order_id/tracking` | `fetchOrderTracking()` | supported for tracking only | `ui_first` |
| `designs/buyer-ui/订单详情页面/Group 83.png` | `/account/orders/:order_id` | Full long order detail state | mock temporary + partial real tracking | missing full order detail; Order tracking | `fetchOrderDetail()`; `fetchOrderTracking()` | backend_missing for full detail | `backend_missing`, `ui_first` |
| `designs/buyer-ui/订单详情页面/Group 84.png` | `/account/orders/:order_id` | Full long order detail state | mock temporary + partial real tracking | missing full order detail; Order tracking | `fetchOrderDetail()`; `fetchOrderTracking()` | backend_missing for full detail | `backend_missing`, `ui_first` |
| `designs/buyer-ui/订单详情页面/Group 85.png` | `/account/orders/:order_id` | Full long order detail state | mock temporary + partial real tracking | missing full order detail; Order tracking | `fetchOrderDetail()`; `fetchOrderTracking()` | backend_missing for full detail | `backend_missing`, `ui_first` |
| `designs/buyer-ui/订单详情页面/Group 86.png` | `/account/orders/:order_id` | Full long order detail state | mock temporary + partial real tracking | missing full order detail; Order tracking | `fetchOrderDetail()`; `fetchOrderTracking()` | backend_missing for full detail | `backend_missing`, `ui_first` |

## P1 User Center And Enhanced Features

### Order Actions

| Design path | Route | Display data | Data source | APIs | Frontend client functions | Backend support | Marker |
|---|---|---|---|---|---|---|---|
| `designs/buyer-ui/订单/Group 46.png` | `/account/orders` | Order module dialog/status state | mock temporary | missing order list/detail API | `fetchOrders()`; `fetchOrderDetail()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/订单/Overlay+OverlayBlur.png` | `/account/orders/:order_id` | Order action modal, confirmation/review/refund/share state | mock temporary | missing full order detail; maybe Reviews | `fetchOrderDetail()`; `createProductReview()` | backend_missing for detail; reviews supported | `backend_missing`, `ui_first` |
| `designs/buyer-ui/订单/Overlay+OverlayBlur-1.png` | `/account/orders/:order_id` | Order action modal state | mock temporary | missing full order detail; maybe Reviews | `fetchOrderDetail()`; `createProductReview()` | backend_missing for detail; reviews supported | `backend_missing`, `ui_first` |
| `designs/buyer-ui/订单/Overlay+OverlayBlur-2.png` | `/account/orders/:order_id` | Order action modal state | mock temporary | missing full order detail; maybe Reviews | `fetchOrderDetail()`; `createProductReview()` | backend_missing for detail; reviews supported | `backend_missing`, `ui_first` |

### Auth

| Design path | Route | Display data | Data source | APIs | Frontend client functions | Backend support | Marker |
|---|---|---|---|---|---|---|---|
| `designs/buyer-ui/登录注册/Group 72.png` | `/auth/login` | Login form/state | mock temporary | missing buyer auth API | `loginBuyer()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/登录注册/Group 73.png` | `/auth/register` | Register form/state | mock temporary | missing buyer auth API | `registerBuyer()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/登录注册/Group 74.png` | `/auth/verify` | Verification form/state | mock temporary | missing buyer auth API | `verifyBuyerAuth()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/登录注册/Group 75.png` | `/auth/forgot-password` | Forgot password form/state | mock temporary | missing buyer auth API | `requestPasswordReset()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/登录注册/Group 76.png` | `/auth/reset-password` | Reset password form/state | mock temporary | missing buyer auth API | `resetPassword()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/登录注册/Group 77.png` | `/auth/login` | Login alternate state | mock temporary | missing buyer auth API | `loginBuyer()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/登录注册/Group 78.png` | `/auth/register` | Register alternate state | mock temporary | missing buyer auth API | `registerBuyer()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/登录注册/Group 79.png` | `/auth/verify` | Verification alternate state | mock temporary | missing buyer auth API | `verifyBuyerAuth()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/登录注册/Group 80.png` | `/auth/login` | Auth status/result state | mock temporary | missing buyer auth API | `loginBuyer()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/登录注册/Group 81.png` | `/auth/register` | Auth status/result state | mock temporary | missing buyer auth API | `registerBuyer()` | backend_missing | `backend_missing`, `ui_first` |

### Profile, Follow, Coupons

| Design path | Route | Display data | Data source | APIs | Frontend client functions | Backend support | Marker |
|---|---|---|---|---|---|---|---|
| `designs/buyer-ui/Profile/Profile.png` | `/account/profile` | Buyer profile overview | mock temporary | missing buyer profile API | `fetchBuyerProfile()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/Profile/Profile-1.png` | `/account/profile/edit` | Profile edit form | mock temporary | missing buyer profile API | `fetchBuyerProfile()`; `updateBuyerProfile()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/Profile/Profile-2.png` | `/account/profile/edit` | Profile edit extended state | mock temporary | missing buyer profile API | `fetchBuyerProfile()`; `updateBuyerProfile()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/Profile/Profile-3.png` | `/account/profile` | Profile status state | mock temporary | missing buyer profile API | `fetchBuyerProfile()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/Profile/Profile-4.png` | `/account/profile` | Profile status state | mock temporary | missing buyer profile API | `fetchBuyerProfile()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/Follow/Follow.png` | `/account/following` | Followed stores/products list | mock temporary + optional real product/settings | missing follow API; Settings; Products | `fetchFollowedItems()`; `fetchStoreSettings()`; `fetchProducts()` | backend_missing for follow | `backend_missing`, `ui_first` |
| `designs/buyer-ui/Follow/Follow-1.png` | `/account/following` | Follow list state | mock temporary + optional real product/settings | missing follow API; Settings; Products | `fetchFollowedItems()`; `fetchStoreSettings()`; `fetchProducts()` | backend_missing for follow | `backend_missing`, `ui_first` |
| `designs/buyer-ui/Follow/Follow-2.png` | `/account/following` | Follow list state | mock temporary + optional real product/settings | missing follow API; Settings; Products | `fetchFollowedItems()`; `fetchStoreSettings()`; `fetchProducts()` | backend_missing for follow | `backend_missing`, `ui_first` |
| `designs/buyer-ui/coupons/coupons.png` | `/account/coupons` | Coupon list, coupon state, expiry, usage action | mock temporary | missing coupon/promotion API | `fetchCoupons()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/coupons/coupons (1).png` | `/account/coupons` | Coupon list state | mock temporary | missing coupon/promotion API | `fetchCoupons()` | backend_missing | `backend_missing`, `ui_first` |

## P2 Settings, Support, Static, Auxiliary

### Store About

| Design path | Route | Display data | Data source | APIs | Frontend client functions | Backend support | Marker |
|---|---|---|---|---|---|---|---|
| `designs/buyer-ui/shop page/about.png` | `/store/about` or `/store?tab=about` | Store about content, store identity, policies | static design content + real settings | `GET /store/settings` | `fetchStoreSettings()` | supported for settings only | `ui_first` |
| `designs/buyer-ui/shop page/about-1.png` | `/store/about` or `/store?tab=about` | Store about state | static design content + real settings | Settings | `fetchStoreSettings()` | supported for settings only | `ui_first` |
| `designs/buyer-ui/shop page/about-2.png` | `/store/about` or `/store?tab=about` | Store about state | static design content + real settings | Settings | `fetchStoreSettings()` | supported for settings only | `ui_first` |
| `designs/buyer-ui/shop page/about-3.png` | `/store/about` or `/store?tab=about` | Store about state | static design content + real settings | Settings | `fetchStoreSettings()` | supported for settings only | `ui_first` |
| `designs/buyer-ui/shop page/about-4.png` | `/store/about` or `/store?tab=about` | Store about state | static design content + real settings | Settings | `fetchStoreSettings()` | supported for settings only | `ui_first` |
| `designs/buyer-ui/shop page/about-5.png` | `/store/about` or `/store?tab=about` | Store about state | static design content + real settings | Settings | `fetchStoreSettings()` | supported for settings only | `ui_first` |

### Account Security And Settings

| Design path | Route | Display data | Data source | APIs | Frontend client functions | Backend support | Marker |
|---|---|---|---|---|---|---|---|
| `designs/buyer-ui/Account & Security/Group 60.png` | `/account/security` | Account security settings | mock temporary | missing buyer auth/security API | `fetchAccountSecurity()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/Account & Security/Group 61.png` | `/account/security` | Security form state | mock temporary | missing buyer auth/security API | `updateAccountSecurity()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/Account & Security/Group 62.png` | `/account/security` | Security form state | mock temporary | missing buyer auth/security API | `updateAccountSecurity()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/Account & Security/Group 63.png` | `/account/security` | Security status state | mock temporary | missing buyer auth/security API | `fetchAccountSecurity()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/Account & Security/Group 64.png` | `/account/security` | Security status state | mock temporary | missing buyer auth/security API | `fetchAccountSecurity()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/Country & region/Country & region.png` | `/settings/country-region` | Country/region list and selected region | static design content | none or missing localization API | `fetchCountryRegions()` | not_required for static | `ui_first` |
| `designs/buyer-ui/Currency/Currency.png` | `/settings/currency` | Currency list and selected currency | static design content | none or missing currency API | `fetchCurrencies()` | not_required for static | `ui_first` |
| `designs/buyer-ui/辅助页/Language/Language.png` | `/settings/language` | Language list and selected language | static design content | none or missing localization API | `fetchLanguages()` | not_required for static | `ui_first` |

### Help And Auxiliary

| Design path | Route | Display data | Data source | APIs | Frontend client functions | Backend support | Marker |
|---|---|---|---|---|---|---|---|
| `designs/buyer-ui/Help Center/Help Center.png` | `/help` | Help center categories/articles/search shell | static design content | none or missing help CMS API | `fetchHelpContent()` | not_required for static | `ui_first` |
| `designs/buyer-ui/Help Center/Help Center-1.png` | `/help` | Help center state | static design content | none or missing help CMS API | `fetchHelpContent()` | not_required for static | `ui_first` |
| `designs/buyer-ui/辅助页/辅助页.png` | `/settings` | Settings/auxiliary hub | static design content + optional settings | `GET /store/settings` | `fetchStoreSettings()` | supported for settings | `ui_first` |
| `designs/buyer-ui/辅助页/Settings & Information.png` | `/settings` | Settings and information page | static design content + optional settings | `GET /store/settings` | `fetchStoreSettings()` | supported for settings | `ui_first` |
| `designs/buyer-ui/辅助页/About.png` | `/about` | About page | static design content + optional settings | `GET /store/settings` | `fetchStoreSettings()` | supported for settings | `ui_first` |
| `designs/buyer-ui/辅助页/About-1.png` | `/about` | About page state | static design content + optional settings | `GET /store/settings` | `fetchStoreSettings()` | supported for settings | `ui_first` |
| `designs/buyer-ui/辅助页/About-2.png` | `/about` | About page state | static design content + optional settings | `GET /store/settings` | `fetchStoreSettings()` | supported for settings | `ui_first` |
| `designs/buyer-ui/辅助页/Notifications.png` | `/account/notifications` | Notifications list | mock temporary | missing notifications API | `fetchNotifications()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/辅助页/Notifications-1.png` | `/account/notifications` | Notifications state | mock temporary | missing notifications API | `fetchNotifications()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/辅助页/Notifications-2.png` | `/account/notifications` | Notifications state | mock temporary | missing notifications API | `fetchNotifications()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/辅助页/Notifications-3.png` | `/account/notifications` | Notifications state | mock temporary | missing notifications API | `fetchNotifications()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/辅助页/Notifications-4.png` | `/account/notifications` | Notifications state | mock temporary | missing notifications API | `fetchNotifications()` | backend_missing | `backend_missing`, `ui_first` |
| `designs/buyer-ui/辅助页/二期页面.png` | `/phase-2` | Phase 2 placeholder/page collection | static design content | TBD | none | not_required | `ui_first` |

## Backend-First Summary

These pages need backend work before they can be considered truly functional:

- Checkout and delivery address:
  - `designs/buyer-ui/结算/*.png`
  - `designs/buyer-ui/Delivery address/*.png`
  - Missing: cart address update; maybe shipping options.

- Full order detail and order list:
  - `designs/buyer-ui/订单/Body*.png`
  - `designs/buyer-ui/订单/订单详情页*.png`
  - `designs/buyer-ui/订单详情页面/*.png`
  - Missing: full order detail; order list.

- Account features:
  - Auth, profile, security, follow, coupons, notifications.
  - Missing: buyer auth/profile/follow/coupon/notification APIs.

## UI-First Summary

These pages can be implemented visually first while using current APIs or temporary static data:

- Store home and product browsing.
- Product detail, as long as option selectors are treated as visual/static until backend variant contract exists.
- Cart.
- Tracking page, using existing order tracking API plus mock display details.
- Store/about/help/settings/static auxiliary pages.
- P1/P2 account pages if clearly scoped as mock temporary.

## Suggested Client Function Map

Core functions from `docs/buyer-api-contract.md`:

```ts
fetchStoreSettings()
fetchProductCategories()
fetchProducts()
fetchProductDetail(productId)
fetchProductReviews(productId, params)
createProductReview(productId, body)
fetchProductShare(productId)

createCart(input)
fetchCart(cartId)
addCartLineItem(cartId, input)
updateCartLineItem(cartId, lineId, input)
deleteCartLineItem(cartId, lineId)
updateCartAddress(cartId, input)
completeCart(cartId, input)

lookupOrder(input)
fetchOrderTracking(orderId, input)
fetchOrderDetail(orderId, input)
fetchOrders(params)
```

Additional placeholder client names for P1/P2 modules:

```ts
loginBuyer()
registerBuyer()
verifyBuyerAuth()
requestPasswordReset()
resetPassword()
fetchBuyerProfile()
updateBuyerProfile()
fetchAccountSecurity()
updateAccountSecurity()
fetchFollowedItems()
fetchCoupons()
fetchCountryRegions()
fetchCurrencies()
fetchLanguages()
fetchHelpContent()
fetchNotifications()
```
