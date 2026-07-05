import type { BuyerProductVariant, StoreProduct } from "./mock-data"

export type BuyerProductApiVariant = {
  id?: string
  variant_id?: string
  medusa_variant_id?: string
  supplier_variant_id?: string
  color?: string | null
  size?: string | null
  title?: string | null
  inventory_quantity?: number | null
  stock?: number | null
  manage_inventory?: boolean | null
  allow_backorder?: boolean | null
  prices?: Array<{ amount?: number }>
}

export type BuyerProductApiInput = {
  id?: string
  product_id?: string
  title?: string
  description?: string | null
  category?: string | null
  category_name?: string | null
  image_url?: string | null
  mockup_image_url?: string | null
  design_image_url?: string | null
  print_file_url?: string | null
  thumbnail?: string | null
  images?: Array<{ url?: string | null }>
  price?: number | string | null
  variants?: BuyerProductApiVariant[]
  tags?: string[] | null
  metadata?: Record<string, unknown> | null
  medusa_product_id?: string | null
  medusa_variant_id?: string | null
  requires_shipping?: boolean
  supported_region_ids?: string[]
  supported_regions?: Array<{
    region_id: string
    name: string
    currency_code: string
    country_codes: string[]
  }>
  supplier_id?: string | null
  supplier_product_id?: string | null
  supplier_variant_id?: string | null
  basic_product_id?: string | null
  view_id?: string | null
  design_type?: number | null
  is_cart_addable?: boolean
  average_rating?: number | null
  review_count?: number
  category_ids?: string[] | null
  store_id?: string | null
  store_name?: string | null
  store_slug?: string | null
}

export const normalizeBuyerProductImage = (product: BuyerProductApiInput) =>
  product.image_url ??
  product.mockup_image_url ??
  product.thumbnail ??
  product.images?.find((image) => image.url)?.url ??
  ""

export const normalizeBuyerProductPrice = (product: BuyerProductApiInput) => {
  const value = product.price ?? product.variants?.flatMap((variant) => variant.prices ?? [])[0]?.amount
  const numeric = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(numeric)) return undefined
  return numeric > 999 ? numeric / 100 : numeric
}

export const normalizeBuyerProductVariants = (product: BuyerProductApiInput): BuyerProductVariant[] => {
  const variants = (product.variants ?? []).flatMap((variant, index) => {
    const id = variant.medusa_variant_id ?? variant.variant_id ?? variant.id
    if (!id) return []
    const inventoryQuantity = typeof variant.inventory_quantity === "number" ? variant.inventory_quantity : typeof variant.stock === "number" ? variant.stock : undefined
    const manageInventory = variant.manage_inventory ?? undefined
    const allowBackorder = variant.allow_backorder ?? undefined
    const hasInventory = manageInventory === false || inventoryQuantity == null || inventoryQuantity > 0 || allowBackorder === true
    return [{
      id,
      title: variant.title?.trim() || [variant.color, variant.size].filter(Boolean).join(" / ") || `Option ${index + 1}`,
      inventoryQuantity,
      manageInventory,
      allowBackorder,
      isPurchasable: Boolean(product.is_cart_addable && hasInventory),
    }]
  })

  if (variants.length || !product.medusa_variant_id) return variants
  return [{
    id: product.medusa_variant_id,
    title: "Default option",
    isPurchasable: Boolean(product.is_cart_addable),
  }]
}

const formatPrice = (amount?: number) => {
  if (amount == null) return "Price unavailable"
  return `${new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)} USD`
}

const formatSupportedRegions = (
  regions?: BuyerProductApiInput["supported_regions"]
) => {
  if (!regions?.length) return "All configured regions"
  return regions.map((region) => region.name).join(", ")
}

export const normalizeBuyerProduct = (product: BuyerProductApiInput, index = 0): StoreProduct => {
  const numericPrice = normalizeBuyerProductPrice(product)
  const variants = normalizeBuyerProductVariants(product)

  return {
    id: product.product_id ?? product.id ?? `backend-product-${index}`,
    title: product.title?.trim() || "Untitled product",
    category: product.category_name ?? product.category ?? "Uncategorized",
    categoryIds: product.category_ids ?? [],
    price: formatPrice(numericPrice),
    numericPrice,
    imageUrl: normalizeBuyerProductImage(product),
    mockupImageUrl: product.mockup_image_url ?? undefined,
    designImageUrl: product.design_image_url ?? undefined,
    printFileUrl: product.print_file_url ?? undefined,
    badge: typeof product.metadata?.badge === "string" ? product.metadata.badge : undefined,
    description: product.description ?? undefined,
    medusaProductId: product.medusa_product_id ?? undefined,
    medusaVariantId: product.medusa_variant_id ?? undefined,
    requiresShipping: product.requires_shipping,
    supportedRegionIds: product.supported_region_ids,
    supportedRegions: product.supported_regions,
    supportedRegionsLabel: formatSupportedRegions(product.supported_regions),
    supplierId: product.supplier_id ?? undefined,
    supplierProductId: product.supplier_product_id ?? undefined,
    supplierVariantId: product.supplier_variant_id ?? undefined,
    basicProductId: product.basic_product_id ?? undefined,
    viewId: product.view_id ?? undefined,
    designType: product.design_type ?? undefined,
    hasDesigner: Boolean(product.basic_product_id),
    isCartAddable: Boolean(product.is_cart_addable && variants.some((variant) => variant.isPurchasable)),
    averageRating: product.average_rating ?? null,
    reviewCount: product.review_count ?? 0,
    tags: Array.isArray(product.tags) ? product.tags : [],
    variants,
    storeId: product.store_id ?? undefined,
    storeName: product.store_name ?? undefined,
    storeSlug: product.store_slug ?? undefined,
  }
}
