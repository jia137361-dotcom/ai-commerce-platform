# Phase 1 / Phase 2A Schema

This document describes the current Phase 1 and Phase 2A store-core schemas and one future input schema for AI-created product drafts.

## Store

Model: `mc_store`

Purpose: represents a merchant store.

Fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | text | Primary key. Phase 1 seeded ids include `default_store` and `test_store`. |
| `owner_user_id` | text, nullable | Reserved for ownership. |
| `name` | text | Store display name. |
| `slug` | text | Store slug. |
| `logo_url` | text, nullable | Store logo. |
| `banner_url` | text, nullable | Store banner. |
| `description` | text, nullable | Store description. |
| `seo_title` | text, nullable | SEO title. |
| `seo_description` | text, nullable | SEO description. |
| `status` | enum | `draft`, `active`, `suspended`, `archived`; defaults to `active`. |
| `stripe_account_id` | text, nullable | Reserved for future Stripe Connect. |

## StoreMember

Model: `store_member`

Purpose: reserved Phase 1 membership model for future access control.

Fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | text | Primary key. |
| `store_id` | text | Store identifier. |
| `user_id` | text | User identifier. |
| `role` | enum | `owner`, `admin`, `designer`, `operator`, `viewer`; defaults to `owner`. |

Current caveat: complex RBAC is not implemented yet.

## DomainBinding

Model: `domain_binding`

Purpose: reserved model for future custom domain to store lookup.

Fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | text | Primary key. |
| `store_id` | text | Store identifier. |
| `domain` | text | Custom domain. |
| `status` | enum | `pending`, `verified`, `active`, `failed`; defaults to `pending`. |
| `ssl_status` | text, nullable | Future SSL provisioning state. |
| `verified_at` | datetime, nullable | Domain verification time. |

Current caveat: request host lookup against this model is not implemented.

## StoreSetting

Model: `store_setting`

Purpose: store-specific branding, support, SEO, and metadata settings.

Fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | text | Primary key. |
| `store_id` | text | Store identifier. |
| `brand_name` | text, nullable | Brand name. |
| `logo_url` | text, nullable | Logo URL. |
| `support_email` | text, nullable | Customer support email. |
| `seo_title` | text, nullable | SEO title. |
| `seo_description` | text, nullable | SEO description. |
| `metadata` | json, nullable | Flexible store settings metadata. |

Current caveat: there is no documented unique constraint for one settings row per store. Current APIs use the first matching row.

## Product

Model: `mc_product`

Purpose: store-owned product record used by Phase 1 draft and storefront product APIs.

Fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | text | Primary key with `prod` prefix. |
| `store_id` | text | Store identifier. |
| `title` | text | Required product title. |
| `description` | text, nullable | Product description. |
| `status` | enum | `draft`, `published`, `unpublished`, `archived`; defaults to `draft`. |
| `source` | enum | `manual`, `ai`; defaults to `manual`. |
| `ai_job_id` | text, nullable | Future AI generation job id. |
| `prompt` | text, nullable | AI prompt or generation context. |
| `platform_product_id` | text, nullable | Optional reference to a global platform product. |
| `supplier_product_id` | text, nullable | Supplier product id, either provided directly or inherited from a platform product. |
| `supplier_id` | text, nullable | Supplier id for Phase 2A AI/supplier-generated products. |
| `supplier_variant_id` | text, nullable | Supplier product variant selected for production. |
| `medusa_product_id` | text, nullable | Explicit bridge to a native Medusa product. |
| `medusa_variant_id` | text, nullable | Explicit bridge to the native Medusa variant used for cart line items. |
| `design_image_url` | text, nullable | Design image URL. |
| `mockup_image_url` | text, nullable | AI Worker mockup image URL. |
| `print_file_url` | text, nullable | Production print file URL. |
| `image_url` | text, nullable | Product image URL. |
| `tags` | text array, nullable | Product tags. |
| `price` | float, nullable | Phase 1 simple price. |
| `cost` | float, nullable | Product cost, either provided directly or inherited from a platform product. |
| `variants` | json, nullable | Future or simple variant payload. |
| `category_ids` | text array, nullable | Product category ids assigned to the product. |
| `metadata` | json, nullable | Flexible product metadata. |

API-derived fields:

| Field | Type | Notes |
| --- | --- | --- |
| `is_cart_addable` | boolean | Computed in API responses. True only when `status` is `published` and `medusa_variant_id` is present. Not a database column. |

Indexes currently include `store_id` and `store_id/status` for store-aware queries.

Category caveats:

- `category_ids` are currently stored as an array on `Product`, not as a relational join table.
- Draft product creation currently validates that provided `category_ids` belong to the selected product store.
- Keep a regression test for cross-store category ids so future changes do not weaken this isolation.
- Products without `medusa_variant_id` are catalog-visible after publish, but are not cart-addable.
- Cart line items use native Medusa `variant_id`, sourced from `mc_product.medusa_variant_id`.

Phase 2A product metadata:

- AI-generated products use `source: "ai"` and preserve `ai_job_id`, `prompt`, supplier ids, design/mockup/print URLs, and print metadata.
- Cart line-item metadata is derived from the published `mc_product` linked by `medusa_variant_id`.
- Required line-item production metadata includes `supplier_id`, `supplier_product_id`, `supplier_variant_id`, `print_file_url`, `print_position`, `color`, and `size`.

## Supplier

Model: `mc_supplier`

Purpose: Phase 2A supplier identity used by supplier products.

Fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | text | Primary key with `sup` prefix. Seed includes `sup_citigoo_mock`. |
| `code` | text | Supplier code. Seed uses `citigoo_mock`. |
| `name` | text | Supplier display name. |
| `country` | text, nullable | Supplier country. |
| `status` | enum | `active`, `inactive`, `archived`; defaults to `active`. |
| `raw_json` | json, nullable | Supplier source payload or mock metadata. |

## SupplierProduct


> API mapping note: The API response exposes the Store Core model `id` as `supplier_product_id`. The database field `supplier_product_id` is exposed as `external_supplier_product_id`.

Model: `mc_supplier_product`

Purpose: printable supplier catalog product mapped to a platform product.

Fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | text | Primary key with `sp` prefix. Seed includes `sp_tshirt`. |
| `supplier_id` | text | Supplier id, e.g. `sup_citigoo_mock`. |
| `supplier_product_id` | text | External supplier product id, e.g. `mock_tshirt_001`. |
| `platform_product_id` | text | Platform product id, e.g. `pp_tshirt`. |
| `name` | text | Supplier product name. |
| `category` | text | Supplier category. |
| `base_cost` | float | Base cost. |
| `currency` | text | Cost currency; defaults to `usd`. |
| `status` | enum | `active`, `inactive`, `archived`; defaults to `active`. |
| `raw_json` | json, nullable | Supplier source payload or mock metadata. |

## SupplierProductVariant


> API mapping note: The API response exposes the Store Core model `id` as `supplier_variant_id`. The database field `supplier_variant_id` is exposed as `external_supplier_variant_id`.

Model: `mc_supplier_product_variant`

Purpose: supplier color/size SKU variant used for production metadata.

Fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | text | Primary key with `spv` prefix. Seed includes `spv_tshirt_black_m`. |
| `supplier_product_id` | text | Supplier product id, e.g. `sp_tshirt`. |
| `supplier_variant_id` | text | External supplier variant id. |
| `color` | text, nullable | Seed includes `black` and `white`. |
| `size` | text, nullable | Seed includes `S`, `M`, `L`, and `XL`. |
| `sku` | text | Supplier SKU. |
| `cost` | float | Variant cost. |
| `stock_status` | enum | `in_stock`, `out_of_stock`, `unknown`; defaults to `in_stock`. |
| `raw_json` | json, nullable | Supplier variant payload or mock metadata. |

## SupplierPrintSpec

Model: `mc_supplier_print_spec`

Purpose: supplier print-file requirements for a supplier product or variant.

Fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | text | Primary key with `sps` prefix. Seed includes `sps_tshirt_front_png`. |
| `supplier_product_id` | text | Supplier product id. |
| `supplier_variant_id` | text, nullable | Optional supplier variant id. |
| `print_position` | text | Seed uses `front`. |
| `print_file_width` | number | Seed uses `4500`. |
| `print_file_height` | number | Seed uses `5400`. |
| `dpi` | number | Seed uses `300`. |
| `accepted_formats` | text array, nullable | Seed accepts `png`. |
| `background_required` | boolean | Defaults to `false`. |
| `safe_margin` | number, nullable | Optional safe margin. |
| `bleed` | number, nullable | Optional bleed. |
| `color_mode` | text | Defaults to `RGB`. |
| `status` | enum | `active`, `inactive`, `archived`; defaults to `active`. |

## PlatformDesignTemplate

Model: `mc_platform_design_template`

Purpose: design canvas/template information for a platform product.

Fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | text | Primary key with `pdt` prefix. Seed includes `pdt_tshirt_front`. |
| `platform_product_id` | text | Platform product id, e.g. `pp_tshirt`. |
| `name` | text | Template name. |
| `canvas_width` | number | Template canvas width. |
| `canvas_height` | number | Template canvas height. |
| `design_area_x` | number | Design area X offset. |
| `design_area_y` | number | Design area Y offset. |
| `design_area_width` | number | Design area width. |
| `design_area_height` | number | Design area height. |
| `preview_background_url` | text, nullable | Preview/mockup background URL. |
| `status` | enum | `active`, `inactive`, `archived`; defaults to `active`. |

## ProductCategory

Model: `mc_product_category`

Purpose: store-owned category records used to organize store products.

Fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | text | Primary key with `cat` prefix. |
| `store_id` | text | Store identifier. |
| `name` | text | Category display name. |
| `slug` | text | Generated from `name` by the current create route. |
| `description` | text, nullable | Category description. |
| `parent_id` | text, nullable | Optional parent category id. Current create route validates the parent belongs to the same store. |
| `sort_order` | number | Sort order; defaults to `0`. |

Timestamp note: `created_at` and `updated_at` are not declared in the source model definition. They are framework-managed fields to verify through generated migrations and API responses.

Current API behavior:

- Category slugs must be unique within the current store.
- `sort_order` is not accepted by the current create request.
- Storefront and admin category lists are scoped by the resolved `store_id`.

## Future GeneratedProductDraftInput

This schema is not implemented as a runtime contract yet. It documents the expected input shape for future AI-created product drafts.

```ts
type GeneratedProductDraftInput = {
  store_id?: string
  platform_product_id?: string | null
  title: string
  description?: string | null
  image_url?: string | null
  design_image_url?: string | null
  tags?: string[]
  category_ids?: string[]
  price?: number | string | null
  cost?: number | string | null
  supplier_product_id?: string | null
  variants?: unknown[]
  source: "ai"
  ai_job_id?: string | null
  prompt?: string | null
  metadata?: Record<string, unknown>
}
```

Expected behavior:

- Default to the resolved request store if `store_id` is omitted.
- Validate that the target store exists before creating a draft.
- Create products with `status: "draft"` and `source: "ai"`.
- Preserve enough metadata to trace the generated draft back to the AI job and prompt.
- Revisit whether `store_id` may be supplied in the body once store access control is implemented.
