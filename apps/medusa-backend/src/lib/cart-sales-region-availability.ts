import type { MedusaContainer } from "@medusajs/framework/types"
import { STORE_CORE_MODULE } from "../modules/store-core"
import type StoreCoreModuleService from "../modules/store-core/service"

type CartLineItem = {
  id?: string | null
  title?: string | null
  product_id?: string | null
  metadata?: Record<string, unknown> | null
}

type ShipToRegion = {
  id: string
  country_code?: string | null
  enabled?: boolean | null
  blocked?: boolean | null
}

type StoreCoreProduct = {
  id?: string | null
  title?: string | null
  metadata?: Record<string, unknown> | null
}

export type ProductRegionUnavailableItem = {
  product_id: string
  title: string
  country_code: string
}

const readString = (value: unknown) =>
  typeof value === "string" && value.trim().length ? value.trim() : null

const readStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : []

const readMetadata = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {}

const readMcProductId = (item: CartLineItem) => readString(item.metadata?.mc_product_id)

const describeItem = (
  item: CartLineItem,
  product: StoreCoreProduct | null,
  countryCode: string
): ProductRegionUnavailableItem => ({
  product_id: readMcProductId(item) ?? readString(item.product_id) ?? readString(item.id) ?? "unknown",
  title: readString(product?.title) ?? readString(item.title) ?? "Item",
  country_code: countryCode,
})

const findEnabledShipToRegion = async (
  storeCoreService: StoreCoreModuleService,
  countryCode: string
) => {
  const regions = (await (storeCoreService as any).listShipToRegions({
    enabled: true,
    blocked: false,
  })) as ShipToRegion[]
  const normalized = countryCode.toLowerCase()
  return regions.find((region) => region.country_code?.toLowerCase() === normalized) ?? null
}

const findStoreCoreProduct = async (
  storeCoreService: StoreCoreModuleService,
  item: CartLineItem
) => {
  const mcProductId = readMcProductId(item)
  if (!mcProductId) return null

  const products = (await storeCoreService.listProducts({ id: mcProductId })) as StoreCoreProduct[]
  return products[0] ?? null
}

const productShipsToRegion = (product: StoreCoreProduct, shipToRegionId: string) => {
  const metadata = readMetadata(product.metadata)
  const mode = readString(metadata.sales_region_mode ?? metadata.salesRegionMode)

  if (mode !== "selected") {
    return true
  }

  const selectedIds = readStringArray(metadata.sales_region_ids ?? metadata.salesRegionIds)
  return selectedIds.includes(shipToRegionId)
}

export async function validateCartSalesRegionAvailability(
  container: MedusaContainer,
  input: {
    countryCode?: string | null
    items?: CartLineItem[] | null
  }
): Promise<ProductRegionUnavailableItem[]> {
  const countryCode = readString(input.countryCode)?.toLowerCase()
  const items = input.items ?? []

  if (!countryCode || !items.length) {
    return []
  }

  const storeCoreService = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const shipToRegion = await findEnabledShipToRegion(storeCoreService, countryCode)

  if (!shipToRegion) {
    return items.map((item) => describeItem(item, null, countryCode))
  }

  const unavailable: ProductRegionUnavailableItem[] = []
  for (const item of items) {
    const product = await findStoreCoreProduct(storeCoreService, item)
    if (!product) continue

    if (!productShipsToRegion(product, shipToRegion.id)) {
      unavailable.push(describeItem(item, product, countryCode))
    }
  }

  return unavailable
}
