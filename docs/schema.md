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
| `s2b_basic_product_id` | text, nullable | S2BDIY basic product id used for real supplier fulfillment. |
| `s2b_material_id` | text, nullable | S2BDIY uploaded material id. |
| `s2b_designed_product_id` | text, nullable | S2BDIY quickCreate product id. Required by current publish route when S2BDIY is configured. |
| `s2b_mockup_image_url` | text, nullable | S2BDIY product detail/mockup image URL. |
| `s2b_size_id` | text, nullable | S2BDIY size id used for supplier order items. |
| `s2b_color_id` | text, nullable | S2BDIY color id used for supplier order items. |
| `s2b_view_id` | text, nullable | S2BDIY print view id. |
| `s2b_design_type` | number, nullable | S2BDIY design type used during quickCreate. |
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

Phase 2B supplier metadata:

- S2BDIY provisioning stores uploaded material, quickCreate product, mockup, size/color/view, and design type fields on `mc_product`.
- When S2BDIY env is configured, the current publish route requires `s2b_designed_product_id` before publishing.
- Supplier order push reads `s2b_designed_product_id`, `s2b_basic_product_id`, `s2b_size_id`, and `s2b_color_id` from the linked product.

## ProductAsset

Model: `mc_product_asset`

Purpose: records AI/design/print/supplier assets associated with a store product.

Fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | text | Primary key with `pa` prefix. |
| `store_id` | text | Store identifier. |
| `product_id` | text | Store-core product id. |
| `ai_job_id` | text, nullable | AI Worker job id when the asset came from generation. |
| `supplier_id` | text, nullable | Supplier id, e.g. `sup_s2bdiy`. |
| `supplier_material_id` | text, nullable | Supplier material id from uploadMaterial. |
| `supplier_material_name` | text, nullable | Supplier material display name. |
| `supplier_material_url` | text, nullable | Supplier-hosted material URL if returned. |
| `asset_type` | enum | `design`, `print_file`, `supplier_material`, `supplier_mockup`. |
| `url` | text, nullable | Asset URL. |
| `file_format` | text, nullable | File format, e.g. `png`. |
| `width` | number, nullable | Asset width. |
| `height` | number, nullable | Asset height. |
| `dpi` | number, nullable | Print DPI. |
| `view_id` | text, nullable | Supplier print view id. |
| `design_type` | number, nullable | Supplier design type. |
| `metadata_json` | json, nullable | Raw or extended asset metadata. |

## SupplierOrder

Model: `mc_supplier_order`

Purpose: local record of a supplier fulfillment order pushed to S2BDIY.

Fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | text | Primary key with `so` prefix. |
| `store_id` | text | Store identifier. |
| `order_id` | text | Native Medusa order id. |
| `supplier_id` | text | Supplier id, currently `sup_s2bdiy` for S2BDIY flow. |
| `supplier_order_id` | text, nullable | S2BDIY order id returned by create order. |
| `third_order_id` | text | Idempotency/order reference sent to supplier. |
| `platform` | number | S2BDIY platform id; defaults to `99`. |
| `logistics_id` | text, nullable | Selected logistics platform id. |
| `logistics_name` | text, nullable | Selected logistics name. |
| `product_amount` | float, nullable | Supplier product amount from order detail. |
| `shipping_amount` | float, nullable | Supplier shipping amount from order detail. |
| `total_amount` | float, nullable | Supplier total amount from order detail. |
| `supplier_status` | text | Internal supplier status; defaults to `not_pushed`. |
| `supplier_status_text` | text, nullable | Supplier status display text from order detail. |
| `supplier_pay_status` | text | Internal supplier pay status; defaults to `payment_pending`. |
| `supplier_pay_status_text` | text, nullable | Supplier pay status display text from order detail. |
| `tracking_number` | text, nullable | Tracking number from supplier order detail. |
| `tracking_url` | text, nullable | Tracking URL if available. |
| `waybill_url` | text, nullable | Waybill URL if available. |
| `raw_request_json` | json, nullable | Supplier create-order request payload. |
| `raw_response_json` | json, nullable | Supplier response or error payload. |
| `last_synced_at` | datetime, nullable | Last supplier order polling timestamp. |
| `error_message` | text, nullable | Last supplier push/pay/sync error. |
| `pay_retry_count` | number | Supplier payment retry count; defaults to `0`. |

Status mapping:

- Supplier order status values: `not_pushed`, `created`, `payment_pending`, `paid`, `reviewing`, `queued`, `in_production`, `shipped`, `cancelled`, `failed`.
- Supplier pay status values: `payment_pending`, `paying`, `paid`, `pay_failed`.
- Terminal supplier order statuses are `shipped`, `cancelled`, and `failed`.

## SupplierOrderItem

Model: `mc_supplier_order_item`

Purpose: local item-level record for a supplier order.

Fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | text | Primary key with `soi` prefix. |
| `supplier_order_id` | text | Local `mc_supplier_order.id`. |
| `order_item_id` | text, nullable | Native Medusa order item id. |
| `third_item_id` | text, nullable | Supplier/client item reference if used. |
| `basic_product_id` | text, nullable | S2BDIY basic product id. |
| `supplier_product_id` | text, nullable | Supplier product id. |
| `supplier_product_name` | text, nullable | Supplier product name. |
| `supplier_size_id` | text, nullable | S2BDIY size id. |
| `supplier_color_id` | text, nullable | S2BDIY color id. |
| `supplier_size_name` | text, nullable | Supplier size label. |
| `supplier_color_name` | text, nullable | Supplier color label. |
| `show_image` | text, nullable | Supplier show/mockup image. |
| `quantity` | number | Quantity; defaults to `1`. |
| `product_amount` | float, nullable | Supplier product amount. |
| `total_amount` | float, nullable | Supplier item total. |
| `total_weight` | float, nullable | Supplier item total weight. |
| `raw_json` | json, nullable | Raw supplier item payload. |

## Supplier

Model: `mc_supplier`

Purpose: Phase 2A supplier identity used by supplier products.

Fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | text | Primary key with `sup` prefix. Seed includes `sup_citigoo_mock` and `sup_s2bdiy`. |
| `code` | text | Supplier code. Seed uses `citigoo_mock` and `s2bdiy`. |
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
| `basic_product_id` | text, nullable | S2BDIY basic product id for synced supplier catalog rows. |
| `basic_product_code` | text, nullable | S2BDIY basic product code. |
| `basic_product_name` | text, nullable | S2BDIY basic product name. |
| `basic_product_en_name` | text, nullable | S2BDIY English basic product name. |
| `name` | text | Supplier product name. |
| `category` | text | Supplier category. |
| `base_cost` | float | Base cost. |
| `purchase_price` | float, nullable | S2BDIY purchase price when synced from basic product detail. |
| `currency` | text | Cost currency; defaults to `usd`. |
| `product_show_master_image` | text, nullable | S2BDIY basic product master image. |
| `supplier_mockup_image_url` | text, nullable | Supplier mockup image URL when available. |
| `produce_country` | text, nullable | Production country. |
| `warehouse_name` | text, nullable | Supplier warehouse name. |
| `deliver_goods_text` | text, nullable | Supplier delivery lead-time text. |
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
| `supplier_size_id` | text, nullable | S2BDIY size id. |
| `supplier_color_id` | text, nullable | S2BDIY color id. |
| `color` | text, nullable | Seed includes `black` and `white`. |
| `size` | text, nullable | Seed includes `S`, `M`, `L`, and `XL`. |
| `sku` | text | Supplier SKU. |
| `cost` | float | Variant cost. |
| `weight` | float, nullable | Supplier item weight. |
| `length` | float, nullable | Supplier package/item length. |
| `width` | float, nullable | Supplier package/item width. |
| `height` | float, nullable | Supplier package/item height. |
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
| `view_id` | text, nullable | S2BDIY print view id. |
| `view_name` | text, nullable | Supplier print view name. |
| `view_en_name` | text, nullable | Supplier print view English name. |
| `design_area_width` | number, nullable | Supplier design area width. |
| `design_area_height` | number, nullable | Supplier design area height. |
| `design_area_unit` | text | Design area unit; defaults to `px`. |
| `design_type` | number, nullable | S2BDIY design type. |
| `tip_level` | text, nullable | Supplier print guidance level if returned. |
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
