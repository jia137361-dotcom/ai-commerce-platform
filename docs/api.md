# AI Commerce Platform API Reference

Base URL: `http://localhost:9000`

This document covers the current Development 1 scope: store-aware products, product categories, and store settings.

## Store Context

All APIs resolve the active store through `resolveCurrentStore(req)`.

Resolution priority:

1. `X-Store-Id` request header
2. Host/domain mapping
3. `DEFAULT_STORE_ID`, defaulting to `default_store`

Debug endpoint:

```http
GET /store-context
```

## Admin APIs

### Store Settings

#### `GET /admin/store-settings`

Returns settings for the current store.

#### `PUT /admin/store-settings`

Creates or updates settings for the current store.

Request body:

```json
{
  "brand_name": "My Store",
  "logo_url": "https://example.com/logo.png",
  "support_email": "help@example.com",
  "seo_title": "My Store",
  "seo_description": "Store description for SEO",
  "metadata": {}
}
```

### Products

#### `POST /admin/products/draft`

Creates a draft product for the current store. The body may include `store_id`; if omitted, the current store context is used.

Request body:

```json
{
  "title": "Summer Beach T-shirt",
  "description": "A clean summer beach inspired t-shirt.",
  "price": 29.99,
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

Response:

```json
{
  "product_id": "prod_123",
  "store_id": "default_store",
  "status": "draft",
  "product": {
    "product_id": "prod_123",
    "store_id": "default_store",
    "title": "Summer Beach T-shirt",
    "status": "draft",
    "source": "manual",
    "category_ids": ["cat_123"],
    "tags": ["summer", "beach", "t-shirt"],
    "price": 29.99,
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

### Product Categories

#### `POST /admin/product-categories`

Creates a product category for the current store.

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

#### `GET /admin/product-categories`

Lists product categories for the current store.

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

### `GET /store/products/:product_id`

Returns one published product for the current store only.

### `GET /store/settings`

Returns public store settings for the current store.

### `GET /store/product-categories`

Lists product categories for the current store.

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
curl.exe http://localhost:9000/store/products
```

Specific store request:

```powershell
curl.exe -H "X-Store-Id: test_store" http://localhost:9000/store/products
```

Expected behavior: each request only returns products and categories for the resolved store.
