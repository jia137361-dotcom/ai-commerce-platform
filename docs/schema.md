# Phase 1 Schema Notes

## Product

Model: `mc_product`

Purpose: store-owned custom product record used by the Phase 1 draft, publish, and storefront product APIs.

Important fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | text | Primary key with `prod` prefix. |
| `store_id` | text | Store identifier used for store isolation. |
| `title` | text | Product title. |
| `description` | text, nullable | Product description. |
| `status` | enum | `draft`, `published`, `unpublished`, `archived`; defaults to `draft`. |
| `platform_product_id` | text, nullable | Optional reference to a global platform product. |
| `supplier_product_id` | text, nullable | Optional supplier product id. |
| `medusa_product_id` | text, nullable | Explicit bridge to a native Medusa product. |
| `medusa_variant_id` | text, nullable | Explicit bridge to a native Medusa variant that can be added to cart. |
| `price` | float, nullable | Simple Phase 1 product price. |
| `variants` | json, nullable | Custom JSON payload; not proof that a native Medusa variant exists. |
| `category_ids` | text array, nullable | Store-core category ids assigned to this product. |
| `metadata` | json, nullable | Flexible metadata. |

Bridge caveats:

- `medusa_product_id` and `medusa_variant_id` are nullable because existing custom products may not have native Medusa counterparts yet.
- `is_cart_addable` is an API response field, not a stored column. It is true only when the custom product is published and has `medusa_variant_id`.
- Do not fake Medusa ids. Bridge ids must refer to real native Medusa records when used.
- `variants` remains custom JSON and should not be passed to cart line-item APIs as if it were a Medusa variant.
- Publish-time validation checks that `medusa_variant_id` exists. If native product or variant metadata contains `store_id`, it must match the current store.
