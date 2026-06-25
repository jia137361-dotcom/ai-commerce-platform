/** mc_product admin paths (avoid Medusa native `/admin/products/:id` conflict). */
export const storeProductPath = (productId: string) => `/admin/store-products/${productId}`

export const storeProductsListPath = (query?: URLSearchParams) => {
  const qs = query?.toString()
  return qs ? `/admin/store-products?${qs}` : "/admin/store-products"
}

export const storeProductsBulkPath = () => "/admin/store-products/bulk"

export const storeProductPermanentDeletePath = (productId: string) =>
  `${storeProductPath(productId)}?permanent=true`
