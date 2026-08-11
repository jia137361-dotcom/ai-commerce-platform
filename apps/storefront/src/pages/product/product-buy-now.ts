export const buildBuyNowHref = (storeId?: string | null) => {
  const normalizedStoreId = storeId?.trim()
  return normalizedStoreId
    ? `/checkout?store=${encodeURIComponent(normalizedStoreId)}`
    : "/checkout"
}
