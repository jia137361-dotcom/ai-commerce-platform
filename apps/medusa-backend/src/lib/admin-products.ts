import type { ProductStatus } from "../api/_helpers/store-core"

export type AdminProductListQuery = {
  status: string
  limit: number
  offset: number
  q?: string
}

const VALID_STATUSES: ProductStatus[] = [
  "draft",
  "published",
  "unpublished",
  "archived",
]

export type AdminProductTabStatus = "all" | ProductStatus | "failed"

export const parseAdminProductListQuery = (query: Record<string, unknown>): AdminProductListQuery => {
  const rawStatus = typeof query.status === "string" ? query.status.trim().toLowerCase() : "all"
  const status = rawStatus === "" ? "all" : rawStatus

  const allowed: AdminProductTabStatus[] = ["all", "failed", ...VALID_STATUSES]
  if (!allowed.includes(status as AdminProductTabStatus)) {
    throw new Error(`status must be one of: ${allowed.join(", ")}`)
  }

  const limit = Math.min(Math.max(Number(query.limit ?? 20) || 20, 1), 100)
  const offset = Math.max(Number(query.offset ?? 0) || 0, 0)
  const q = typeof query.q === "string" && query.q.trim() ? query.q.trim().toLowerCase() : undefined

  return { status, limit, offset, q }
}

export const buildProductListFilters = (
  storeId: string,
  _status: string
): Record<string, unknown> => {
  // Always list by store; status is applied in application code so we avoid ORM /
  // Medusa native `/admin/products?status=` route conflicts.
  return { store_id: storeId }
}

export const applyProductStatusFilter = <
  T extends { status?: string | null; source?: string | null; metadata?: Record<string, unknown> | null },
>(
  products: T[],
  status: string
): T[] => {
  if (status === "all") {
    return products
  }
  if (status === "failed") {
    return products.filter((product) => isProductFailed(product))
  }
  return products.filter((product) => (product.status ?? "").toLowerCase() === status)
}

export const filterProductsByTitle = <T extends { title?: string | null }>(
  products: T[],
  q?: string
): T[] => {
  if (!q) {
    return products
  }
  return products.filter((p) => (p.title ?? "").toLowerCase().includes(q))
}

export const paginateList = <T>(items: T[], offset: number, limit: number) => {
  const slice = items.slice(offset, offset + limit)
  return { items: slice, count: items.length }
}

/** UI "failed" badge: AI source with generation failure metadata */
export const isProductFailed = (product: {
  source?: string | null
  metadata?: Record<string, unknown> | null
}): boolean => {
  const meta = product.metadata ?? {}
  if (meta.generation_failed === true) {
    return true
  }
  if (typeof meta.s2b_provision_error === "string" && meta.s2b_provision_error.length > 0) {
    return true
  }
  return false
}

const DRAFT_EDITABLE_FIELDS = new Set([
  "title",
  "description",
  "price",
  "cost",
  "tags",
  "variants",
  "category_ids",
  "ship_from_country",
  "design_image_url",
  "mockup_image_url",
  "print_file_url",
  "image_url",
  "medusa_product_id",
  "medusa_variant_id",
  "metadata",
])

const PUBLISHED_EDITABLE_FIELDS = new Set([
  "title",
  "description",
  "price",
  "tags",
  "category_ids",
  "ship_from_country",
  "design_image_url",
  "mockup_image_url",
  "print_file_url",
  "image_url",
  "metadata",
])

export const pickProductUpdateData = (
  body: Record<string, unknown>,
  currentStatus: string
): Record<string, unknown> => {
  const allowed =
    currentStatus === "published" ? PUBLISHED_EDITABLE_FIELDS : DRAFT_EDITABLE_FIELDS
  const data: Record<string, unknown> = {}

  for (const key of allowed) {
    if (key in body) {
      data[key] = body[key]
    }
  }

  return data
}

export const duplicateProductPayload = (
  source: Record<string, unknown>,
  storeId: string
): Record<string, unknown> => {
  const title = typeof source.title === "string" ? `${source.title} (Copy)` : "Untitled (Copy)"
  const { id: _id, created_at: _c, updated_at: _u, deleted_at: _d, ...rest } = source

  return {
    ...rest,
    store_id: storeId,
    title,
    status: "draft",
    ai_job_id: null,
    medusa_product_id: null,
    medusa_variant_id: null,
    metadata: {
      ...(typeof rest.metadata === "object" && rest.metadata ? rest.metadata : {}),
      duplicated_from: source.id,
    },
  }
}
