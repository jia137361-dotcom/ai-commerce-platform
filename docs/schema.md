# Phase 1 Schema

This document describes the current Phase 1 store-core schemas and one future input schema for AI-created product drafts.

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
| `design_image_url` | text, nullable | Design image URL. |
| `image_url` | text, nullable | Product image URL. |
| `tags` | text array, nullable | Product tags. |
| `price` | float, nullable | Phase 1 simple price. |
| `variants` | json, nullable | Future or simple variant payload. |
| `metadata` | json, nullable | Flexible product metadata. |

Indexes currently include `store_id` and `store_id/status` for store-aware queries.

## Future GeneratedProductDraftInput

This schema is not implemented as a runtime contract yet. It documents the expected input shape for future AI-created product drafts.

```ts
type GeneratedProductDraftInput = {
  store_id?: string
  title: string
  description?: string | null
  image_url?: string | null
  design_image_url?: string | null
  tags?: string[]
  price?: number | string | null
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
