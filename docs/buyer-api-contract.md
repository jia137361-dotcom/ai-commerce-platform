# Buyer API Contract

Date: 2026-06-15

Branch: `feature/buyer-frontend-integration`

Purpose: clean API contract for rebuilding the buyer-side frontend from PNG designs. The existing `apps/storefront` can be used as API-client reference, but not as the final UI standard.

## Runtime Base URLs

- Local backend URL: `http://127.0.0.1:9000`
- Compatible local backend URL: `http://localhost:9000`
- Frontend dev URL: `http://127.0.0.1:5174`
- Compatible frontend dev URL if needed: `http://localhost:5174`

Backend CORS:

- `apps/medusa-backend/medusa-config.ts` reads `STORE_CORS`.
- Current default is `http://localhost:8000,http://localhost:3000`.
- For buyer frontend dev, set `STORE_CORS` to include at least:

```text
http://127.0.0.1:5174,http://localhost:5174
```

Recommended local value:

```text
STORE_CORS=http://127.0.0.1:5174,http://localhost:5174,http://localhost:3000
```

## Frontend Environment Variables

Preferred Vite variables:

```text
VITE_MEDUSA_BASE_URL=http://127.0.0.1:9000
VITE_PUBLISHABLE_API_KEY=<publishable_api_key>
VITE_DEFAULT_STORE_ID=default_store
```

Compatible `NEXT_PUBLIC_*` variables currently supported by `apps/storefront`:

```text
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://127.0.0.1:9000
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=<publishable_api_key>
NEXT_PUBLIC_STORE_ID=default_store
```

Client resolution order used by current storefront reference:

- Backend URL: `VITE_MEDUSA_BASE_URL` -> `NEXT_PUBLIC_MEDUSA_BACKEND_URL` -> `http://127.0.0.1:9000`
- Publishable key: `VITE_PUBLISHABLE_API_KEY` -> `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`
- Store id: `VITE_DEFAULT_STORE_ID` -> `NEXT_PUBLIC_STORE_ID` -> `default_store`

## Shared Request Rules

Required headers for buyer APIs:

```http
x-publishable-api-key: <publishable_api_key>
X-Store-Id: default_store
Content-Type: application/json
```

Notes:

- `X-Store-Id` is the Phase 1 explicit store selector. If omitted, backend falls back to `DEFAULT_STORE_ID`.
- `Content-Type` is only required for JSON request bodies.
- Store context resolution is: `X-Store-Id`, future domain binding, default fallback.

Common error shapes are not fully uniform yet. Expect either:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "variant_id is required"
  }
}
```

or:

```json
{
  "error": "Cart has no line items"
}
```

Frontend should normalize both forms into `{ code?: string, message: string }`.

## Shared Response Shapes

### Product

```ts
type BuyerProduct = {
  product_id: string
  store_id: string
  title: string
  description: string | null
  status: "published"
  source: "manual" | "ai"
  supplier_id: string | null
  platform_product_id: string | null
  supplier_product_id: string | null
  supplier_variant_id: string | null
  medusa_product_id: string | null
  medusa_variant_id: string | null
  is_cart_addable: boolean
  image_url: string | null
  mockup_image_url: string | null
  design_image_url: string | null
  print_file_url: string | null
  tags: string[]
  price: number | string | null
  category_ids: string[]
  average_rating: number | null
  review_count: number
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}
```

Frontend should use:

- Display: `title`, `description`, `price`, `image_url`, `mockup_image_url`, `design_image_url`, `tags`
- Product URL/id: `product_id`
- Add to cart: `is_cart_addable`, `medusa_variant_id`
- Reviews summary: `average_rating`, `review_count`
- Fulfillment/debug visibility if needed: `supplier_*`, `print_file_url`

### Cart

The custom cart routes return native Medusa cart fields plus top-level `cart_id` and `store_id`.

```ts
type BuyerCart = {
  cart_id: string
  id: string
  store_id: string
  email?: string | null
  currency_code?: string
  items?: BuyerCartLineItem[]
  shipping_address?: Record<string, unknown> | null
  billing_address?: Record<string, unknown> | null
  subtotal?: number
  total?: number
  metadata?: {
    store_id?: string
    [key: string]: unknown
  }
}

type BuyerCartLineItem = {
  id: string
  title?: string
  quantity: number
  unit_price?: number
  total?: number
  variant_id?: string
  product_id?: string
  thumbnail?: string | null
  metadata?: {
    mc_product_id?: string
    mc_product_title?: string
    store_id?: string
    supplier_id?: string
    supplier_product_id?: string
    supplier_variant_id?: string
    print_file_url?: string
    mockup_image_url?: string
    print_position?: string
    color?: string
    size?: string
    supplier_color_id?: string
    supplier_size_id?: string
    [key: string]: unknown
  }
}
```

Frontend should use:

- Cart identity: `cart_id` or `id`
- Totals: `subtotal`, `total`, `currency_code`
- Line display: `items[].title`, `items[].quantity`, `items[].unit_price`, `items[].total`, `items[].thumbnail`
- Product metadata fallback: `items[].metadata.mc_product_title`, `items[].metadata.mockup_image_url`, `items[].metadata.color`, `items[].metadata.size`

## P0 API Contract

### 1. Product List

Status: ready, with query limitations.

- Method: `GET`
- Path: `/store/products`
- Required headers: shared buyer headers.
- Query params: none currently supported by the custom route.
- Request body: none.

Response:

```json
{
  "store_id": "default_store",
  "count": 2,
  "products": [
    {
      "product_id": "prod_123",
      "store_id": "default_store",
      "title": "Cool T-Shirt",
      "description": "A clean summer beach inspired t-shirt.",
      "status": "published",
      "medusa_variant_id": "variant_123",
      "is_cart_addable": true,
      "image_url": "https://cdn.example.com/product.png",
      "mockup_image_url": "https://cdn.example.com/mockup.png",
      "price": 29.99,
      "category_ids": ["cat_123"],
      "average_rating": 4.8,
      "review_count": 14,
      "tags": ["summer"],
      "metadata": {}
    }
  ]
}
```

Frontend should use:

- Render cards from `products`.
- Disable add-to-cart when `is_cart_addable` is false or `medusa_variant_id` is missing.
- Use `product_id` for detail links.
- Use `category_ids` only after categories are loaded.

Current caveat:

- No backend query contract for pagination, category filter, text search, price sort, or featured sorting.

### 2. Product Detail

Status: ready.

- Method: `GET`
- Path: `/store/products/:product_id`
- Required headers: shared buyer headers.
- Query params: none.
- Request body: none.

Response:

```json
{
  "product": {
    "product_id": "prod_123",
    "store_id": "default_store",
    "title": "Cool T-Shirt",
    "description": "A clean summer beach inspired t-shirt.",
    "status": "published",
    "medusa_product_id": "prod_native_123",
    "medusa_variant_id": "variant_native_123",
    "is_cart_addable": true,
    "image_url": "https://cdn.example.com/product.png",
    "mockup_image_url": "https://cdn.example.com/mockup.png",
    "design_image_url": "https://cdn.example.com/design.png",
    "print_file_url": "https://cdn.example.com/print.png",
    "price": 29.99,
    "category_ids": ["cat_123"],
    "average_rating": 4.8,
    "review_count": 14,
    "metadata": {}
  }
}
```

Frontend should use:

- Detail media from `image_url`, `mockup_image_url`, `design_image_url`.
- Price/title/body from `price`, `title`, `description`.
- Add-to-cart input from `medusa_variant_id`.
- Reviews summary from `average_rating`, `review_count`.

Current caveat:

- Product option/variant selection is not modeled as a buyer contract yet. Existing frontend color/size controls are visual only.

### 3. Product Categories

Status: ready.

- Method: `GET`
- Path: `/store/product-categories`
- Required headers: shared buyer headers.
- Query params: none.
- Request body: none.

Response:

```json
{
  "store_id": "default_store",
  "count": 1,
  "categories": [
    {
      "category_id": "cat_123",
      "store_id": "default_store",
      "name": "T-Shirts",
      "slug": "t-shirts",
      "description": "All t-shirt products",
      "parent_id": null,
      "sort_order": 0,
      "created_at": "2026-06-01T00:00:00.000Z",
      "updated_at": "2026-06-01T00:00:00.000Z"
    }
  ]
}
```

Frontend should use:

- Category nav: `categories[].name`, `slug`, `category_id`
- Product filtering: match product `category_ids` to `category_id`
- Ordering: `sort_order`

Current caveat:

- Product list does not accept `category_id` query filtering, so frontend must filter locally or backend needs a filter PR.

### 4. Store Settings

Status: ready.

- Method: `GET`
- Path: `/store/settings`
- Required headers: shared buyer headers.
- Query params: none.
- Request body: none.

Response:

```json
{
  "settings": {
    "store_id": "default_store",
    "brand_name": "Citigoo",
    "logo_url": "https://cdn.example.com/logo.png",
    "support_email": "support@example.com",
    "seo_title": "Citigoo Store",
    "seo_description": "Curated buyer storefront.",
    "metadata": {}
  }
}
```

Frontend should use:

- Header/footer branding: `brand_name`, `logo_url`
- Support links: `support_email`
- Document metadata: `seo_title`, `seo_description`
- Design-specific extra fields only if agreed inside `metadata`

### 5. Product Reviews

Status: ready for list and create; partial for frontend UX because create requires verified order information.

#### List Reviews

- Method: `GET`
- Path: `/store/products/:product_id/reviews`
- Required headers: shared buyer headers.
- Query params:
  - `limit`: optional, default `20`, max `100`
- Request body: none.

Response:

```json
{
  "product_id": "prod_123",
  "store_id": "default_store",
  "average_rating": 4.8,
  "review_count": 14,
  "rating_breakdown": {
    "5": 10,
    "4": 3,
    "3": 1,
    "2": 0,
    "1": 0
  },
  "reviews": [
    {
      "review_id": "prv_123",
      "store_id": "default_store",
      "product_id": "prod_123",
      "order_id": "order_123",
      "order_display_id": 1001,
      "customer_name": "Verified buyer",
      "rating": 5,
      "title": "Great shirt",
      "content": "Good print quality.",
      "status": "published",
      "metadata": {},
      "created_at": "2026-06-01T00:00:00.000Z"
    }
  ]
}
```

Frontend should use:

- Summary: `average_rating`, `review_count`, `rating_breakdown`
- Review cards: `customer_name`, `rating`, `title`, `content`, `created_at`

#### Create Review

- Method: `POST`
- Path: `/store/products/:product_id/reviews`
- Required headers: shared buyer headers.
- Query params: none.

Request body:

```json
{
  "email": "buyer@example.com",
  "order_number": 1001,
  "rating": 5,
  "title": "Great shirt",
  "content": "Good print quality.",
  "customer_name": "Jane"
}
```

Response:

```json
{
  "product_id": "prod_123",
  "store_id": "default_store",
  "average_rating": 4.8,
  "review_count": 15,
  "rating_breakdown": {
    "5": 11,
    "4": 3,
    "3": 1,
    "2": 0,
    "1": 0
  },
  "review": {
    "review_id": "prv_456",
    "rating": 5,
    "title": "Great shirt",
    "content": "Good print quality.",
    "customer_name": "Jane",
    "status": "published"
  }
}
```

Frontend should use:

- Require order number/email before submit.
- Accept only integer rating `1` to `5`.
- Refresh review summary after success.

### 6. Product Share

Status: ready.

- Method: `GET`
- Path: `/store/products/:product_id/share`
- Required headers: shared buyer headers.
- Query params: none.
- Request body: none.

Response:

```json
{
  "product_id": "prod_123",
  "store_id": "default_store",
  "title": "Cool T-Shirt",
  "description": "A clean summer beach inspired t-shirt.",
  "image_url": "https://cdn.example.com/product.png",
  "product_url": "http://localhost:3000/products/prod_123",
  "share_text": "Cool T-Shirt http://localhost:3000/products/prod_123",
  "channels": {
    "facebook": {
      "enabled": true,
      "type": "web_share_url",
      "url": "https://www.facebook.com/sharer/sharer.php?u=..."
    },
    "copy_link": {
      "enabled": true,
      "type": "copy",
      "value": "http://localhost:3000/products/prod_123"
    }
  }
}
```

Frontend should use:

- Native share/copy: `product_url`, `share_text`
- Channel UI: `channels.*.type`, `url`, `value`, `message`
- Product image preview: `image_url`

Current caveat:

- `product_url` uses backend `STOREFRONT_BASE_URL` fallback `http://localhost:3000`; set this env var if frontend runs at another public URL.

### 7. Create Cart

Status: ready.

- Method: `POST`
- Path: `/store/carts`
- Required headers: shared buyer headers.
- Query params: none.

Request body:

```json
{
  "customer_email": "buyer@example.com",
  "currency_code": "usd",
  "region_id": "reg_123"
}
```

All fields are optional. `currency_code` defaults to `usd`; region falls back through backend default-region resolution.

Response:

```json
{
  "cart_id": "cart_123",
  "store_id": "default_store",
  "id": "cart_123",
  "email": "buyer@example.com",
  "currency_code": "usd",
  "items": [],
  "metadata": {
    "store_id": "default_store"
  }
}
```

Frontend should use:

- Persist `cart_id` in local storage keyed by store id.
- Use `cart_id` or `id` for all later cart calls.

### 8. Get Cart

Status: ready.

- Method: `GET`
- Path: `/store/carts/:cart_id`
- Required headers: shared buyer headers.
- Query params: none.
- Request body: none.

Response:

```json
{
  "cart_id": "cart_123",
  "store_id": "default_store",
  "id": "cart_123",
  "email": "buyer@example.com",
  "currency_code": "usd",
  "items": [
    {
      "id": "cali_123",
      "title": "Cool T-Shirt",
      "quantity": 2,
      "unit_price": 2999,
      "total": 5998,
      "variant_id": "variant_123",
      "thumbnail": "https://cdn.example.com/mockup.png",
      "metadata": {
        "mc_product_id": "prod_123",
        "mc_product_title": "Cool T-Shirt",
        "store_id": "default_store",
        "supplier_variant_id": "spv_123",
        "mockup_image_url": "https://cdn.example.com/mockup.png",
        "color": "black",
        "size": "M"
      }
    }
  ],
  "shipping_address": null,
  "billing_address": null,
  "subtotal": 5998,
  "total": 5998
}
```

Frontend should use:

- Render cart from `items`.
- Prefer `items[].metadata.mc_product_title` and `mockup_image_url` as fallbacks if native fields are missing.
- Convert Medusa amount fields carefully; current reference frontend treats values greater than `999` as cents.

### 9. Add Cart Line Item

Status: ready.

- Method: `POST`
- Path: `/store/carts/:cart_id/line-items`
- Required headers: shared buyer headers.
- Query params: none.

Request body:

```json
{
  "variant_id": "variant_123",
  "quantity": 1
}
```

Response:

```json
{
  "cart_id": "cart_123",
  "store_id": "default_store",
  "line_item": {
    "id": "cali_123",
    "variant_id": "variant_123",
    "quantity": 1,
    "metadata": {
      "mc_product_id": "prod_123",
      "supplier_variant_id": "spv_123"
    }
  }
}
```

Frontend should use:

- Send `product.medusa_variant_id` as `variant_id`.
- Refresh cart after add because the response is line-item focused, not full cart focused.
- Disable add-to-cart if `is_cart_addable` is false.

### 10. Update Cart Line Quantity

Status: ready.

- Method: `PUT`
- Path: `/store/carts/:cart_id/line-items/:line_id`
- Required headers: shared buyer headers.
- Query params: none.

Request body:

```json
{
  "quantity": 2
}
```

Response:

```json
{
  "cart_id": "cart_123",
  "store_id": "default_store",
  "line_item": {
    "id": "cali_123",
    "quantity": 2
  },
  "cart": {
    "id": "cart_123",
    "items": []
  }
}
```

Frontend should use:

- Prefer `cart` from response to update local state.
- Treat quantity `0` as allowed by backend, but UI should generally use DELETE for remove.

### 11. Delete Cart Line Item

Status: ready.

- Method: `DELETE`
- Path: `/store/carts/:cart_id/line-items/:line_id`
- Required headers: shared buyer headers.
- Query params: none.
- Request body: none.

Response:

```json
{
  "cart_id": "cart_123",
  "store_id": "default_store",
  "cart": {
    "id": "cart_123",
    "items": []
  }
}
```

Frontend should use:

- Replace local cart with response `cart`.
- If the cart becomes empty, keep the cart id or clear it depending on UX.

### 12. Checkout Complete

Status: partial.

- Method: `POST`
- Path: `/store/carts/:cart_id/complete`
- Required headers: shared buyer headers.
- Query params: none.

Request body:

```json
{
  "payment_provider_id": "pp_system_default"
}
```

`payment_provider_id` is optional. Backend defaults to `pp_system_default`.

Response:

```json
{
  "order_id": "order_123",
  "store_id": "default_store",
  "payment_provider_id": "pp_system_default",
  "payment_status": "paid",
  "fulfillment_status": "waiting",
  "order": {
    "id": "order_123",
    "display_id": 1001,
    "email": "buyer@example.com",
    "metadata": {
      "store_id": "default_store",
      "payment_status": "paid"
    }
  }
}
```

Frontend should use:

- Confirmation id: `order_id`
- Display order number: `order.display_id` until top-level `display_id` is added.
- Buyer email: `order.email`
- Status: `payment_status`, `fulfillment_status`
- Clear completed cart id from local storage after success.

Current caveats:

- There is no custom buyer address update endpoint yet, so checkout cannot reliably submit shipping address before completion.
- Top-level `display_id`, `order_number`, `email`, and `created_at` are not exposed by this route on the current branch.
- Shipping option selection is not modeled.

### 13. Order Lookup

Status: ready for guest lookup; partial for full account/order UX.

- Method: `GET`
- Path: `/store/orders/lookup`
- Required headers: shared buyer headers.
- Query params:
  - `email`: required
  - `display_id`: required unless `order_number` is supplied
  - `order_number`: accepted alias for `display_id`
- Request body: none.

Example:

```http
GET /store/orders/lookup?email=buyer%40example.com&display_id=1001
```

Response:

```json
{
  "order_id": "order_123",
  "display_id": 1001,
  "order_number": 1001,
  "email": "buyer@example.com",
  "store_id": "default_store",
  "payment_status": "paid",
  "fulfillment_status": "waiting",
  "created_at": "2026-06-01T00:00:00.000Z"
}
```

Frontend should use:

- Guest lookup form: `email` and order number.
- Route to tracking/detail using `order_id`.

Current caveat:

- This endpoint returns summary only; it does not include items, totals, address, or shipments.

### 14. Order Tracking

Status: ready for tracking panel; partial for full order detail page.

- Method: `GET`
- Path: `/store/orders/:order_id/tracking`
- Required headers: shared buyer headers.
- Query params:
  - `email`: required
- Request body: none.

Example:

```http
GET /store/orders/order_123/tracking?email=buyer%40example.com
```

Response:

```json
{
  "order_id": "order_123",
  "store_id": "default_store",
  "payment_status": "paid",
  "fulfillment_status": "shipped",
  "fulfillment_order": {
    "id": "fo_123",
    "order_id": "order_123",
    "store_id": "default_store",
    "status": "waiting"
  },
  "shipments": [
    {
      "id": "ship_123",
      "fulfillment_order_id": "fo_123",
      "tracking_number": "TRACK123",
      "carrier": "USPS",
      "status": "shipped"
    }
  ]
}
```

Frontend should use:

- Tracking timeline/status: `fulfillment_status`, `fulfillment_order`, `shipments`
- Guard request with buyer email.

Current caveat:

- This endpoint does not include order items, totals, shipping address, or payment breakdown.

## Missing P0 Backend Interfaces

### Cart Address Update

Status: missing.

Needed for P0 checkout.

Suggested API:

- Method: `PUT`
- Path: `/store/carts/:cart_id/address`
- Required headers: shared buyer headers.

Request body:

```json
{
  "email": "buyer@example.com",
  "shipping_address": {
    "first_name": "Jane",
    "last_name": "Doe",
    "address_1": "1188 Market Street",
    "address_2": "Apt 12",
    "city": "San Francisco",
    "province": "CA",
    "postal_code": "94103",
    "country_code": "us",
    "phone": "+14155550188"
  },
  "billing_address": {
    "same_as_shipping": true
  }
}
```

Frontend needs response:

```json
{
  "cart_id": "cart_123",
  "store_id": "default_store",
  "cart": {}
}
```

### Full Order Detail

Status: missing.

Needed for order confirmation and account order detail.

Suggested API:

- Method: `GET`
- Path: `/store/orders/:order_id`
- Query params:
  - `email`: required for guest access unless auth exists

Frontend needs:

- Order header: `order_id`, `display_id`, `email`, `created_at`
- Items: product title/image/quantity/price/metadata
- Totals: subtotal, shipping, tax, discounts, total
- Addresses: shipping and billing
- Payment status
- Fulfillment status
- Fulfillment order
- Shipments/tracking

### Order List

Status: missing.

Needed for account order list.

Suggested API:

- Method: `GET`
- Path: `/store/orders`
- Query params:
  - `email` or authenticated customer identity
  - `status` optional
  - `limit` optional
  - `offset` optional

Frontend needs:

- `orders[]` with summary fields, first item preview, totals, payment/fulfillment status, created date.
- Strict store isolation and buyer ownership validation.

### Shipping Options

Status: missing / undecided.

Needed if Medusa checkout requires explicit shipping option selection.

Suggested API if needed:

- `GET /store/carts/:cart_id/shipping-options`
- `POST /store/carts/:cart_id/shipping-methods`

Frontend needs:

- Available shipping methods with id, name, amount, currency, estimated delivery.
- Selected shipping method reflected in cart totals.

## Frontend API Client Naming Suggestions

Use design-independent names in a buyer API client module, for example `src/lib/buyer-api.ts`.

Recommended functions:

```ts
fetchStoreSettings(): Promise<StoreSettings>
fetchProductCategories(): Promise<ProductCategory[]>
fetchProducts(): Promise<BuyerProduct[]>
fetchProductDetail(productId: string): Promise<BuyerProduct>
fetchProductReviews(productId: string, params?: { limit?: number }): Promise<ProductReviewsResponse>
createProductReview(productId: string, body: CreateReviewInput): Promise<CreateReviewResponse>
fetchProductShare(productId: string): Promise<ProductShareResponse>

createCart(input?: { email?: string; currencyCode?: string; regionId?: string }): Promise<BuyerCart>
fetchCart(cartId: string): Promise<BuyerCart>
addCartLineItem(cartId: string, input: { variantId: string; quantity: number }): Promise<BuyerCart>
updateCartLineItem(cartId: string, lineId: string, input: { quantity: number }): Promise<BuyerCart>
deleteCartLineItem(cartId: string, lineId: string): Promise<BuyerCart>
updateCartAddress(cartId: string, input: CartAddressInput): Promise<BuyerCart>
completeCart(cartId: string, input?: { paymentProviderId?: string }): Promise<CompleteCartResponse>

lookupOrder(input: { email: string; orderNumber: number | string }): Promise<OrderLookupResponse>
fetchOrderTracking(orderId: string, input: { email: string }): Promise<OrderTrackingResponse>
fetchOrderDetail(orderId: string, input: { email: string }): Promise<OrderDetailResponse>
fetchOrders(params: { email?: string; status?: string; limit?: number; offset?: number }): Promise<OrderListResponse>
```

Implementation notes:

- Centralize headers in one helper.
- Normalize backend errors into one frontend error type.
- Normalize money amounts consistently.
- Keep `cart_id` persisted per store id, not globally.
- Refresh cart after add-line-item because add response does not include full cart.

## Readiness Summary

Ready:

- Store settings
- Product categories
- Product list
- Product detail
- Review list/create
- Product share
- Cart create/get/add/update/delete
- Guest order lookup summary
- Order tracking

Partial:

- Checkout complete, because address update and shipping option flow are not settled.
- Order lookup/tracking, because they do not provide full detail/list UX.
- Product list, because filtering/sorting/pagination are not in the backend contract.
- Product detail variants/options, because only one `medusa_variant_id` is currently exposed for add-to-cart.

Missing:

- Cart address update
- Full order detail
- Order list
- Shipping option APIs, if required by checkout rules
