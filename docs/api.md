# AI Commerce Platform API Reference

Base URL: `http://localhost:9000`

This document covers the current Development 1 scope: store-aware products, platform products, product categories, and store settings.

## Store Context

Store-owned APIs resolve the active store through `resolveCurrentStore(req)`.

Resolution priority:

1. `X-Store-Id` request header
2. Localhost/default host fallback
3. `DEFAULT_STORE_ID`, defaulting to `default_store`

The domain binding model exists, but real host/domain-to-store lookup is reserved and not implemented yet.

Debug endpoint:

```http
GET /store-context
```

Example:

```bash
curl -i http://localhost:9000/store-context

curl -i \
  -H "X-Store-Id: test_store" \
  http://localhost:9000/store-context
```

## Admin APIs

### Store Settings

#### `GET /admin/store-settings`

Returns settings for the current store.

#### `PUT /admin/store-settings`

Creates or updates settings for the current store. The current implementation also accepts `store_id` in the body; when present, it overrides the request context and selects the target store.

Request body:

```json
{
  "store_id": "default_store",
  "brand_name": "My Store",
  "logo_url": "https://example.com/logo.png",
  "support_email": "help@example.com",
  "seo_title": "My Store",
  "seo_description": "Store description for SEO",
  "metadata": {}
}
```

Current caveat: `body.store_id` overrides the request context. Keep this visible in tests until access control rules are added.

### Products

#### `POST /admin/products/draft`

Creates a draft product for the current store. The body may include `store_id`; if omitted, the current store context is used.

If `platform_product_id` is provided, it must reference an active platform product. When `supplier_product_id` or `cost` is omitted, the draft inherits those values from the platform product.

If `category_ids` are provided, they must belong to the selected product store.

Request body:

```json
{
  "store_id": "default_store",
  "platform_product_id": "pp_tshirt",
  "title": "Summer Beach T-shirt",
  "description": "A clean summer beach inspired t-shirt.",
  "price": 29.99,
  "cost": 8.5,
  "supplier_product_id": "sp_tshirt",
  "supplier_id": "sup_citigoo_mock",
  "supplier_variant_id": "spv_tshirt_black_m",
  "medusa_product_id": "prod_medusa_123",
  "medusa_variant_id": "variant_medusa_123",
  "source": "manual",
  "image_url": "https://cdn.example.com/product.png",
  "design_image_url": "https://cdn.example.com/design.png",
  "mockup_image_url": "https://cdn.example.com/mockup.png",
  "print_file_url": "https://cdn.example.com/print-file.png",
  "tags": ["summer", "beach", "t-shirt"],
  "category_ids": ["cat_123"],
  "variants": [],
  "metadata": {}
}
```

Required fields:

- `title`
- `price`

AI-generated product draft example:

```json
{
  "title": "Summer Beach T-shirt",
  "description": "A clean summer beach inspired t-shirt.",
  "price": 29.99,
  "source": "ai",
  "ai_job_id": "job_123",
  "prompt": "Generate a summer beach style t-shirt",
  "design_image_url": "https://cdn.example.com/design.png",
  "tags": ["summer", "beach"],
  "category_ids": ["cat_123"],
  "variants": []
}
```

Errors:

- `STORE_NOT_FOUND` if the selected store does not exist.
- `VALIDATION_ERROR` if required fields are missing or numeric fields are invalid.
- `VALIDATION_ERROR` if `category_ids` do not belong to the selected store.
- `VALIDATION_ERROR` if `platform_product_id` does not reference an active platform product.

Current caveat: the body may include `store_id`, which can override the request context. Keep this visible in tests until access control rules are added.

Response:

```json
{
  "product_id": "prod_123",
  "store_id": "default_store",
  "status": "draft",
  "product": {
    "product_id": "prod_123",
    "store_id": "default_store",
    "platform_product_id": "pp_tshirt",
    "supplier_product_id": "sp_tshirt",
    "supplier_id": "sup_citigoo_mock",
    "supplier_variant_id": "spv_tshirt_black_m",
    "medusa_product_id": "prod_medusa_123",
    "medusa_variant_id": "variant_medusa_123",
    "is_cart_addable": false,
    "title": "Summer Beach T-shirt",
    "status": "draft",
    "source": "manual",
    "category_ids": ["cat_123"],
    "tags": ["summer", "beach", "t-shirt"],
    "price": 29.99,
    "cost": 8.5,
    "design_image_url": "https://cdn.example.com/design.png",
    "mockup_image_url": "https://cdn.example.com/mockup.png",
    "print_file_url": "https://cdn.example.com/print-file.png",
    "variants": [],
    "metadata": {}
  }
}
```

#### `POST /admin/products/:product_id/publish`

Publishes a draft product. The product must belong to the current store.

Response:

```json
{
  "product_id": "prod_123",
  "store_id": "default_store",
  "status": "published",
  "product": {}
}
```

### Platform Products

Platform products are global base products provided by the platform. They are not bound to a store. Store products may reference them through `platform_product_id`.

Relationship:

- `mc_platform_product.id` -> `mc_product.platform_product_id`
- One platform product can be used by many store products.
- Store products still require `store_id`.

#### `GET /admin/platform-products`

Lists active platform products.

Response:

```json
{
  "count": 6,
  "platform_products": [
    {
      "platform_product_id": "pp_tshirt",
      "title": "T-shirt",
      "category": "Apparel",
      "description": "Classic printable cotton t-shirt.",
      "base_cost": 8.5,
      "supplier": "default_supplier",
      "supplier_product_id": "sp_tshirt",
      "available_colors": ["white", "black", "navy"],
      "available_sizes": ["S", "M", "L", "XL"],
      "print_area": {
        "front": "12x16in"
      },
      "status": "active"
    }
  ]
}
```

### Supplier Products

Supplier products expose the Phase 2A product foundation for AI generation: supplier product, color/size SKU variants, print specs, and platform design templates.

#### `GET /admin/supplier-products`

Lists active supplier products. Optional query: `platform_product_id=pp_tshirt`.

#### `GET /store/supplier-products`

Lists active supplier products for storefront/AI generation selection. Optional query: `platform_product_id=pp_tshirt`.

Response shape:

```json
{
  "count": 1,
  "supplier_products": [
    {
      "supplier_product_id": "sp_tshirt",
      "supplier_id": "sup_citigoo_mock",
      "external_supplier_product_id": "mock_tshirt_001",
      "platform_product_id": "pp_tshirt",
      "name": "Mock Cotton T-shirt",
      "category": "apparel",
      "base_cost": 8.5,
      "currency": "usd",
      "status": "active",
      "variants": [
        {
          "supplier_variant_id": "spv_tshirt_black_m",
          "external_supplier_variant_id": "mock_tshirt_black_m",
          "color": "black",
          "size": "M",
          "sku": "MOCK-TSHIRT-BLACK-M",
          "cost": 8.5,
          "stock_status": "in_stock"
        }
      ],
      "print_specs": [
        {
          "print_spec_id": "sps_tshirt_front_png",
          "print_position": "front",
          "print_file_width": 4500,
          "print_file_height": 5400,
          "dpi": 300,
          "accepted_formats": ["png"]
        }
      ],
      "design_templates": [
        {
          "template_id": "pdt_tshirt_front",
          "platform_product_id": "pp_tshirt",
          "name": "T-shirt Front Print"
        }
      ]
    }
  ]
}
```

### AI Product Generation (Phase 2A)

Python service: `apps/ai-worker` (default `http://localhost:8001`).

#### `POST /ai/generate-product` (AI Worker)

Generates design image, print file, mockup, title, description, tags, SEO, and price suggestion.

Request:

```json
{
  "prompt": "minimal geometric cat",
  "platform_product_id": "pp_tshirt",
  "supplier_product_id": "sp_tshirt",
  "supplier_variant_id": "spv_tshirt_black_m",
  "print_position": "front"
}
```

Response includes: `ai_job_id`, `design_image_url`, `print_file_url`, `mockup_image_url`, `title`, `description`, `tags`, `seo`, `price_suggestion`.

Environment: `FAL_KEY`, `DEEPSEEK_API_KEY`, or `AI_WORKER_MOCK_GENERATION=true` for local mock.

#### `POST /admin/ai/generate-and-draft` (Medusa)

Calls AI Worker then creates `mc_product` draft with `source: "ai"`.

Required headers:

```http
Authorization: Bearer <ADMIN_TOKEN>
X-Store-Id: default_store
```

Request body:

```json
{
  "prompt": "minimal geometric cat",
  "platform_product_id": "pp_tshirt",
  "supplier_product_id": "sp_tshirt",
  "supplier_variant_id": "spv_tshirt_black_m",
  "print_position": "front"
}
```

Cart line items created via `POST /store/carts/:id/line-items` copy production fields into `line_item.metadata`:

- `supplier_id`, `supplier_product_id`, `supplier_variant_id`
- `print_file_url`, `print_position`, `color`, `size`

### Product Categories

#### `POST /admin/product-categories`

Creates a product category for the current store.

Required headers:

```http
Authorization: Bearer <ADMIN_TOKEN>
```

Store context behavior:

- Uses the resolved current store.
- Validates that the store exists.
- Creates the category with `store_id` set to the resolved store.

Request body:

```json
{
  "name": "T-Shirts",
  "description": "All t-shirt products"
}
```

Notes:

- `name` is required.
- `description` is optional.
- `slug` is generated from `name`.
- `sort_order` defaults to `0` and is not accepted in the create request yet.
- Category slugs must be unique within the current store.
- `parent_id` is supported by the route, but local smoke tests should use `name` and `description` only. When provided, `parent_id` must belong to the current store.

Response:

```json
{
  "category_id": "cat_123",
  "store_id": "default_store",
  "category": {
    "category_id": "cat_123",
    "store_id": "default_store",
    "name": "T-Shirts",
    "slug": "t-shirts",
    "description": "All t-shirt products",
    "parent_id": null,
    "sort_order": 0
  }
}
```

Errors:

- `STORE_NOT_FOUND` if the resolved store does not exist.
- `VALIDATION_ERROR` if `name` is missing.
- `VALIDATION_ERROR` if the generated slug already exists in the current store.
- `VALIDATION_ERROR` if `parent_id` does not belong to the current store.

#### `GET /admin/product-categories`

Lists product categories for the current store.

Required headers:

```http
Authorization: Bearer <ADMIN_TOKEN>
```

Store context behavior:

- Uses the resolved current store.
- Returns only categories with matching `store_id`.
- Orders by `sort_order` ascending.

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
      "sort_order": 0
    }
  ]
}
```

## Storefront APIs

### `GET /store/products`

Lists published products for the current store only.

Required headers:

```http
x-publishable-api-key: <publishable_api_key>
```

Example:

```bash
curl -i \
  -H "x-publishable-api-key: <publishable_api_key>" \
  -H "X-Store-Id: test_store" \
  http://localhost:9000/store/products
```

Response products include the Phase 1 cart bridge fields:

```json
{
  "product_id": "prod_123",
  "store_id": "test_store",
  "status": "published",
  "medusa_product_id": "prod_01HV_NATIVE",
  "medusa_variant_id": "variant_01HV_NATIVE",
  "is_cart_addable": true
}
```

`is_cart_addable` is `true` only when the store-core product is published and has `medusa_variant_id`.

### `GET /store/products/:product_id`

Returns one published product for the current store only.

Required headers:

```http
x-publishable-api-key: <publishable_api_key>
```

Example:

```bash
curl -i \
  -H "x-publishable-api-key: <publishable_api_key>" \
  -H "X-Store-Id: test_store" \
  http://localhost:9000/store/products/prod_123
```

The `product` response uses the same store-core shape as the list route and includes `medusa_product_id`, `medusa_variant_id`, and `is_cart_addable`.

Product list and detail responses also include review summary fields:

```json
{
  "average_rating": 4.8,
  "review_count": 14
}
```

When a product has no published reviews, `average_rating` is `null` and `review_count` is `0`.

### `GET /store/products/:product_id/reviews`

Returns published reviews and the five-star rating summary for a published product in the current store.

Required headers:

```http
x-publishable-api-key: <publishable_api_key>
```

Optional query:

- `limit`: default `20`, max `100`

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
      "content": "Good print quality and fits as expected.",
      "status": "published",
      "metadata": {},
      "created_at": "2026-06-01T00:00:00.000Z"
    }
  ]
}
```

### `POST /store/products/:product_id/reviews`

Creates a published product review after verifying the buyer purchased the product.

The buyer must provide the same email and order number used for the order. The order must belong to the current store, and one of its line items must contain `metadata.mc_product_id` matching `product_id`.

Required headers:

```http
x-publishable-api-key: <publishable_api_key>
```

Request body:

```json
{
  "email": "buyer@example.com",
  "order_number": 1001,
  "rating": 5,
  "title": "Great shirt",
  "content": "Good print quality and fits as expected.",
  "customer_name": "Jane"
}
```

Rules:

- `rating` must be an integer from `1` to `5`; five stars is the maximum score.
- Half-star submissions are not accepted.
- Each order can review the same product once.
- Reviews are published immediately.

Errors:

- `PRODUCT_NOT_FOUND` if the product does not exist, is not published, or belongs to a different store.
- `VALIDATION_ERROR` if the request body is invalid.
- `REVIEW_NOT_ALLOWED` if the order cannot be verified, did not buy the product, or already reviewed it.

### `GET /store/products/:product_id/share`

Returns share links and share text for a published product. This endpoint does **not** call any third-party social APIs — all URLs are constructed server-side using platform share-intent URL formats.

Required headers:

```http
x-publishable-api-key: <publishable_api_key>
```

Optional headers:

```http
X-Store-Id: default_store
```

Example:

```bash
curl -i \
  -H "x-publishable-api-key: <publishable_api_key>" \
  -H "X-Store-Id: default_store" \
  http://localhost:9000/store/products/prod_xxx/share
```

Response `200`:

```json
{
  "product_id": "prod_xxx",
  "store_id": "default_store",
  "title": "Cool T-Shirt",
  "description": "A clean summer beach inspired t-shirt.",
  "image_url": "https://cdn.example.com/product.png",
  "product_url": "https://citigoo.app/products/prod_xxx",
  "share_text": "Cool T-Shirt https://citigoo.app/products/prod_xxx",
  "channels": {
    "facebook": {
      "enabled": true,
      "type": "web_share_url",
      "url": "https://www.facebook.com/sharer/sharer.php?u=..."
    },
    "x": {
      "enabled": true,
      "type": "web_share_url",
      "url": "https://x.com/intent/post?url=...&text=..."
    },
    "pinterest": {
      "enabled": true,
      "type": "web_share_url",
      "url": "https://pinterest.com/pin/create/button/?url=...&description=...&media=..."
    },
    "whatsapp": {
      "enabled": true,
      "type": "web_share_url",
      "url": "https://wa.me/?text=..."
    },
    "telegram": {
      "enabled": true,
      "type": "web_share_url",
      "url": "https://t.me/share/url?url=...&text=..."
    },
    "email": {
      "enabled": true,
      "type": "mailto",
      "url": "mailto:?subject=...&body=..."
    },
    "copy_link": {
      "enabled": true,
      "type": "copy",
      "value": "https://citigoo.app/products/prod_xxx"
    },
    "instagram": {
      "enabled": true,
      "type": "copy_then_open",
      "value": "https://citigoo.app/products/prod_xxx",
      "message": "Instagram does not support direct web sharing. Copy link and open Instagram."
    },
    "tiktok": {
      "enabled": true,
      "type": "copy_then_open",
      "value": "https://citigoo.app/products/prod_xxx",
      "message": "TikTok does not support direct web sharing. Copy link and open TikTok."
    }
  }
}
```

**Channel types**:

| Type | Channels | Frontend behavior |
|---|---|---|
| `web_share_url` | facebook, x, pinterest, whatsapp, telegram | Open `url` in a new window or share sheet |
| `mailto` | email | Open `url` as mailto link |
| `copy` | copy_link | Call `navigator.clipboard.writeText(value)` |
| `copy_then_open` | instagram, tiktok | Show `message`, copy `value` to clipboard, let user open the app |

**Image URL priority**: `image_url` > `mockup_image_url` > `design_image_url`

**Product URL**: Constructed from `STOREFRONT_BASE_URL` env var (fallback: `http://localhost:3000`) + `/products/{product_id}`

Errors:

- `PRODUCT_NOT_FOUND` if the product does not exist, is not published, or belongs to a different store.

### `POST /store/carts/:id/line-items`

Adds a native Medusa variant to a cart.

Request body:

```json
{
  "variant_id": "variant_01HV_NATIVE",
  "quantity": 1
}
```

Phase 1 product-to-cart bridge behavior:

- Frontend must read `medusa_variant_id` from `/store/products` or `/store/products/:product_id` and send it as `variant_id`.
- `product_id` and `mc_product.id` are not supported add-to-cart inputs.
- The backend reverse-checks `mc_product.medusa_variant_id == variant_id`.
- The linked `mc_product` must be published and belong to the cart store.
- Cross-store variant adds return `CART_STORE_MISMATCH`.
- Products without `medusa_variant_id` return `is_cart_addable: false` and should not show an enabled add-to-cart action.

### `GET /store/settings`

Returns public store settings for the current store.

Required headers:

```http
x-publishable-api-key: <publishable_api_key>
```

Example:

```bash
curl -i \
  -H "x-publishable-api-key: <publishable_api_key>" \
  -H "X-Store-Id: test_store" \
  http://localhost:9000/store/settings
```

### `GET /store/product-categories`

Lists product categories for the current store.

Required headers:

```http
x-publishable-api-key: <publishable_api_key>
```

Store context behavior:

- Uses the resolved current store.
- Returns only categories with matching `store_id`.
- Orders by `sort_order` ascending.

Example:

```bash
curl -i \
  -H "x-publishable-api-key: <publishable_api_key>" \
  -H "X-Store-Id: test_store" \
  http://localhost:9000/store/product-categories
```

High-level response:

```json
{
  "store_id": "test_store",
  "count": 1,
  "categories": [
    {
      "category_id": "cat_123",
      "store_id": "test_store",
      "name": "T-Shirts",
      "slug": "t-shirts",
      "description": "All t-shirt products",
      "parent_id": null,
      "sort_order": 0
    }
  ]
}
```

### `GET /store/platform-products`

Lists active platform products available for product creation and AI product generation.

## Error Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "title is required"
  }
}
```

Common error codes:

- `STORE_NOT_FOUND`
- `PRODUCT_NOT_FOUND`
- `PRODUCT_STORE_MISMATCH`
- `VALIDATION_ERROR`

## Store Isolation Checks

Default store request:

```powershell
curl.exe -H "x-publishable-api-key: <publishable_api_key>" http://localhost:9000/store/products
```

Specific store request:

```powershell
curl.exe -H "x-publishable-api-key: <publishable_api_key>" -H "X-Store-Id: test_store" http://localhost:9000/store/products
```

Expected behavior: each request only returns products and categories for the resolved store.

Category isolation checks:

- Product draft `category_ids` must belong to the current store.
- Category `parent_id` must belong to the current store.
- Storefront routes require `x-publishable-api-key`. The seed script currently creates stores and platform products, but does not create a publishable API key.
