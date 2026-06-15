# Buyer Frontend Current State

Date: 2026-06-15

Branch inspected: `feature/buyer-frontend-integration`

## Summary

`apps/storefront` is now tracked source on the current branch. It was copied from `ai-commerce-platform-supplier-test/apps/storefront`, not from `feature/frontend-demo`.

The storefront is a Vite React buyer prototype. It has real backend integration for the catalog and cart path, while checkout completion and account/order views remain mock or preview-only. The current runtime shape is:

- Product list: real `GET /store/products`, with mock fallback.
- Product detail: real `GET /store/products/:id`, with mock fallback.
- Cart: real create/get/add/update/remove custom store APIs.
- Checkout: UI-only form and preview success page; it does not call complete-cart yet.
- Orders/account: mock data from `src/lib/mock-data.ts`.
- Reviews tab: mock data from `src/lib/mock-data.ts`.
- Store settings/categories/header/hero/footer: static/local data, not backend-driven.

## Store API Endpoints Currently Available

All store-aware custom APIs resolve store context from `X-Store-Id`, then localhost/default fallback via `DEFAULT_STORE_ID` (`default_store` by default). Storefront requests include `x-publishable-api-key` and `X-Store-Id` through `apps/storefront/src/lib/store-api.ts`.

### Store Context

- `GET /store-context`
  - Debug endpoint for resolved store context.

### Public Store Settings And Catalog

- `GET /store/settings`
  - Returns public store settings for the resolved store.

- `GET /store/product-categories`
  - Returns categories scoped to the resolved store.

- `GET /store/products`
  - Returns published store-core products scoped to the resolved store.
  - Product response includes cart bridge fields such as `medusa_product_id`, `medusa_variant_id`, and `is_cart_addable`.
  - Product response also includes review summary fields `average_rating` and `review_count`.

- `GET /store/products/:id`
  - Returns one published store-core product scoped to the resolved store.

- `GET /store/products/:id/reviews`
  - Returns published reviews and rating summary for a product.

- `POST /store/products/:id/reviews`
  - Creates a review after validating buyer email/order display id and purchase history.

- `GET /store/products/:id/share`
  - Returns product URL, share text, and channel-specific share links.

### Platform And Supplier Catalog

- `GET /store/platform-products`
  - Lists active global platform products.

- `GET /store/supplier-products`
  - Lists active supplier products, variants, print specs, and platform design templates.
  - Optional query: `platform_product_id`.

### Cart And Checkout

- `POST /store/carts`
  - Creates a cart bound to the resolved store through `cart.metadata.store_id`.
  - Request body supports `customer_email`, `currency_code`, and `region_id`.

- `GET /store/carts/:id`
  - Retrieves a cart with items, shipping address, and billing address after verifying it belongs to the resolved store.

- `POST /store/carts/:id/line-items`
  - Adds a line item by native Medusa `variant_id`.
  - The frontend must pass `medusa_variant_id` from a store-core product response.
  - `mc_product.id` / storefront `product_id` is not accepted directly.

- `PUT /store/carts/:id/line-items/:line_id`
  - Updates line item quantity.

- `DELETE /store/carts/:id/line-items/:line_id`
  - Removes a line item by setting quantity to `0`.

- `POST /store/carts/:id/complete`
  - Ensures payment readiness, completes the cart, creates order/fulfillment metadata, and optionally pushes to S2BDIY.
  - Current frontend does not call this endpoint yet.

### Order Lookup And Tracking

- `GET /store/orders/lookup?email=...&display_id=...`
  - Finds one order by email plus display id/order number.

- `GET /store/orders/:id/tracking?email=...`
  - Returns fulfillment order and shipment data after store and email validation.
  - This is tracking-focused, not a full order detail endpoint.

## Storefront Source Structure

Tracked source files under `apps/storefront`:

- `package.json`
  - Vite React app.
  - Scripts: `dev`, `build`, `typecheck`, `preview`.

- `vite.config.ts`
  - Uses `@vitejs/plugin-react`.
  - Allows both `VITE_` and `NEXT_PUBLIC_` env prefixes.

- `index.html`
  - Vite HTML entry.

- `src/main.tsx`
  - React root entry.
  - Renders `App`.

- `src/App.tsx`
  - Main app composition, browser path dispatch, cart state, product loading, mock order pages.

- `src/lib/store-api.ts`
  - API client and backend response normalization.

- `src/lib/mock-data.ts`
  - Typed mock products, reviews, orders, cart/product types.

- `src/styles/app.css`
  - Global app styling.

Components:

- `src/components/layout/TopNav.tsx`
- `src/components/layout/StoreFooter.tsx`
- `src/components/store/StoreHero.tsx`
- `src/components/store/StoreHeader.tsx`
- `src/components/store/ProductGrid.tsx`
- `src/components/store/ReviewsPanel.tsx`
- `src/components/product/ProductDetailPage.tsx`
- `src/components/cart/CartPage.tsx`
- `src/components/checkout/CheckoutPage.tsx`
- `src/components/orders/OrderCard.tsx`
- `src/components/orders/OrderTimeline.tsx`
- `src/components/account/AccountSidebar.tsx`
- `src/components/modals/ShareModal.tsx`
- `src/components/modals/ConfirmReceiptModal.tsx`
- `src/components/ui/States.tsx`

## Runtime Entry And Routing

The app uses direct `window.location.pathname` checks in `App.tsx`; there is no React Router or file-based router.

Current routes:

- `/store`
  - Store home and product browsing.

- `/store?tab=category`
  - Category tab within store home.

- `/store?tab=reviews`
  - Reviews tab within store home.

- `/products/:productId`
  - Product detail page.

- `/cart`
  - Cart page.

- `/checkout`
  - Checkout UI preview.

- `/checkout/success`
  - Success/confirmation preview.

- `/account/orders`
  - Mock order list.

- `/account/orders/:orderId`
  - Mock order detail.

Not currently implemented:

- `/orders/lookup` even though `StoreFooter` links to it.
- Real order detail route backed by API.
- Real buyer account/auth routes.

## API Client Behavior

`src/lib/store-api.ts` reads environment in this order:

- Backend URL: `VITE_MEDUSA_BASE_URL`, then `NEXT_PUBLIC_MEDUSA_BACKEND_URL`, fallback `http://127.0.0.1:9000`.
- Publishable key: `VITE_PUBLISHABLE_API_KEY`, then `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`.
- Store id: `VITE_DEFAULT_STORE_ID`, then `NEXT_PUBLIC_STORE_ID`, fallback `default_store`.

It sends:

- `x-publishable-api-key`
- `X-Store-Id`
- `Content-Type: application/json` when a body exists.

It blocks placeholder publishable keys such as `pk_replace_me`, logs concise API diagnostics, and returns mock fallback data only for product list/detail. Cart methods throw on API failure.

Implemented client methods:

- `fetchStoreProducts()`
  - Calls `GET /store/products`.
  - Falls back to `mockProducts` if the backend fails or returns no products.

- `fetchStoreProduct(productId)`
  - Calls `GET /store/products/:id`.
  - Falls back to the matching mock product or first mock product.

- `createStoreCart(email?)`
  - Calls `POST /store/carts`.

- `fetchStoreCart(cartId)`
  - Calls `GET /store/carts/:id`.

- `addCartLineItem(cartId, variantId, quantity)`
  - Calls `POST /store/carts/:id/line-items`, then refreshes the cart.

- `updateCartLineItem(cartId, lineId, quantity)`
  - Calls `PUT /store/carts/:id/line-items/:line_id`.

- `deleteCartLineItem(cartId, lineId)`
  - Calls `DELETE /store/carts/:id/line-items/:line_id`.

Missing client methods for currently available backend APIs:

- `fetchStoreSettings()`
- `fetchProductCategories()`
- `fetchProductReviews(productId)`
- `createProductReview(productId, body)`
- `fetchProductShare(productId)`
- `completeCart(cartId, paymentProviderId?)`
- `lookupOrder(email, displayId)`
- `fetchOrderTracking(orderId, email)`

Missing client methods because backend APIs are also missing/incomplete:

- `updateCartAddress(cartId, address)`
- `listShippingOptions(cartId)` / select shipping option, if required.
- `listOrders(...)`
- `fetchOrderDetail(...)`

## Mock Data Usage

`src/lib/mock-data.ts` is still central to the app. It defines:

- `StoreProduct`, `StoreCart`, `CartLineItem`, `Review`, `Order`, and related types.
- Local `categories`.
- `mockProducts`.
- `reviews`.
- `orders`.

Current mock/static usage:

- Product list and product detail use mock fallback only when real product API fails or returns empty.
- Category tab uses local `categories`, not `GET /store/product-categories`.
- Reviews tab uses local `reviews`, not `GET /store/products/:id/reviews`.
- Store hero/header/footer use static content, not `GET /store/settings`.
- Account order list uses local `orders`.
- Account order detail uses local `orders`.
- Checkout address/payment form has no submit behavior and does not persist to backend.
- Success page is a preview and reads `cart_id`/`order_id` from the URL only.
- Share modal is static; it does not call `GET /store/products/:id/share`.
- Confirm receipt modal is UI-only.

## Page/API Connection Matrix

| Page | Route | Current data source | Real backend integration |
|---|---|---|---|
| Store home | `/store` | `GET /store/products` with mock fallback; static hero/header | Partial |
| Category browsing | `/store?tab=category` | Product list from API/fallback, category names from local mock | Partial |
| Reviews tab | `/store?tab=reviews` | Local `reviews` mock | No |
| Product detail | `/products/:id` | `GET /store/products/:id` with mock fallback | Partial |
| Add to cart | Product grid/detail actions | `POST /store/carts`, `POST /store/carts/:id/line-items` | Yes, when product has `is_cart_addable` and `medusa_variant_id` |
| Cart | `/cart` | `GET /store/carts/:id`, update/delete line item APIs | Yes |
| Checkout | `/checkout` | Current cart state plus local form inputs | UI only; no address/payment/order API submit |
| Success | `/checkout/success` | URL params only | No real completion |
| Order list | `/account/orders` | Local `orders` mock | No |
| Order detail | `/account/orders/:id` | Local `orders` mock | No |
| Share store/product | Modal | Static modal | No |
| Order tracking lookup | Footer link `/orders/lookup` | No route implemented | No |

## Buyer P0 Closed Loop Pages And Required Backend APIs

### 1. Product/Store Browsing

Needed APIs:

- `GET /store/settings`
- `GET /store/product-categories`
- `GET /store/products`

Current status:

- Backend APIs exist.
- Frontend uses `GET /store/products`.
- Frontend does not use `GET /store/settings` or `GET /store/product-categories`.
- Category filtering is local-string based and may not match backend category ids.

### 2. Product Detail

Needed APIs:

- `GET /store/products/:id`
- `GET /store/products/:id/reviews`
- `GET /store/products/:id/share`
- Cart create/add APIs.

Current status:

- Product detail uses `GET /store/products/:id`.
- Add-to-cart uses cart APIs through parent `App`.
- Product detail review tab is static text; it does not call reviews API.
- Share modal is static and not product-specific.
- Size/color selectors are visual-only; add-to-cart always sends the single `medusaVariantId` returned by store-core product.

### 3. Cart

Needed APIs:

- `POST /store/carts`
- `GET /store/carts/:id`
- `POST /store/carts/:id/line-items`
- `PUT /store/carts/:id/line-items/:line_id`
- `DELETE /store/carts/:id/line-items/:line_id`

Current status:

- Backend APIs exist.
- Frontend calls these APIs and stores `cart_id` in `localStorage` using `citigoo:{store_id}:cart_id`.
- Cart item normalization reads item metadata including `mc_product_id`, `mc_product_title`, `mockup_image_url`, color/size fields, and selected options when present.

### 4. Address Selection

Needed APIs:

- Store-aware cart address update endpoint.
- Optional saved address APIs if accounts are added.

Current status:

- Backend `GET /store/carts/:id` can return addresses.
- No custom store-aware address update route exists.
- Checkout form fields are uncontrolled UI inputs and are not submitted.
- This is a runtime readiness blocker for real S2BDIY order creation because supplier push reads the order shipping address.

### 5. Checkout

Needed APIs:

- `GET /store/carts/:id`
- Address update endpoint.
- Shipping option/default shipping handling, if required.
- Payment setup/selection, or direct use of `POST /store/carts/:id/complete` with `pp_system_default`.
- `POST /store/carts/:id/complete`

Current status:

- Backend complete-cart API exists.
- Frontend checkout does not call complete-cart.
- Checkout page explicitly says completion with `pp_system_default` is TODO.
- Success page is a preview and may receive `cart_id`, not a real `order_id`.

### 6. Create Order

Needed APIs:

- `POST /store/carts/:id/complete`
- Frontend-friendly order confirmation response.

Current status:

- Backend can complete cart and return `order`.
- Frontend does not call it.
- The current complete-cart response has `order_id`, `store_id`, `payment_provider_id`, `payment_status`, `fulfillment_status`, and `order`.
- For a smoother confirmation page, expose `display_id`, `order_number`, `email`, and `created_at` top-level or normalize them from `order`.

### 7. Order List

Needed APIs:

- Store-scoped order list endpoint.
- Buyer identity/session or Phase 1 email-based access strategy.
- Pagination and status filters.

Current status:

- Backend has no `GET /store/orders` list endpoint.
- Frontend uses local mock orders.
- `GET /store/orders/lookup` is not enough to power an order list.

### 8. Order Detail

Needed APIs:

- Full store-scoped order detail endpoint returning order header, items, totals, addresses, payment status, fulfillment status, fulfillment order, and shipments.
- `GET /store/orders/:id/tracking?email=...` can supplement tracking.
- `POST /store/products/:id/reviews` can support post-purchase reviews.

Current status:

- Backend has tracking endpoint but no full public order detail endpoint.
- Frontend order detail is mock.

## Existing Vs Missing Backend Interfaces

### Existing And Already Used By Storefront

- `GET /store/products`
- `GET /store/products/:id`
- `POST /store/carts`
- `GET /store/carts/:id`
- `POST /store/carts/:id/line-items`
- `PUT /store/carts/:id/line-items/:line_id`
- `DELETE /store/carts/:id/line-items/:line_id`

### Existing But Not Yet Used By Storefront

- `GET /store/settings`
- `GET /store/product-categories`
- `GET /store/products/:id/reviews`
- `POST /store/products/:id/reviews`
- `GET /store/products/:id/share`
- `GET /store/platform-products`
- `GET /store/supplier-products`
- `POST /store/carts/:id/complete`
- `GET /store/orders/lookup`
- `GET /store/orders/:id/tracking`

### Missing Or Incomplete For Buyer P0

- Store-aware cart address update.
- Shipping option/rate/default shipping path, if required for Medusa cart completion.
- Frontend-ready complete-cart response fields, unless normalized from nested `order`.
- Store-scoped order list.
- Full store-scoped order detail.
- Buyer access model for order list/detail.
- Product category/search/sort/pagination query contract for `GET /store/products`.

## Runtime Readiness Recommendations

1. Run the frontend typecheck/build with the current tracked source.
   - `npm --workspace apps/storefront run typecheck`
   - `npm --workspace apps/storefront run build`

2. Verify env naming in local setup.
   - `.env.example` supports both Vite and `NEXT_PUBLIC_`, but Vite reads env from `.env`, `.env.local`, etc.
   - Ensure `apps/storefront/.env.local` has a real `VITE_PUBLISHABLE_API_KEY` or `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`.

3. Verify CORS between Vite and Medusa.
   - Storefront runs on `http://127.0.0.1:5174`.
   - Backend must allow that origin for store requests.

4. Seed/publish at least one cart-ready product.
   - Product must be `published`.
   - Product must include `medusa_variant_id`.
   - Product response must return `is_cart_addable: true`.

5. Smoke test the current real path manually.
   - Open `/store`.
   - Confirm product list source says "Loaded from Medusa Store API".
   - Open `/products/:id`.
   - Add to cart.
   - Open `/cart`.
   - Update quantity and remove item.

6. Treat checkout as not production-ready yet.
   - `/checkout` currently validates UI flow only.
   - Do not consider P0 order creation complete until address submit and complete-cart are wired.

## Backend/API Alignment Recommendations

1. Add frontend clients for existing read APIs first.
   - Store settings should drive brand name/logo/support/SEO.
   - Product categories should replace local `categories`.
   - Product reviews should replace `ReviewsPanel` mock data.
   - Product share endpoint should replace static `ShareModal`.

2. Add store-aware cart address update API.
   - This is the most important backend gap before real checkout.
   - Keep store isolation checks aligned with existing cart APIs.

3. Wire `POST /store/carts/:id/complete` after address update.
   - Use `pp_system_default` for Phase 1 if that remains the intended mock/default provider.
   - Clear or rotate `localStorage` cart id after successful completion.
   - Normalize confirmation data into `/checkout/success?order_id=...`.

4. Improve complete-cart response shape.
   - Add top-level `display_id`, `order_number`, `email`, and `created_at`, or document that the frontend should read them from nested `order`.

5. Add order detail before order list.
   - Order confirmation and account detail can share the same detail payload.
   - Include items, totals, addresses, payment status, fulfillment status, fulfillment order, and shipments.

6. Add order list after deciding buyer access.
   - Current email/display-id lookup is useful for guest tracking but does not support an account order list.
   - Avoid exposing cross-store or cross-buyer order data.

7. Keep product variant behavior explicit.
   - Current frontend visual size/color selectors do not map to backend variants.
   - Either hide variant selectors until real variant/options data exists, or add a product variant/options contract.

## Recommended Next Implementation Order

1. Runtime verification: typecheck/build frontend and smoke test product/cart against local Medusa.

2. Replace static store shell data with existing APIs:
   - `GET /store/settings`
   - `GET /store/product-categories`
   - `GET /store/products/:id/share`

3. Replace review mock path:
   - Wire `GET /store/products/:id/reviews`.
   - Add review submission only after order detail/purchase verification UX is ready.

4. Implement cart address update backend and frontend submit.

5. Wire checkout completion:
   - Call `POST /store/carts/:id/complete`.
   - Route to success with real `order_id`/display id.

6. Add order detail API and replace mock `/account/orders/:id`.

7. Add order list API and replace mock `/account/orders`.

8. Revisit variant/options UX so selected color/size corresponds to real cart line item inputs.

## Files Changed

- Updated `docs/buyer-frontend-current-state.md`.

## Tests Or Checks Run

- `git status --short --branch`
- `git ls-files apps/storefront`
- `find apps/storefront -maxdepth 4 -type f`
- Read current `apps/storefront` source files, including `App.tsx`, `store-api.ts`, `mock-data.ts`, page components, layout components, and README.

No runtime tests were run because this task requested documentation only and no business code changes.

## Runtime Code Changes

None.

## Known Limitations And Caveats

- This document focuses on project-owned/custom store routes under `apps/medusa-backend/src/api/store` and current storefront usage.
- Medusa built-in store endpoints may exist, but they are not currently wrapped or documented as the buyer P0 contract here.
- Domain binding remains reserved in Phase 1 and is not assumed for runtime store resolution.
