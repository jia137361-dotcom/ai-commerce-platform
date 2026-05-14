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
  "supplier_product_id": "supplier_tshirt",
  "source": "manual",
  "image_url": "https://cdn.example.com/product.png",
  "design_image_url": "https://cdn.example.com/design.png",
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
    "supplier_product_id": "supplier_tshirt",
    "title": "Summer Beach T-shirt",
    "status": "draft",
    "source": "manual",
    "category_ids": ["cat_123"],
    "tags": ["summer", "beach", "t-shirt"],
    "price": 29.99,
    "cost": 8.5,
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
      "supplier_product_id": "supplier_tshirt",
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

### Product Categories

#### `POST /admin/product-categories`

Creates a product category for the current store.

Store context behavior:

- Uses the resolved current store.
- Validates that the store exists.
- Creates the category with `store_id` set to the resolved store.

Request body:

```json
{
  "name": "T-Shirts",
  "description": "All t-shirt products",
  "parent_id": null
}
```

Notes:

- `name` is required.
- `slug` is generated from `name`.
- `sort_order` defaults to `0` and is not accepted in the create request yet.
- Category slugs must be unique within the current store.
- `parent_id`, when provided, must belong to the current store.

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
