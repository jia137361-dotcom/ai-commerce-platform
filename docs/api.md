# AI Commerce Platform API Reference

Base URL: `http://localhost:9000`

This document covers the current Development 1 scope: store-aware products, platform products, product categories, and store settings.

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

If `platform_product_id` is provided, it must reference an active platform product. When `supplier_product_id` or `cost` is omitted, the draft inherits those values from the platform product.

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

Lists published products for the current store only. Storefront products expose `medusa_product_id`, `medusa_variant_id`, and `is_cart_addable` for the cart bridge. Buyers add products to cart with `variant_id = medusa_variant_id`, not `product_id` or `mc_product.id`.

### `GET /store/products/:product_id`

Returns one published product for the current store only. `is_cart_addable` is `true` only when the product is published and has `medusa_variant_id`.

### `GET /store/settings`

Returns public store settings for the current store.

### `GET /store/product-categories`

Lists product categories for the current store.

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
curl.exe http://localhost:9000/store/products
```

Specific store request:

```powershell
curl.exe -H "X-Store-Id: test_store" http://localhost:9000/store/products
```

Expected behavior: each request only returns products and categories for the resolved store.

Category isolation checks:

- Product draft `category_ids` must belong to the current store.
- Category `parent_id` must belong to the current store.
