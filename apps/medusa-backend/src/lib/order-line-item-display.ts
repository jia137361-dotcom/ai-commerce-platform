import { resolveStoreAssetUrl } from "./store-asset-url"

type OrderLineItemLike = {
  thumbnail?: string | null
  variant_id?: string | null
  metadata?: Record<string, unknown> | null
}

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null

const readVariantImageUrl = (
  product: Record<string, unknown>,
  variantId: string | null
): string | null => {
  if (!variantId || !Array.isArray(product.variants)) return null

  for (const value of product.variants) {
    if (!value || typeof value !== "object") continue
    const row = value as Record<string, unknown>
    if (readString(row.medusa_variant_id) !== variantId) continue
    return resolveStoreAssetUrl(readString(row.image_url))
  }

  return null
}

export const resolveOrderLineItemThumbnail = (item: OrderLineItemLike): string | null => {
  const raw =
    readString(item.metadata?.image_url) ??
    readString(item.metadata?.mockup_image_url) ??
    readString(item.thumbnail) ??
    null
  return resolveStoreAssetUrl(raw)
}

export const enrichOrderLineItemsWithImages = async (
  storeCoreService: {
    listProducts: (filters: Record<string, unknown>) => Promise<Array<Record<string, unknown>>>
  },
  items: Array<OrderLineItemLike & { metadata?: Record<string, unknown> | null }>
) => {
  const withMetadataThumbnails = items.map((item) => ({
    ...item,
    thumbnail: resolveOrderLineItemThumbnail(item),
  }))

  const productIds = [
    ...new Set(
      withMetadataThumbnails
        .map((item) => item.metadata?.mc_product_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    ),
  ]

  if (!productIds.length) {
    return withMetadataThumbnails
  }

  const products = await storeCoreService.listProducts({ id: productIds })
  const imageByProductId = new Map<string, string>()
  const imageByProductVariant = new Map<string, string>()
  for (const product of products) {
    const url = resolveStoreAssetUrl(
      readString(product.mockup_image_url) ??
        readString(product.image_url) ??
        readString(product.design_image_url)
    )
    const productId = readString(product.id)
    if (!productId) continue

    for (const item of withMetadataThumbnails) {
      const itemProductId = readString(item.metadata?.mc_product_id)
      const variantId = readString(item.variant_id)
      if (itemProductId !== productId || !variantId) continue
      const variantImage = readVariantImageUrl(product, variantId)
      if (variantImage) {
        imageByProductVariant.set(`${productId}:${variantId}`, variantImage)
      }
    }

    if (url) {
      imageByProductId.set(productId, url)
    }
  }

  return withMetadataThumbnails.map((item) => {
    const productId = item.metadata?.mc_product_id
    const variantId = readString(item.variant_id)
    const productIdString = readString(productId)
    const variantImage =
      productIdString && variantId
        ? imageByProductVariant.get(`${productIdString}:${variantId}`) ?? null
        : null
    const catalogImage = productIdString ? imageByProductId.get(productIdString) ?? null : null
    const thumbnail = catalogImage ?? item.thumbnail
    const displayThumbnail = variantImage ?? thumbnail
    return displayThumbnail ? { ...item, thumbnail: displayThumbnail } : item
  })
}
