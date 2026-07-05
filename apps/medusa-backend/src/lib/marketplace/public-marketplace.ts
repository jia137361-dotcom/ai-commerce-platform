import type { MedusaContainer } from "@medusajs/framework/types"
import { STORE_CORE_MODULE } from "../../modules/store-core"
import type StoreCoreModuleService from "../../modules/store-core/service"
import {
  getProductReviewSummaries,
  normalizeProductWithReviewSummary,
} from "../../api/_helpers/store-core"
import { attachSupportedRegionsToProducts } from "../product-regions"
import { resolveProductRequiresShipping } from "../product-shipping"

const ACTIVE_STORE_STATUSES = new Set(["active"])

export const isPublicStoreVisible = (status: string) => ACTIVE_STORE_STATUSES.has(status)

const parseBoundedInt = (value: unknown, fallback: number, max: number) => {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(parsed, 0), max)
}

export type ListPublicStoresOptions = {
  limit?: number
  offset?: number
  q?: string
}

export async function listPublicStores(container: MedusaContainer, options: ListPublicStoresOptions = {}) {
  const storeCore = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const limit = parseBoundedInt(options.limit, 24, 100) || 24
  const offset = parseBoundedInt(options.offset, 0, 10_000)
  const q = options.q?.trim().toLowerCase()

  const [stores, products, settingsRows] = await Promise.all([
    storeCore.listStores({}, { take: 1000, order: { created_at: "DESC" } }),
    storeCore.listProducts({ status: "published" }, { take: 10_000, select: ["id", "store_id"] }),
    storeCore.listStoreSettings({}, { take: 1000 }),
  ])

  const productCountByStore = new Map<string, number>()
  for (const product of products as Array<{ store_id: string }>) {
    productCountByStore.set(product.store_id, (productCountByStore.get(product.store_id) ?? 0) + 1)
  }

  const brandByStore = new Map<string, string | null>()
  for (const row of settingsRows as Array<{ store_id: string; brand_name?: string | null }>) {
    brandByStore.set(row.store_id, row.brand_name ?? null)
  }

  let filtered = (stores as Array<Record<string, unknown>>).filter((store) =>
    isPublicStoreVisible(String(store.status ?? ""))
  )

  if (q) {
    filtered = filtered.filter((store) => {
      const brand = brandByStore.get(String(store.id)) ?? ""
      const haystack = [store.name, store.slug, store.id, brand]
        .map((value) => String(value ?? "").toLowerCase())
        .join(" ")
      return haystack.includes(q)
    })
  }

  const page = filtered.slice(offset, offset + limit)

  return {
    count: filtered.length,
    limit,
    offset,
    stores: page.map((store) => ({
      store_id: String(store.id),
      name: String(store.name ?? ""),
      slug: String(store.slug ?? ""),
      logo_url: (store.logo_url as string | null | undefined) ?? null,
      banner_url: (store.banner_url as string | null | undefined) ?? null,
      description: (store.description as string | null | undefined) ?? null,
      brand_name: brandByStore.get(String(store.id)) ?? String(store.name ?? ""),
      product_count: productCountByStore.get(String(store.id)) ?? 0,
    })),
  }
}

export async function getPublicStoreBySlug(container: MedusaContainer, slug: string) {
  const normalizedSlug = slug.trim().toLowerCase()
  if (!normalizedSlug) return null

  const storeCore = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const stores = await storeCore.listStores({}, { take: 1000 })
  const store = (stores as Array<Record<string, unknown>>).find(
    (row) => String(row.slug ?? "").toLowerCase() === normalizedSlug
  )
  if (!store || !isPublicStoreVisible(String(store.status ?? ""))) return null

  const storeId = String(store.id)
  const [products, settingsRows] = await Promise.all([
    storeCore.listProducts({ store_id: storeId, status: "published" }, { take: 10_000, select: ["id"] }),
    storeCore.listStoreSettings({ store_id: storeId }),
  ])

  const settings = settingsRows[0] as { brand_name?: string | null } | undefined

  return {
    store_id: storeId,
    name: String(store.name ?? ""),
    slug: String(store.slug ?? ""),
    logo_url: (store.logo_url as string | null | undefined) ?? null,
    banner_url: (store.banner_url as string | null | undefined) ?? null,
    description: (store.description as string | null | undefined) ?? null,
    seo_title: (store.seo_title as string | null | undefined) ?? null,
    seo_description: (store.seo_description as string | null | undefined) ?? null,
    brand_name: settings?.brand_name ?? String(store.name ?? ""),
    product_count: products.length,
  }
}

export type ListMarketplaceProductsOptions = {
  limit?: number
  offset?: number
  q?: string
  store_id?: string
}

type MarketplaceProductRow = Record<string, unknown> & {
  metadata?: Record<string, unknown> | null
}

type EnrichedMarketplaceProduct = MarketplaceProductRow & {
  requires_shipping: boolean
  supported_regions: Awaited<ReturnType<typeof attachSupportedRegionsToProducts<MarketplaceProductRow>>>[number]["supported_regions"]
}

export async function listMarketplaceProducts(
  container: MedusaContainer,
  options: ListMarketplaceProductsOptions = {}
) {
  const storeCore = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const limit = parseBoundedInt(options.limit, 24, 100) || 24
  const offset = parseBoundedInt(options.offset, 0, 10_000)
  const q = options.q?.trim().toLowerCase()
  const storeIdFilter = options.store_id?.trim()

  const [stores, products] = await Promise.all([
    storeCore.listStores({}, { take: 1000 }),
    storeCore.listProducts(
      {
        status: "published",
        ...(storeIdFilter ? { store_id: storeIdFilter } : {}),
      },
      { take: 10_000, order: { created_at: "DESC" } }
    ),
  ])

  const storeById = new Map<string, Record<string, unknown>>()
  const activeStoreIds = new Set<string>()
  for (const store of stores as Array<Record<string, unknown>>) {
    const id = String(store.id)
    storeById.set(id, store)
    if (isPublicStoreVisible(String(store.status ?? ""))) {
      activeStoreIds.add(id)
    }
  }

  let filtered = (products as MarketplaceProductRow[]).filter((product) =>
    activeStoreIds.has(String(product.store_id))
  )

  if (q) {
    filtered = filtered.filter((product) => {
      const haystack = `${product.title ?? ""} ${product.description ?? ""}`.toLowerCase()
      return haystack.includes(q)
    })
  }

  const page = filtered.slice(offset, offset + limit)
  const productsWithShipping = page.map((product) => ({
    ...product,
    requires_shipping: resolveProductRequiresShipping(product),
  }))
  const productsWithRegions = (await attachSupportedRegionsToProducts(
    container,
    productsWithShipping
  )) as EnrichedMarketplaceProduct[]

  const reviewSummariesByStore = new Map<string, Map<string, { average_rating: number | null; review_count: number }>>()
  const groupedByStore = new Map<string, string[]>()
  for (const product of productsWithRegions) {
    const storeId = String(product.store_id ?? "")
    const ids = groupedByStore.get(storeId) ?? []
    ids.push(String(product.id ?? ""))
    groupedByStore.set(storeId, ids)
  }

  for (const [storeId, productIds] of groupedByStore.entries()) {
    const summaries = await getProductReviewSummaries(storeCore, storeId, productIds)
    reviewSummariesByStore.set(storeId, summaries)
  }

  return {
    count: filtered.length,
    limit,
    offset,
    products: productsWithRegions.map((product) => {
      const storeId = String(product.store_id ?? "")
      const store = storeById.get(storeId)
      const summaries = reviewSummariesByStore.get(storeId)
      const normalized = normalizeProductWithReviewSummary(
        product,
        summaries?.get(String(product.id ?? ""))
      )
      return {
        ...normalized,
        supported_regions: product.supported_regions,
        store_name: String(store?.name ?? ""),
        store_slug: String(store?.slug ?? ""),
      }
    }),
  }
}
