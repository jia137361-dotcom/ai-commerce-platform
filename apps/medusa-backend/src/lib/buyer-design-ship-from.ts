import { normalizeShipFromCountryCode } from "./ship-from-country"

type ProductLike = {
  id?: string
  ship_from_country?: unknown
  basic_product_id?: unknown
  metadata?: Record<string, unknown> | null
}

type StoreCoreLike = {
  retrieveProduct?: (id: string) => Promise<ProductLike>
  listProducts: (
    filters: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<ProductLike[]>
}

const isBuyerDesignProduct = (product: ProductLike) => {
  const metadata = product.metadata && typeof product.metadata === "object" ? product.metadata : {}
  return metadata.buyer_design === true || metadata.design_source === "buyer_sdk"
}

const readBlankProductId = (product: ProductLike) => {
  const metadata = product.metadata && typeof product.metadata === "object" ? product.metadata : {}
  const raw = metadata.blank_product_id
  return typeof raw === "string" && raw.trim() ? raw.trim() : null
}

/**
 * Resolve ship-from for a buyer custom design from its blank (template) product.
 */
export async function resolveBuyerDesignShipFromCountry(
  storeCore: StoreCoreLike,
  input: {
    storeId: string
    blankProductId?: string | null
    basicProductId?: string | null
  }
): Promise<string | null> {
  const blankId = typeof input.blankProductId === "string" ? input.blankProductId.trim() : ""
  if (blankId && typeof storeCore.retrieveProduct === "function") {
    try {
      const blank = await storeCore.retrieveProduct(blankId)
      const code = normalizeShipFromCountryCode(blank?.ship_from_country)
      if (code) return code
    } catch {
      // blank may have been deleted; fall through
    }
  }

  const basicId =
    input.basicProductId == null || input.basicProductId === ""
      ? null
      : String(input.basicProductId).trim()
  if (!basicId) return null

  const candidates = await storeCore.listProducts(
    {
      store_id: input.storeId,
      basic_product_id: basicId,
    },
    { take: 20 }
  )
  const blank = (Array.isArray(candidates) ? candidates : []).find(
    (row) => !isBuyerDesignProduct(row) && normalizeShipFromCountryCode(row.ship_from_country)
  )
  return normalizeShipFromCountryCode(blank?.ship_from_country) ?? null
}

/**
 * For catalog responses: fill missing ship_from on buyer designs from blank products.
 */
export async function enrichBuyerDesignShipFromCountries(
  storeCore: StoreCoreLike,
  storeId: string,
  products: ProductLike[]
): Promise<ProductLike[]> {
  const needing = products.filter(
    (product) => isBuyerDesignProduct(product) && !normalizeShipFromCountryCode(product.ship_from_country)
  )
  if (!needing.length) return products

  const blankIds = Array.from(
    new Set(needing.map((product) => readBlankProductId(product)).filter((id): id is string => Boolean(id)))
  )
  const shipFromByBlankId = new Map<string, string>()
  if (blankIds.length && typeof storeCore.retrieveProduct === "function") {
    await Promise.all(
      blankIds.map(async (id) => {
        try {
          const blank = await storeCore.retrieveProduct!(id)
          const code = normalizeShipFromCountryCode(blank?.ship_from_country)
          if (code) shipFromByBlankId.set(id, code)
        } catch {
          // ignore missing blanks
        }
      })
    )
  }

  const basicIds = Array.from(
    new Set(
      needing
        .filter((product) => !readBlankProductId(product) || !shipFromByBlankId.has(readBlankProductId(product)!))
        .map((product) => (product.basic_product_id == null ? null : String(product.basic_product_id).trim()))
        .filter((id): id is string => Boolean(id))
    )
  )
  const shipFromByBasicId = new Map<string, string>()
  await Promise.all(
    basicIds.map(async (basicId) => {
      const code = await resolveBuyerDesignShipFromCountry(storeCore, {
        storeId,
        basicProductId: basicId,
      })
      if (code) shipFromByBasicId.set(basicId, code)
    })
  )

  return products.map((product) => {
    if (!isBuyerDesignProduct(product) || normalizeShipFromCountryCode(product.ship_from_country)) {
      return product
    }
    const blankId = readBlankProductId(product)
    const fromBlank = blankId ? shipFromByBlankId.get(blankId) : undefined
    const basicKey = product.basic_product_id == null ? null : String(product.basic_product_id).trim()
    const fromBasic = basicKey ? shipFromByBasicId.get(basicKey) : undefined
    const shipFrom = fromBlank ?? fromBasic ?? null
    return shipFrom ? { ...product, ship_from_country: shipFrom } : product
  })
}
