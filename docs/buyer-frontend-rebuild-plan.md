# Buyer Frontend Rebuild Plan

Date: 2026-06-15

Inputs:

- `docs/buyer-design-inventory.md`
- `docs/buyer-page-api-map.md`

Core principles:

- The PNG files under `designs/buyer-ui/` are the UI standard.
- Existing `apps/storefront` is only a code/API-client reference.
- Do not preserve old components when they conflict with the PNG layout, hierarchy, spacing, or colors.
- Reuse API client patterns, cart localStorage behavior, and response normalization where helpful.
- Rebuild P0 transaction-loop pages first.
- Implement only 1-2 pages per batch.

## Route Plan

### P0 Routes

- `/store`
  - Design source: `designs/buyer-ui/shop page/shop page*.png`
  - Purpose: store home, category navigation, product browsing.

- `/products/:product_id`
  - Design source: `designs/buyer-ui/单店/*.png`
  - Purpose: product detail, reviews, share, add to cart.

- `/cart`
  - Design source: `designs/buyer-ui/购物车详情/*.png`
  - Purpose: cart lines, quantity, remove, order summary.

- `/checkout`
  - Design source: `designs/buyer-ui/结算/*.png`
  - Purpose: checkout form, address, payment/default provider, place order.
  - Backend note: cannot be fully functional until cart address update is added.

- `/checkout/address`
  - Design source: `designs/buyer-ui/Delivery address/*.png`
  - Purpose: delivery address form/selection used by checkout.
  - Backend note: backend-first for real checkout.

- `/checkout/success`
  - Design source: `designs/buyer-ui/结算/Group 71.png`
  - Purpose: post-complete order success/status.

- `/account/orders`
  - Design source: `designs/buyer-ui/订单/Body*.png`
  - Purpose: order list.
  - Backend note: use mock temporary until order list API exists.

- `/account/orders/:order_id`
  - Design source: `designs/buyer-ui/订单/订单详情页*.png`, `designs/buyer-ui/订单详情页面/*.png`
  - Purpose: full order detail.
  - Backend note: use mock temporary plus tracking until full detail API exists.

- `/account/orders/:order_id/tracking`
  - Design source: `designs/buyer-ui/订单/物流追踪页.png`
  - Purpose: logistics tracking.
  - Backend note: existing tracking API can power the core status.

### P1 Routes

- `/auth/login`
- `/auth/register`
- `/auth/verify`
- `/auth/forgot-password`
- `/auth/reset-password`
- `/account/profile`
- `/account/profile/edit`
- `/account/following`
- `/account/coupons`

These should be mocked until buyer auth/profile/follow/coupon APIs are explicitly scoped.

### P2 Routes

- `/store/about` or `/store?tab=about`
- `/settings`
- `/settings/country-region`
- `/settings/currency`
- `/settings/language`
- `/help`
- `/about`
- `/account/security`
- `/account/notifications`

These can be implemented UI-first with static content unless product scope changes.

## Component Split

Use a new component tree oriented around the PNG designs, not the old component names.

Suggested structure:

```text
apps/storefront/src/
  app/
    BuyerApp.tsx
    routes.ts
  lib/
    buyer-api.ts
    cart-storage.ts
    money.ts
    normalize.ts
  pages/
    store/
      StoreHomePage.tsx
      StoreAboutPage.tsx
    product/
      ProductDetailPage.tsx
    cart/
      CartPage.tsx
    checkout/
      CheckoutPage.tsx
      CheckoutAddressPage.tsx
      CheckoutSuccessPage.tsx
    orders/
      OrderListPage.tsx
      OrderDetailPage.tsx
      OrderTrackingPage.tsx
  components/
    buyer-layout/
      BuyerTopBar.tsx
      BuyerFooter.tsx
      StoreShell.tsx
    store/
      StoreHero.tsx
      StoreTabs.tsx
      CategoryRail.tsx
      ProductCard.tsx
      ProductGrid.tsx
    product/
      ProductMediaGallery.tsx
      ProductPurchasePanel.tsx
      ProductReviewSection.tsx
      ProductShareSheet.tsx
    cart/
      CartLine.tsx
      CartSummary.tsx
      QuantityStepper.tsx
    checkout/
      CheckoutContactForm.tsx
      CheckoutAddressForm.tsx
      CheckoutPaymentPanel.tsx
      CheckoutSummary.tsx
    orders/
      OrderTabs.tsx
      OrderCard.tsx
      OrderStatusBadge.tsx
      OrderTimeline.tsx
    primitives/
      Button.tsx
      Modal.tsx
      Tabs.tsx
      EmptyState.tsx
      LoadingState.tsx
      ErrorState.tsx
```

Guidelines:

- Page components own data loading and route-level state.
- Design sections become local page components first; only extract shared components after two real uses.
- Shared primitives should be visually neutral and tiny. Avoid forcing all pages into old card/button styles.
- Product option selectors can be visual-only until backend exposes real variant/options contract.

## Style Organization

Recommended CSS layout:

```text
apps/storefront/src/styles/
  reset.css
  tokens.css
  buyer-layout.css
  store.css
  product.css
  cart.css
  checkout.css
  orders.css
  states.css
```

Style rules:

- Derive spacing, color, typography, border, shadow, and component density from PNGs.
- Prefer page-scoped CSS classes over broad reusable component styling during the first rebuild pass.
- Keep responsive constraints explicit: max widths, grid tracks, stable media aspect ratios, and fixed toolbar/button dimensions.
- Do not reuse old `.store-shell`, `.product-card`, or other classes if their visual behavior does not match the PNGs.
- Keep design tokens small at first:
  - `--buyer-bg`
  - `--buyer-surface`
  - `--buyer-text`
  - `--buyer-muted`
  - `--buyer-border`
  - `--buyer-accent`
  - spacing scale
  - radius scale

## Old Files To Keep

Keep as reference or reusable logic:

- `apps/storefront/package.json`
- `apps/storefront/vite.config.ts`
- `apps/storefront/src/main.tsx`
- `apps/storefront/src/vite-env.d.ts`
- `apps/storefront/src/lib/store-api.ts`
  - Keep or migrate into `src/lib/buyer-api.ts`.
  - Reuse env resolution, request headers, placeholder-key validation, error normalization, response normalization.

- Cart localStorage behavior from `App.tsx` / `store-api.ts`
  - Preserve per-store cart key pattern, e.g. `citigoo:{store_id}:cart_id`.

- Useful normalization logic:
  - product normalization
  - cart normalization
  - line-item metadata fallback
  - money formatting

- `apps/storefront/src/lib/mock-data.ts`
  - Keep temporarily for order list/detail, auth/account placeholders, and visual states.
  - Do not let mock data shape dictate final backend contract.

## Old Components To Deprecate Or Rewrite

Rewrite rather than preserve:

- `src/App.tsx`
  - Current path-switching can be replaced with a clearer route table or minimal router layer.

- `components/layout/TopNav.tsx`
- `components/layout/StoreFooter.tsx`
- `components/store/StoreHero.tsx`
- `components/store/StoreHeader.tsx`
- `components/store/ProductGrid.tsx`
- `components/store/ReviewsPanel.tsx`
- `components/product/ProductDetailPage.tsx`
- `components/cart/CartPage.tsx`
- `components/checkout/CheckoutPage.tsx`
- `components/orders/OrderCard.tsx`
- `components/orders/OrderTimeline.tsx`
- `components/account/AccountSidebar.tsx`
- `components/modals/ShareModal.tsx`
- `components/modals/ConfirmReceiptModal.tsx`

Reason:

- These components were built for the prototype UI, not the PNG design system.
- Reusing them risks preserving old spacing, hierarchy, and layout assumptions.

Can adapt selectively:

- `components/ui/States.tsx`
  - Loading/error/empty behavior is useful, but visual styling should be rewritten to match the PNGs.

## Batch Plan

Each batch should implement at most 1-2 pages and leave the app shippable.

### Batch 0: Rebuild Foundation

Pages:

- No user-facing page required, or a temporary route shell only.

Tasks:

- Create new route map.
- Create `buyer-api.ts` by migrating useful logic from `store-api.ts`.
- Create cart storage helper.
- Create new CSS token/reset/layout files.
- Preserve old app until the first new page is ready, or switch routes one by one.

Acceptance:

- `npm --workspace apps/storefront run typecheck` passes.
- `npm --workspace apps/storefront run build` passes.
- Existing API calls still include `x-publishable-api-key` and `X-Store-Id`.
- No visual acceptance required except route shell does not break.

### Batch 1: Store Home

Pages:

- `/store`

Designs:

- `designs/buyer-ui/shop page/shop page.png`
- Use `shop page-1.png`, `shop page-2.png`, `shop page-3.png` as state variants after visual inspection.

APIs:

- `fetchStoreSettings()`
- `fetchProductCategories()`
- `fetchProducts()`

Acceptance:

- Layout, header/store identity, category area, product grid, and main spacing match PNG at desktop width.
- Product cards render from real API when backend is configured.
- Empty/error/loading states exist and do not distort the PNG layout.
- Category UI can filter locally by `category_ids` if backend filtering is absent.

### Batch 2: Product Detail

Pages:

- `/products/:product_id`

Designs:

- `designs/buyer-ui/单店/57.png` through `66.png`

APIs:

- `fetchProductDetail()`
- `fetchProductReviews()`
- `fetchProductShare()`
- `createCart()`
- `addCartLineItem()`

Acceptance:

- Product media/gallery, purchase panel, product info, reviews/share sections follow PNG hierarchy.
- Add-to-cart uses `medusa_variant_id`; button disabled when `is_cart_addable` is false.
- Visual option selectors do not pretend to change backend variant unless contract exists.
- Share UI consumes share API or gracefully falls back to product URL.

### Batch 3: Cart

Pages:

- `/cart`

Designs:

- `designs/buyer-ui/购物车详情/Group 96.png`
- `Group 97.png`
- `Group 98.png`
- `Group 99.png`
- `100.png`

APIs:

- `createCart()`
- `fetchCart()`
- `updateCartLineItem()`
- `deleteCartLineItem()`

Acceptance:

- Cart line layout, quantity controls, item metadata, totals, and checkout CTA match PNG.
- Quantity update and delete work against backend.
- Empty cart state matches the closest design state or a minimal design-consistent fallback.
- Cart id persists per store id.

### Batch 4: Checkout Address + Checkout Shell

Pages:

- `/checkout/address`
- `/checkout`

Designs:

- `designs/buyer-ui/Delivery address/*.png`
- `designs/buyer-ui/结算/Group 65.png` through `Group 70.png`

APIs:

- `fetchCart()`
- `updateCartAddress()` once backend exists
- shipping option client only if backend adds it

Acceptance:

- UI matches PNG form layout and checkout summary.
- Before backend exists, page is clearly marked internally as blocked for real completion.
- Once backend exists, address submit updates cart and persists returned address.
- Checkout cannot call complete-cart without required address data.

Backend dependency:

- This batch is `backend_first` for real checkout behavior.

### Batch 5: Checkout Complete + Success

Pages:

- `/checkout/success`

Designs:

- `designs/buyer-ui/结算/Group 71.png`

APIs:

- `completeCart()`
- `lookupOrder()`
- `fetchOrderDetail()` when available

Acceptance:

- Place order calls `POST /store/carts/:cart_id/complete`.
- Success page displays order id/display id, payment status, and fulfillment status.
- Completed cart id is cleared from localStorage.
- Failure state is design-consistent and does not lose cart context.

Backend dependency:

- Needs address update first for real P0 checkout.
- Full order detail can come later if success page only needs completion response.

### Batch 6: Order Tracking

Pages:

- `/account/orders/:order_id/tracking`

Designs:

- `designs/buyer-ui/订单/物流追踪页.png`

APIs:

- `fetchOrderTracking()`
- `lookupOrder()` if entering from guest lookup

Acceptance:

- Tracking timeline/status follows PNG.
- API-driven shipment data renders when available.
- Missing shipment data has a design-consistent pending state.

### Batch 7: Order Detail

Pages:

- `/account/orders/:order_id`

Designs:

- `designs/buyer-ui/订单/订单详情页.png`
- `designs/buyer-ui/订单/订单详情页-1.png`
- `designs/buyer-ui/订单详情页面/Group 83.png` through `Group 86.png`

APIs:

- `fetchOrderDetail()` when backend exists
- `fetchOrderTracking()` for partial status

Acceptance:

- UI can be implemented with mock temporary data first.
- Real completion requires full order detail API.
- Tracking panel should use real tracking API even while item/totals are mocked.

Backend dependency:

- Full production behavior is `backend_first` because order detail API is missing.

### Batch 8: Order List

Pages:

- `/account/orders`

Designs:

- `designs/buyer-ui/订单/Body.png` through `Body-13.png`

APIs:

- `fetchOrders()` when backend exists

Acceptance:

- Tabs/status filters and list states match PNG.
- Mock data may be used temporarily.
- Production behavior requires order list API and buyer access model.

Backend dependency:

- `backend_first` for real account order list.

### Later P1/P2 Batches

Implement only after P0 is stable or explicitly prioritized:

- Auth: `登录注册/*.png`
- Profile: `Profile/*.png`
- Follow: `Follow/*.png`
- Coupons: `coupons/*.png`
- Account security: `Account & Security/*.png`
- Country/currency/language/help/about/settings/notifications

Acceptance:

- Can be UI-first with static/mock data.
- Do not introduce fake persistence without a backend contract.

## Visual Comparison Checks

For each batch:

1. Identify exact PNG files used as source.
2. Open the PNG beside the running page.
3. Test at the PNG's main desktop width first, commonly around `1280px`.
4. Capture browser screenshots with the Browser plugin or Playwright.
5. Compare:
   - page width and content max-width
   - header height and alignment
   - section order
   - typography scale and weight
   - colors and contrast
   - spacing between major blocks
   - product/card/media aspect ratios
   - button sizing and states
   - modal overlay opacity and panel placement
6. Check mobile/tablet only after desktop fidelity is acceptable, unless a PNG is clearly mobile-specific.
7. Record known deviations in the PR or batch notes.

Do not pass a page if:

- Text overlaps or clips.
- Buttons resize awkwardly across states.
- Product images shift layout when loading.
- Old prototype visual patterns are still obvious.
- The page only resembles the old storefront, not the PNG.

## API Integration Checks

For each API-backed batch:

1. Confirm `.env.local`:

```text
VITE_MEDUSA_BASE_URL=http://127.0.0.1:9000
VITE_PUBLISHABLE_API_KEY=<real key>
VITE_DEFAULT_STORE_ID=default_store
```

2. Confirm backend CORS includes:

```text
http://127.0.0.1:5174,http://localhost:5174
```

3. Verify route manually with curl or browser devtools:
   - `GET /store/settings`
   - `GET /store/product-categories`
   - `GET /store/products`
   - `GET /store/products/:product_id`
   - cart APIs as needed

4. Check frontend network requests:
   - correct base URL
   - `x-publishable-api-key`
   - `X-Store-Id`
   - JSON body shape
   - normalized errors

5. For cart flow:
   - create cart
   - add line item with `medusa_variant_id`
   - refresh cart
   - update quantity
   - delete item
   - keep cart id scoped by store id

6. For checkout:
   - do not call complete-cart until address requirements are met.
   - after backend address update exists, verify address appears on fetched cart before completion.

7. For order/tracking:
   - use `email` where required by lookup/tracking APIs.
   - treat full order detail and list as mocked until backend endpoints are added.

## Quality Gates Per Batch

Every batch should finish with:

- Typecheck passing.
- Build passing.
- Browser smoke test for changed routes.
- Screenshot or visual inspection notes against exact PNG filenames.
- API calls verified or mock status explicitly documented.
- No unrelated product/cart/order/backend changes.
- No broad refactor outside the 1-2 pages in scope.

## First Batch Recommendation

Start with Batch 0 and Batch 1 only:

1. Rebuild foundation/API client wrapper.
2. Implement `/store` from `shop page/shop page.png`.

Reason:

- It establishes the new visual system.
- It uses existing ready APIs.
- It does not depend on missing checkout/order backend endpoints.
- It gives a clean base before product detail and cart work.
