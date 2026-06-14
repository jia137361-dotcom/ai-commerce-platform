# Buyer Frontend Current State

Date: 2026-06-15

Branch inspected: `feature/buyer-frontend-integration`

## Summary

The current branch contains the Medusa backend, but `apps/storefront` is not actually present as tracked source code. The directory exists locally with only `.env.local` and `node_modules/.vite` cache files. `git ls-files apps/storefront` returns no tracked files.

The source storefront prototype exists on `feature/frontend-demo` under `apps/storefront`. That prototype is a Vite React app with a mostly mock buyer experience. It fetches `GET /store/products` from the backend when possible, then falls back to typed mock products. Orders, reviews UI, account pages, product cards, sharing modal, and receipt confirmation modal are mock/UI-only in that prototype.

Also note: `docs/suppliers/s2bdiy-eolink-api-snapshot.md` is present on `feature/frontend-demo`, but is not present as a tracked file on the current branch at the time of this inspection.

## Store API Endpoints Currently Available

All store-aware custom APIs resolve store context from `X-Store-Id`, then localhost/default fallback via `DEFAULT_STORE_ID` (`default_store` by default). Storefront requests that use Medusa store routes should include `x-publishable-api-key`.

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
  - Product response includes `medusa_product_id`, `medusa_variant_id`, `is_cart_addable`, `average_rating`, and `review_count`.

- `GET /store/products/:id`
  - Returns a single published product scoped to the resolved store.

- `GET /store/products/:id/reviews`
  - Returns published reviews and rating summary for a published product in the resolved store.

- `POST /store/products/:id/reviews`
  - Creates a published review after validating email/order display id and purchase history for that product/store.

- `GET /store/products/:id/share`
  - Returns product URL, share text, and channel-specific share links.

### Platform And Supplier Catalog

- `GET /store/platform-products`
  - Lists active platform products. These are global base products, not store-scoped.

- `GET /store/supplier-products`
  - Lists active supplier products, variants, print specs, and platform design templates.
  - Optional query: `platform_product_id`.

### Cart And Checkout

- `POST /store/carts`
  - Creates a cart bound to the resolved store through `cart.metadata.store_id`.
  - Request body supports `customer_email`, `currency_code`, and `region_id`.

- `GET /store/carts/:id`
  - Retrieves a cart with items and addresses after verifying the cart belongs to the resolved store.

- `POST /store/carts/:id/line-items`
  - Adds a line item by native Medusa `variant_id`.
  - The backend reverse-checks the variant against a published store-core product in the cart store.
  - `mc_product.id` or `product_id` is not accepted directly as add-to-cart input.

- `PUT /store/carts/:id/line-items/:line_id`
  - Updates line item quantity after cart/store and line ownership checks.

- `DELETE /store/carts/:id/line-items/:line_id`
  - Removes a line item by setting quantity to `0`.

- `POST /store/carts/:id/complete`
  - Ensures a payment collection/session exists, completes the cart, creates/syncs fulfillment metadata, and optionally pushes to S2BDIY when configured.
  - Current response includes `order_id`, `store_id`, `payment_provider_id`, `payment_status`, `fulfillment_status`, and `order`.
  - It does not currently expose `display_id`, `order_number`, `email`, or `created_at` as top-level fields on this branch.

### Order Lookup And Tracking

- `GET /store/orders/lookup?email=...&display_id=...`
  - Finds an order by email plus display id/order number, then filters by current store.
  - Returns summary fields only.

- `GET /store/orders/:id/tracking?email=...`
  - Retrieves fulfillment order and shipment data after store and email validation.
  - This is tracking/status focused, not a complete order detail endpoint.

## Storefront Current API Connection State

### Current Branch

`apps/storefront` is not currently a usable tracked app on `feature/buyer-frontend-integration`.

Observed local contents:

- `.env.local`
- `node_modules/.vite`

There is no tracked `package.json`, `src`, `index.html`, route file, component file, or API client under `apps/storefront` on this branch. Therefore the current branch cannot be classified as either fully mock-data or fully real-API connected; it is missing the storefront source.

### Prototype On `feature/frontend-demo`

The `feature/frontend-demo` version is hybrid:

- Product listing calls `GET /store/products` through `src/lib/store-api.ts`.
- It sends `x-publishable-api-key` and `X-Store-Id`.
- If the backend is offline, the key is missing, or the API returns no products, it falls back to `mockProducts`.
- Store categories are local constants, not from `GET /store/product-categories`.
- Store settings/header/hero are mock/static, not from `GET /store/settings`.
- Product detail, cart, address selection, checkout, create order, order list, and order detail are not connected to backend APIs.
- Order list/detail use `orders` from `src/lib/mock-data.ts`.
- Reviews panel uses `reviews` from `src/lib/mock-data.ts`, not product review APIs.
- Share modal is static/UI-only, not wired to `GET /store/products/:id/share`.

## Prototype Storefront Structure From `feature/frontend-demo`

Because current branch lacks tracked storefront source, this section describes the prototype that exists on `feature/frontend-demo`.

### App And Routing Structure

The app is a single Vite React entry with path inspection in `App.tsx`; it does not use React Router or a file-based router.

- `/store`
  - Main store home/product browsing page.

- `/store?tab=category`
  - Category view within the same page.

- `/store?tab=reviews`
  - Reviews view within the same page.

- `/account/orders`
  - Mock account order list.

- `/account/orders/:orderId`
  - Mock order details.

There are no prototype routes for:

- `/products/:id`
- `/cart`
- `/checkout`
- `/checkout/address`
- `/checkout/payment`
- `/orders`
- A real authenticated account area.

### Component Structure

Layout:

- `components/layout/TopNav.tsx`

Store:

- `components/store/StoreHero.tsx`
- `components/store/StoreHeader.tsx`
- `components/store/ProductGrid.tsx`
- `components/store/ReviewsPanel.tsx`

Orders:

- `components/orders/OrderCard.tsx`
- `components/orders/OrderTimeline.tsx`

Account:

- `components/account/AccountSidebar.tsx`

Modals:

- `components/modals/ShareModal.tsx`
- `components/modals/ConfirmReceiptModal.tsx`

Data/API:

- `lib/mock-data.ts`
- `lib/store-api.ts`

### Page Structure

`StorePage`:

- Top navigation.
- Static hero.
- Store header tabs.
- Product grid, category view, or reviews panel based on query tab.
- Static share modal.

`CategoryView`:

- Local category sidebar.
- Product grid filtered by local category strings.
- Static "Load More Products" button.

`OrdersPage`:

- Account sidebar.
- Local tabs: All, Processing, Shipped, Delivered, Reviews, Returns.
- Local search over mock orders.
- `OrderCard` list.

`OrderDetailsPage`:

- Back link.
- Order timeline.
- Shipping status card.
- Delivery address.
- Latest milestone.
- Package contents.
- Payment details.
- Order information.
- Static quick actions.
- Confirm receipt modal.
- Share modal.

## Buyer P0 Closed Loop Pages And Required Backend APIs

### 1. Product/Store Browsing

Needed frontend page:

- Store home / product list.
- Category browsing/filtering.
- Store header/settings.

Needed APIs:

- `GET /store/settings`
- `GET /store/product-categories`
- `GET /store/products`
- Optional: product search/sort/pagination filters on `GET /store/products`.

Current backend status:

- Basic settings/categories/products APIs exist.
- `GET /store/products` currently lists all published products for the store, ordered newest first.
- No explicit search/filter/sort/pagination contract is visible in the custom route.

### 2. Product Detail

Needed frontend page:

- Product media, title, description, price, variants/options if applicable, reviews summary, add-to-cart action, share action.

Needed APIs:

- `GET /store/products/:id`
- `GET /store/products/:id/reviews`
- `GET /store/products/:id/share`
- `POST /store/carts`
- `POST /store/carts/:id/line-items`

Current backend status:

- Product detail, reviews, share, cart create, and add-line-item APIs exist.
- Add-to-cart requires `medusa_variant_id` from the product response and only works when `is_cart_addable: true`.
- There is no product detail page in the current branch; the prototype also lacks a product detail route.

### 3. Cart

Needed frontend page:

- Cart item list, quantity controls, remove item, subtotal/total preview, checkout entry.

Needed APIs:

- `POST /store/carts`
- `GET /store/carts/:id`
- `POST /store/carts/:id/line-items`
- `PUT /store/carts/:id/line-items/:line_id`
- `DELETE /store/carts/:id/line-items/:line_id`

Current backend status:

- Required basic cart APIs exist.
- Current prototype has no cart page and no cart API client.
- Cart totals, shipping methods, taxes, discounts, and payment readiness are mostly delegated to Medusa internals, but there is no dedicated buyer-facing route documented for shipping option selection or cart address update.

### 4. Address Selection

Needed frontend page:

- Shipping address form/selection.
- Billing address handling if needed.
- Possibly shipping method/rate selection.

Needed APIs:

- A route to update cart shipping address and billing address.
- A route to list/select shipping options if shipping rates are required before checkout.
- Optional: saved customer addresses if buyer accounts are introduced.

Current backend status:

- `GET /store/carts/:id` retrieves `shipping_address` and `billing_address`.
- No custom `PUT/PATCH /store/carts/:id` or address-specific store route exists in `apps/medusa-backend/src/api/store`.
- Medusa may have built-in store cart update APIs, but this project has not wrapped/documented a store-aware address update endpoint.
- S2BDIY order push reads `order.shipping_address`, so address capture is a real P0 requirement before production order creation.

### 5. Checkout

Needed frontend page:

- Review cart, shipping address, shipping method if applicable, payment method, place order.

Needed APIs:

- `GET /store/carts/:id`
- Address update endpoint.
- Shipping option selection endpoint if required.
- Payment session/provider setup endpoint, or current `POST /store/carts/:id/complete` if using the default/mock provider.
- `POST /store/carts/:id/complete`

Current backend status:

- `POST /store/carts/:id/complete` exists and calls `ensureCartPaymentReady`.
- It defaults to `pp_system_default` when no `payment_provider_id` is provided.
- There is no custom buyer API for explicit payment method/session selection beyond passing `payment_provider_id` to complete.
- No storefront checkout page exists.

### 6. Create Order

Needed frontend page/action:

- Submit checkout and show order confirmation.

Needed APIs:

- `POST /store/carts/:id/complete`
- Order confirmation/detail fetch after completion.

Current backend status:

- Complete-cart route creates the order and fulfillment metadata.
- Current top-level response lacks `display_id`, `order_number`, `email`, and `created_at`; the full `order` object is returned, but frontend-friendly confirmation fields are easier if exposed top-level.
- No current frontend create-order integration exists.

### 7. Order List

Needed frontend page:

- Buyer order list with status tabs/search.

Needed APIs:

- A store-scoped order list endpoint.
- Authentication/session or an email/order lookup model.
- Minimal filter support by status and pagination.

Current backend status:

- No `GET /store/orders` list endpoint exists.
- `GET /store/orders/lookup` can find one order by email and display id/order number, but it is not an order list.
- Prototype order list is fully mock data.

### 8. Order Detail

Needed frontend page:

- Full order summary, items, totals, shipping address, payment status, fulfillment status, shipments/tracking, support/review actions.

Needed APIs:

- A full `GET /store/orders/:id?email=...` detail endpoint, or equivalent authenticated endpoint.
- `GET /store/orders/:id/tracking?email=...` for tracking/fulfillment events.
- Optional review creation through `POST /store/products/:id/reviews`.

Current backend status:

- `GET /store/orders/:id/tracking` exists but returns tracking-focused data only.
- There is no full public order detail endpoint returning order items, totals, addresses, payment, and shipment data in one frontend-ready payload.
- Prototype order detail is fully mock data.

## Existing Vs Missing Backend Interfaces

### Existing

- Store context resolution.
- Store settings read.
- Product category list.
- Product list/detail.
- Product review list/create.
- Product share links.
- Platform product list.
- Supplier product list.
- Cart create.
- Cart retrieve.
- Cart add line item by native Medusa variant.
- Cart line item quantity update/remove.
- Cart complete/create order.
- Order lookup by email and display id/order number.
- Order tracking by order id and email.

### Missing Or Incomplete For Buyer P0

- Tracked storefront source on the current branch.
- Product list query contract for category/search/sort/pagination.
- Product detail route/page in the frontend.
- Cart page and cart client in the frontend.
- Custom store-aware address update endpoint for carts.
- Shipping option/rate selection endpoint if required by checkout.
- Frontend-friendly payment setup/selection flow beyond complete-cart default provider.
- Store-scoped order list endpoint.
- Full store-scoped order detail endpoint.
- Buyer identity/session model for order list/detail. Current lookup/tracking endpoints use email plus order number/id checks.
- Top-level order confirmation fields from `POST /store/carts/:id/complete` (`display_id`, `order_number`, `email`, `created_at`) are missing on the current branch but exist as a small frontend-demo diff.

## Should We Migrate Cart Backend Changes From `feature/frontend-demo`?

Partially, yes, but not as a blind merge.

`feature/frontend-demo` includes backend cart/product-bridge changes in addition to the storefront prototype:

- Adds optional `sales_channel_id` to `POST /store/carts`.
- Updates `create-cart` workflow to resolve or create a default sales channel and set `sales_channel_id` on new carts.
- Adds top-level `display_id`, `order_number`, `email`, and `created_at` to `POST /store/carts/:id/complete` response.
- Adds `product-cart-bridge.ts` helpers and a more aggressive admin publish bridge that can create a native Medusa product/variant for a store-core product when missing.
- Extends line item production metadata with `mc_product_title`, `store_id`, and `mockup_image_url`.

Recommended migration decision:

- Migrate the small cart response improvements: top-level `display_id`, `order_number`, `email`, and `created_at` help checkout confirmation and order lookup.
- Consider migrating `sales_channel_id` support after testing against local seeded Medusa regions/sales channels. This may be necessary if cart completion or product availability depends on a sales channel.
- Treat the admin publish native bridge changes as a separate backend PR, not part of buyer frontend wiring. They change publish behavior substantially and create native Medusa catalog records; this is more than a frontend integration concern.
- Review line-item metadata additions together with S2BDIY fulfillment requirements. They are useful for buyer order UI and fulfillment traceability, but should be tested with existing `line-item-production-metadata` and fulfillment sync tests.

## Recommended Next Implementation Order

1. Restore or re-migrate `apps/storefront` source onto `feature/buyer-frontend-integration`.
   - Current branch cannot run a storefront from tracked source.

2. Wire catalog browsing first.
   - Connect store settings, categories, products, product detail, reviews, and share links.
   - Add a `/products/:id` page.

3. Add cart state and cart page.
   - Use `medusa_variant_id` from product responses.
   - Persist `cart_id` in browser storage.
   - Implement add, retrieve, update quantity, and remove flows.

4. Implement address and checkout backend gap.
   - Add a store-aware cart address update route.
   - Decide whether shipping options are needed in P0 or can be defaulted.
   - Keep S2BDIY shipping address requirements visible in tests.

5. Implement checkout completion and confirmation.
   - Use `POST /store/carts/:id/complete`.
   - Migrate top-level order confirmation fields from `feature/frontend-demo`.

6. Add order detail API before order list API.
   - A detail endpoint can power confirmation and account detail pages.
   - Include items, totals, addresses, payment status, fulfillment status, fulfillment order, and shipments.

7. Add order list API.
   - Decide whether Phase 1 uses email lookup, customer auth, or a temporary local session model.
   - Add pagination/status filters.

8. Replace remaining mock UI data.
   - Orders, reviews panel, share modal, address data, and account/order actions should move from `mock-data.ts` to API clients as endpoints become available.

## Files Changed

- Added `docs/buyer-frontend-current-state.md`.

## Tests Or Checks Run

- `git status --short --branch`
- `git ls-files apps/storefront`
- `find apps/medusa-backend/src/api/store -maxdepth 6 -type f -name route.ts`
- `git ls-tree -r --name-only feature/frontend-demo apps/storefront`
- `git diff develop..feature/frontend-demo` for storefront and cart backend changes

No runtime tests were run because this task requested documentation only and no business code changes.

## Runtime Code Changes

None.

## Known Limitations And Caveats

- This document reports the current branch as inspected. It also references `feature/frontend-demo` because the requested storefront prototype is not present as tracked source on the current branch.
- Medusa built-in store endpoints may exist outside `apps/medusa-backend/src/api/store`, but this document focuses on project-owned/custom routes and currently documented behavior.
- Domain binding remains reserved in Phase 1 and is not assumed for store resolution.
