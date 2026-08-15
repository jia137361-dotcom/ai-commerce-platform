# Interface Contract — Design Now & Publish

Date: 2026-07-30

Owners: D (小鹏, cart/fulfillment hub) ↔ C (frontend/experience)

Status: **Active** — backend routes are implemented; this document is the single source of truth for D ↔ C handoff.

---

## Shared Access Rules

All buyer-facing requests must carry:

```
x-publishable-api-key: <VITE_PUBLISHABLE_API_KEY>
X-Store-Id: <mc_store.id>        # optional — backend falls back to default_store
Content-Type: application/json   # when body present
credentials: include             # always (session cookie)
```

Admin routes (`/admin/*`) require Medusa admin auth (Bearer token / admin session).

---

## Part 1 — Design Now → Studio

### 1.1 Entry Points & Navigation

There are two distinct "Design Now" entry patterns:

| Source | Component | Mechanism | Destination |
|---|---|---|---|
| Product detail page | `ProductPurchasePanel`, `StickyDesignBar` | Pure `<a>` link (no async) | `/design/:productId` |
| Store / Categories / Search / Studio landing | `openDesign()` / `handleCustomize()` | Async ensure → navigate | `/design/:productId?materialId=...` |

**Pattern A — Product page (direct link):**

```ts
// ProductDetailPage.tsx
const designHref = product?.id ? buildStudioEditorHref(product.id) : undefined
// → <a href={designHref}>Design now</a>
// → <StickyDesignBar designHref={designHref} disabled={!product.hasDesigner} />
```

`hasDesigner` controls button visibility. `buildStudioEditorHref` is defined in `buyer-design-handoff.ts`:

```ts
buildStudioEditorHref(productId: string, materialId?: string | null): string
// → `/design/:productId`  or  `/design/:productId?materialId=...`
```

**Pattern B — Catalog pages (async ensure):**

```ts
// StoreHomePage / CategoriesPage / SearchPage / StudioLandingPage
const openDesign = async (item: SupplierCatalogItem) => {
  const ensured = await ensureSupplierCatalogBlank({ basicProductId: item.id })
  // ensured = { productId: string, created: boolean }
  navigateBuyer(buildStudioEditorHref(ensured.productId))
}
```

`StudioLandingPage.handleCustomize` additionally pulls pending AI material from sessionStorage before navigating:

```ts
const pending = takePendingStudioMaterial()  // reads + clears sessionStorage
navigateBuyer(buildStudioEditorHref(ensured.productId, pending?.materialId))
```

### 1.2 `ensureSupplierCatalogBlank` — Backend Contract

```
POST /store/supplier-catalog/ensure
```

Request:
```json
{ "basic_product_id": 12345, "supplier_id": "sup_s2bdiy" }
```

Response:
```json
{ "product_id": "prod_xxx", "created": true }
```

Creates or reuses an `mc_product` that wraps the S2B blank template. The returned `product_id` is the `mc_product.id` used as the Studio route param.

### 1.3 Studio Entry — `DesignerPage` URL Params

`DesignerPage` (`/design/:productId`) reads:

| Param | Source | Purpose |
|---|---|---|
| `productId` | route param | The `mc_product.id` to design on |
| `materialId` | query `?materialId=` | AI-generated material to preload into the editor |
| `store` | query `?store=` | Explicit store override |

On mount, `DesignerPage`:

1. Calls `GET /store/products/:productId/design-config?materialId=` → gets SDK token + iframe URL
2. If `config.savedDesign` present → enters "continue editing" mode (redesign)
3. Loads S2BDIY iframe at `config.designerUrl`
4. Listens for `postMessage` from iframe (design save events)
5. Polls `POST /store/design-sessions/claim-latest` every 2.8s as fallback (first-time designs only)

### 1.4 `design-config` — Backend Contract

```
GET /store/products/:id/design-config?materialId=...
```

Response (`DesignConfig`):
```ts
{
  sdkBaseUrl: string          // S2BDIY SDK base
  token: string               // editor auth token
  basicProductId: string      // S2B blank template id
  viewId?: string | null
  designType?: number
  designerUrl: string         // full iframe URL with token
  editorMode?: "new" | "redesign"
  s2bProductId?: string | null
  sizeId?: string | null
  colorId?: string | null
  savedDesign?: DesignCompleteResult | null  // present when continuing edit
}
```

Error codes:
- `DESIGNER_NOT_SUPPORTED` (400) — product doesn't support online design
- `S2BDIY_CREDENTIALS_REQUIRED` (503) — missing AppKey/AppSecret
- `S2BDIY_CREDENTIALS_INVALID` (503) — credentials rejected

### 1.5 Design Completion — Two Paths

#### Path A: postMessage (primary)

S2BDIY iframe sends a `postMessage` with the designed product id. `DesignerPage` parses it via `resolveSavedProductId(data)` and calls:

```ts
completeDesignSession({
  s2bProductId,          // from postMessage
  basicProductId: config.basicProductId,
  quantity: 1,
  mockupUrl,             // extracted from postMessage
  saveAs: "draft",
  blankProductId: productId,
  guestKey: designGuestKey(),
})
```

#### Path B: claim-latest polling (fallback)

When the iframe does not postMessage (common), `DesignerPage` polls:

```ts
claimLatestDesignSession({
  basicProductId: config.basicProductId,
  excludeS2bIds: [...baseline, ...completed],
  saveAs: "draft",
})
```

### 1.6 `design-sessions/complete` — Backend Contract

```
POST /store/design-sessions/complete
```

Request:
```json
{
  "s2b_product_id": 123456,
  "basic_product_id": 789,
  "quantity": 1,
  "size_id": null,
  "color_id": null,
  "price": null,
  "mockup_url": "https://...",
  "save_as": "draft",
  "blank_product_id": "prod_xxx",
  "guest_key": "guest_xxx"
}
```

Response (`DesignCompleteResult`):
```ts
{
  mcProductId: string           // prod_xxx — the sellable mc_product
  variantId: string             // medusa_variant_id — used for cart
  title: string
  mockupUrl: string | null
  price: number | undefined
  s2bProductId: string | null
  basicProductId: string | null
  blankProductId: string | null
  status: string
  saveAs: "draft" | "ready"
  editorPath: string | null     // /design/:mcProductId for continue-editing
  sizes: [{ id: number, name: string }]
  colors: [{ id: number, name: string }]
  variants: [{ sizeId, colorId, sizeName, colorName, supplierVariantId, medusaVariantId }]
  selectedSizeId: number | null
  selectedColorId: number | null
}
```

**Critical for cart handoff: `variantId` = `medusa_variant_id`.**

### 1.7 `design-sessions/claim-latest` — Backend Contract

```
POST /store/design-sessions/claim-latest
```

Request:
```json
{
  "basic_product_id": 789,
  "blank_product_id": "prod_xxx",
  "guest_key": "guest_xxx",
  "exclude_s2b_ids": ["111", "222"],
  "save_as": "draft",
  "snapshot_only": false,
  "mockup_url": null
}
```

Response (claimed):
```json
{
  "claimed": true,
  "known_s2b_ids": ["123456"],
  "mc_product_id": "prod_yyy",
  "medusa_variant_id": "variant_yyy",
  "title": "...",
  "...": "...(same shape as design-sessions/complete response)"
}
```

Response (not yet):
```json
{ "claimed": false, "known_s2b_ids": [] }
```

`snapshot_only: true` returns only `{ claimed: false, known_s2b_ids }` without claiming — used for baseline scan on Studio load.

### 1.8 Cart Handoff — After Design Completion

Once `DesignCompleteResult` is obtained, the Studio shows an order panel with two actions:

#### "Place Order" (`handlePlaceOrder`)

```ts
// DesignerPage.tsx
const result = await addProductSelectionToCart({
  storeId: settings.storeId,
  storeName: settings.brandName,
  cartIdentity,
  variantId: savedResult.variantId,    // ← medusa_variant_id
  quantity,
  storageKey: getBuyerCartStorageKey(settings.storeId, cartIdentity),
  storage: window.localStorage,
  createCart: () => createCart({ storeId: settings.storeId }),
  addLineItem: (cartId, variantId, qty) =>
    addCartLineItem(cartId, variantId, qty, { storeId: settings.storeId }),
})
onCartUpdated(result)
navigateBuyer(`/checkout?store=${encodeURIComponent(settings.storeId)}`)
```

#### "Add to Cart" (`handleAddToCart`)

Same `addProductSelectionToCart` call, but stays on Studio with success notice:

```ts
setAddNotice({ tone: "success", message: t("designerAddedToCart") })
// "View cart" link → /cart
```

### 1.9 `addProductSelectionToCart` — Shared Cart Utility

Defined in `product-cart-action.ts`, used by both `DesignerPage` and `MyDesignsPage`:

```ts
type ProductCartActionInput = {
  storeId: string
  storeName?: string
  storeSlug?: string
  cartIdentity: string
  variantId: string
  quantity: number
  storageKey: string
  storage: Storage-like
  createCart: () => Promise<StoreCart>
  addLineItem: (cartId, variantId, quantity) => Promise<StoreCart>
}
```

Logic:
1. Read `cartId` from `storageKey` (localStorage key: `citigoo:{storeId}:cart:{identity}`)
2. If no cartId → `createCart()` → store new cartId
3. `addLineItem(cartId, variantId, quantity)`
4. On failure → recreate cart + retry once
5. `registerStoreCart(...)` → update platform cart registry

### 1.10 My Designs — Re-order

`MyDesignsPage` lists designs from two sources merged:
- Local: `listBuyerDesignDrafts(customerId)` (localStorage `citigoo:my-designs:{identity}`)
- Remote: `GET /store/my-designs?guest_key=` (server-side `mc_product` with `metadata.buyer_design === true`)

Each design card has:
- "Continue" → `editorPath` (`/design/:blankProductId` or `/design/:mcProductId`)
- "Order Now" → same `addProductSelectionToCart` flow as Studio

---

## Part 2 — Cart → Checkout → Order

### 2.1 Cart Lifecycle

```
createCart → addLineItem → [updateLineItem / deleteLineItem] → updateCartContact → updateCartAddress → selectShippingMethod → completeCart
```

### 2.2 `POST /store/carts` — Create Cart

Request:
```json
{ "currency_code": "usd", "region_id": "region_xxx" }
```

Response: native Medusa cart + `cart_id`, `store_id`.

### 2.3 `POST /store/carts/:id/line-items` — Add to Cart

Request:
```json
{ "variant_id": "variant_xxx", "quantity": 1 }
```

**Critical:** `variant_id` must be a `medusa_variant_id` linked to an `mc_product`. Backend validates:
- Cart belongs to current store
- Variant resolves to an `mc_product` via `medusa_variant_id`
- Product is cart-eligible (`isProductCartEligible`)
- Product store matches cart store

### 2.4 `PUT /store/carts/:id/line-items/:line_id` — Update Quantity

Request:
```json
{ "quantity": 2 }
```

### 2.5 `DELETE /store/carts/:id/line-items/:line_id` — Remove Line

### 2.6 `PUT /store/carts/:id/contact` — Save Contact

Request:
```json
{ "email": "buyer@example.com", "phone": "+1234567890" }
```

### 2.7 `PUT /store/carts/:id/address` — Save Shipping Address

Request:
```json
{
  "email": "buyer@example.com",
  "phone": "+1234567890",
  "shipping_address": {
    "first_name": "First",
    "last_name": "Last",
    "address_1": "123 Main St",
    "address_2": "",
    "city": "Los Angeles",
    "province": "CA",
    "postal_code": "90001",
    "country_code": "us"
  }
}
```

### 2.8 `GET /store/carts/:id/shipping-options` — List Shipping

Response:
```json
{
  "shipping_options": [
    { "id": "so_xxx", "name": "Standard", "amount": 5.99, "currency_code": "usd" }
  ],
  "requires_shipping_method": true
}
```

### 2.9 `POST /store/carts/:id/shipping-methods` — Select Shipping

Request:
```json
{ "option_id": "so_xxx" }
```

### 2.10 `POST /store/carts/:id/complete` — Place Order

Request:
```json
{
  "payment_provider_id": "pp_system_default",
  "platform_checkout_id": "pc_xxx",       // optional, multi-store
  "platform_checkout_index": 0,
  "platform_checkout_count": 2
}
```

Response:
```json
{
  "order_id": "order_xxx",
  "store_id": "default_store",
  "payment_status": "authorized",
  "fulfillment_status": "not_fulfilled",
  "payment_provider_id": "pp_system_default",
  "payment_method_label": null,
  "order": { "...native Medusa order fields..." }
}
```

### 2.11 `POST /store/carts/:id/stripe/use-saved-payment-method`

Request:
```json
{
  "payment_method_id": "pm_xxx",
  "provider_id": "pp_stripe_xxx",
  "return_url": "https://...",
}
```

### 2.12 `POST /store/carts/:id/coupons` — Apply/Clear Coupon

Request (apply):
```json
{ "action": "apply", "buyer_coupon_id": "bc_xxx" }
```

Request (clear):
```json
{ "action": "clear" }
```

Response: `CheckoutPricingBreakdown` with `merchandise_subtotal`, `shipping_total`, `coupon_discount`, `plan_discount`, `discount_total`, `payable_total`, `applied_coupon`.

---

## Part 3 — Publish (Product Lifecycle)

### 3.1 State Machine

```
draft → published → unpublished
  ↓        ↓
archived ←┘
```

| Transition | Endpoint | Auth |
|---|---|---|
| Create draft | `POST /admin/products/draft` | Admin |
| Publish | `POST /admin/products/:product_id/publish` | Admin |
| Unpublish | `POST /admin/products/:product_id/unpublish` | Admin |
| Update | `PUT /admin/store-products/:product_id` | Admin |
| Delete (soft) | `DELETE /admin/store-products/:product_id` | Admin |
| Delete (hard) | `DELETE /admin/store-products/:product_id?permanent=true` | Admin |
| Duplicate | `POST /admin/products/:product_id/duplicate` | Admin |
| Bulk archive/delete | `POST /admin/store-products/bulk` | Admin |
| Re-provision S2B | `POST /admin/products/:product_id/provision-s2b` | Admin |

### 3.2 `POST /admin/products/draft` — Create Draft

**Required fields:**
```json
{
  "title": "My T-Shirt",
  "price": 29.99,
  "cost": 12.00
}
```

**Full field spec:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | **yes** | Product title |
| `price` | number | **yes** | Selling price (USD major units) |
| `cost` | number | **yes** | Base cost; auto-inherited from supplier chain if omitted |
| `description` | string | no | |
| `image_url` | string | no | Main product image |
| `design_image_url` | string | no | AI-generated design |
| `mockup_image_url` | string | no | Mockup render |
| `print_file_url` | string | no | Print-ready file |
| `platform_product_id` | string | no | Links to `mc_platform_product` |
| `basic_product_id` | string | no | S2B blank template id |
| `supplier_product_id` | string | no | Links to `mc_supplier_product` |
| `supplier_variant_id` | string | no | Links to `mc_supplier_product_variant` |
| `supplier_material_id` | string | no | S2B material |
| `supplier_size_id` | string | no | S2B size |
| `supplier_color_id` | string | no | S2B color |
| `view_id` | string | no | S2B print view |
| `design_type` | number | no | Default `1` |
| `tags` | string[] | no | |
| `category_ids` | string[] | no | Must belong to current store |
| `source` | `"manual"` \| `"ai"` | no | Default `"manual"` |
| `ai_job_id` | string | no | AI generation job reference |
| `prompt` | string | no | AI prompt used |
| `supplier_id` | string | no | Must be active supplier |
| `ship_from_country` | string | no | Auto-inherited from supplier if omitted |
| `supported_region_ids` | string[] | no | Auto-inherited from supplier `ship_to_regions` if omitted |
| `variants` | array | no | Variant rows |
| `metadata` | object | no | Arbitrary JSON |

**Validation rules:**
- `platform_product_id` → must reference active `mc_platform_product`
- `supplier_id` → must reference active `mc_supplier` with `status: "active"`
- `supplier_product_id` → must be active + belong to `supplier_id` + belong to `platform_product_id`
- `supplier_variant_id` → must belong to `supplier_product_id`
- `category_ids` → all must belong to current store

**Auto-inheritance:**
- `cost` = `cost` ?? `supplier_variant.cost` ?? `supplier_product.base_cost` ?? `platform_product.base_cost`
- `supplier_product_id` = `supplier_product_id` ?? `platform_product.supplier_product_id`
- `supplier_id` = `supplier_id` ?? `supplier_product.supplier_id`
- `ship_from_country` = `body.ship_from_country` ?? `supplier.ship_from_country`
- `supported_region_ids` = `body.supported_region_ids` ?? `supplier.ship_to_regions`

Response:
```json
{
  "product_id": "prod_xxx",
  "store_id": "default_store",
  "status": "draft",
  "product": { "...normalized mc_product..." }
}
```

### 3.3 `POST /admin/products/:product_id/publish` — Publish

**No request body.** Flow:
1. Validate product exists + belongs to current store + not archived
2. If already published with variant → return immediately (idempotent)
3. `title` must be non-empty
4. `resolveNativeBridgeForPublish` → creates/reuses Medusa native product + variant
5. `ensureNativeBridgeCartable` → makes bridge purchasable
6. If `requires_shipping` → `ensureNativeProductShippingProfile`
7. Update `mc_product.medusa_product_id`, `medusa_variant_id`, `variants` (with medusa_variant_id mappings)
8. Set `status = "published"`

Response:
```json
{
  "product_id": "prod_xxx",
  "store_id": "default_store",
  "status": "published",
  "product": { "...normalized mc_product with medusa_product_id + medusa_variant_id..." }
}
```

**After publish:** product is visible in `GET /store/products` and can be added to cart.

### 3.4 `POST /admin/products/:product_id/unpublish` — Unpublish

**No request body.** Sets `status = "unpublished"`. Archived products cannot be unpublished.

### 3.5 `PUT /admin/store-products/:product_id` — Update

Updatable fields: `title`, `description`, `price`, `cost`, `category_ids`, `ship_from_country`, `supported_region_ids`, `requires_shipping`, `tags`, `image_url`, `mockup_image_url`, `design_image_url`, `print_file_url`, `metadata`.

Archived products can only be restored to `draft` (via `status: "draft"`).

### 3.6 `DELETE /admin/store-products/:product_id` — Delete

- Default: soft delete → `status = "archived"`
- `?permanent=true`: hard delete (only for `draft` or `archived`)

### 3.7 `POST /admin/products/:product_id/duplicate` — Duplicate

Creates a new `draft` copy of the product.

### 3.8 `POST /admin/store-products/bulk` — Bulk Operations

Request:
```json
{ "product_ids": ["prod_a", "prod_b"], "action": "archive" }
```

Actions: `"archive"`, `"delete"`.

### 3.9 `POST /admin/products/:product_id/provision-s2b` — Re-provision

Retries S2BDIY product provisioning for a published product.

---

## Part 4 — Key Type Reference

### `StoreCart` (frontend)
```ts
{
  id: string
  regionId?: string
  storeId?: string
  email?: string
  customerId?: string | null
  currencyCode: string
  items: CartLineItem[]
  subtotal: number        // dollars
  total: number           // dollars
  shippingAddress?: StoreCartShippingAddress | null
}
```

### `CartLineItem` (frontend)
```ts
{
  id: string
  title: string
  imageUrl?: string
  quantity: number
  unitPrice: number       // dollars
  total: number           // dollars
  variantId?: string      // medusa_variant_id
  variantTitle?: string
  productId?: string
  colorName?: string
  sizeName?: string
  supplierColorId?: string
  supplierSizeId?: string
  storeId?: string
}
```

### `StoreProduct` (frontend)
```ts
{
  id: string                      // mc_product.id
  title: string
  price: string                   // display string
  numericPrice?: number
  imageUrl: string
  mockupImageUrl?: string
  designImageUrl?: string
  medusaProductId?: string
  medusaVariantId?: string        // ← used for cart when no variants[]
  hasDesigner?: boolean           // ← controls Design Now button
  isCartAddable?: boolean
  variants?: BuyerProductVariant[]
  storeId?: string
  supportedRegions?: ProductRegionSummary[]
  supplierDetails?: SupplierProductDetails
  // ... supplier fields: supplierId, supplierProductId, basicProductId, viewId, designType
}
```

### `DesignCompleteResult` (frontend)
```ts
{
  mcProductId: string
  variantId: string               // ← medusa_variant_id for cart
  title: string
  mockupUrl?: string | null
  price?: number
  s2bProductId?: string | null
  basicProductId?: string | null
  blankProductId?: string | null
  status?: string
  saveAs?: "draft" | "ready"
  editorPath?: string | null
  sizes: DesignOption[]
  colors: DesignOption[]
  variants: DesignVariantOption[]
  selectedSizeId: number | null
  selectedColorId: number | null
}
```

---

## Part 5 — Storage Keys (localStorage / sessionStorage)

| Key | Scope | Purpose |
|---|---|---|
| `citigoo:{storeId}:cart:{identity}` | localStorage | Cart ID for store+identity |
| `citigoo:platform:carts:{identity}` | localStorage | Multi-store cart registry |
| `citigoo:my-designs:{identity}` | localStorage | My Design drafts |
| `citigoo:pending-studio-material` | sessionStorage | AI material → Studio handoff |
| `citigoo:buyer-ai-designs` | localStorage | Legacy AI designs bucket |
| `citigoo:buyer-design-guest-key` | localStorage | Guest design identity |
| `citigoo:buyer_guest_session` | localStorage | Guest cart session |
| `citigoo:{storeId}:checkout_success` | sessionStorage | Checkout success payload |
| `citigoo:{storeId}:split_checkout` | sessionStorage | Split checkout state |

`identity` = `buyer:{customerId}` or `guest:{sessionId}`.

---

## Part 6 — Error Shape

All endpoints return errors in this shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "title is required"
  }
}
```

Or legacy string form:
```json
{ "error": "Cart has no line items" }
```

Common error codes: `VALIDATION_ERROR` (400), `PRODUCT_NOT_FOUND` (404), `PRODUCT_STORE_MISMATCH` (403), `DESIGNER_NOT_SUPPORTED` (400), `S2BDIY_CREDENTIALS_REQUIRED` (503), `S2BDIY_CREDENTIALS_INVALID` (503), `MISSING_FIELDS` (400), `EXTERNAL_SERVICE_ERROR` (500/503).

---

## Summary — What D Needs to Confirm

1. **Design Now params are stable.** The contract above is what C already implemented. No backend changes needed for the Studio entry flow.

2. **Cart handoff uses `variantId` = `medusa_variant_id`.** After `design-sessions/complete`, the `variantId` field is what gets passed to `addCartLineItem`. This is already wired.

3. **Publish flow is admin-only.** The `/admin/products/draft` + `/admin/products/:id/publish` endpoints are implemented. The seller dashboard (member D's "User Backend" scope) needs a frontend that calls these.

4. **No missing backend routes.** All endpoints referenced in this contract exist in `apps/medusa-backend/src/api/`. C's frontend is ready to connect.