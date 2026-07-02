import { resolveStoreAssetUrl } from "./store-asset-url"

type OrderLineItemLike = {
  thumbnail?: string | null
  metadata?: Record<string, unknown> | null
}

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null

export const resolveOrderLineItemThumbnail = (item: OrderLineItemLike): string | null => {
  const raw =
    readString(item.thumbnail) ??
    readString(item.metadata?.mockup_image_url) ??
    readString(item.metadata?.image_url) ??
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
  for (const product of products) {
    const url = resolveStoreAssetUrl(
      readString(product.mockup_image_url) ??
        readString(product.image_url) ??
        readString(product.design_image_url)
    )
    if (url) {
      imageByProductId.set(String(product.id), url)
    }
  }

  return withMetadataThumbnails.map((item) => {
    const productId = item.metadata?.mc_product_id
    const catalogImage =
      typeof productId === "string" ? imageByProductId.get(productId) ?? null : null
    const thumbnail = catalogImage ?? item.thumbnail
    return thumbnail ? { ...item, thumbnail } : item
  })
}
