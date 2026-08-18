import type { BuyerProductVariant, StoreProduct, SupplierProductDetails } from "./mock-data"

export type BuyerProductApiVariant = {
  id?: string
  variant_id?: string
  medusa_variant_id?: string
  supplier_variant_id?: string
  color?: string | null
  size?: string | null
  option_type?: string | null
  option_value?: string | null
  image_url?: string | null
  title?: string | null
  inventory_quantity?: number | null
  stock?: number | null
  manage_inventory?: boolean | null
  allow_backorder?: boolean | null
  prices?: Array<{ amount?: number }>
  price?: number | string | null
  supplier_size_id?: string | number | null
  supplier_color_id?: string | number | null
}

export type BuyerProductApiInput = {
  id?: string
  product_id?: string
  title?: string
  description?: string | null
  category?: string | null
  category_name?: string | null
  image_url?: string | null
  gallery_image_urls?: string[] | null
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
  ship_from_country?: string | null
  ship_from_label?: string | null
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
  supplier_details?: {
    supplier_product_code?: string | null
    purchase_price?: number | null
    english?: {
      english_name?: string | null
      english_description?: string | null
      english_material?: string | null
      english_technology?: string | null
      delivery_note?: string | null
      colors?: Array<{ id: string; name: string }>
      sizes?: Array<{ id: string; name: string }>
      views?: Array<{ id: string; name: string }>
      categories?: Array<{ id: string; name: string }>
      images?: string[]
      blank_design_images?: string[]
      produce_area?: string | null
      produce_country?: string | null
      warehouse?: string | null
      variants?: Array<Record<string, unknown>>
      print_areas?: Array<Record<string, unknown>>
      basic_details?: Array<{ label: string; value: string }>
      size_chart?: { columns: string[]; rows: Array<Record<string, string>> } | null
      packaging_specs?: { columns: string[]; rows: Array<Record<string, string>> } | null
      official_images?: Array<{ url: string; color_name?: string | null }>
    } | null
    variants?: Array<Record<string, unknown>>
    print_specs?: Array<Record<string, unknown>>
  } | null
}

export const normalizeBuyerProductImage = (product: BuyerProductApiInput) =>
  product.image_url ??
  product.mockup_image_url ??
  product.thumbnail ??
  product.images?.find((image) => image.url)?.url ??
  ""

const normalizeBuyerProductGallery = (product: BuyerProductApiInput) => {
  const urls = [
    ...(Array.isArray(product.gallery_image_urls) ? product.gallery_image_urls : []),
    ...(Array.isArray(product.metadata?.image_urls) ? product.metadata.image_urls : []),
  ].filter((url): url is string => typeof url === "string" && url.trim().length > 0)
  return urls.filter((url, index) => urls.indexOf(url) === index)
}

/**
 * Read the product's display price in dollars.
 * mc_product.price is stored as dollars (major units) in the database.
 * No heuristic conversion needed — the backend owns the unit.
 */
export const normalizeBuyerProductPrice = (product: BuyerProductApiInput): number | undefined => {
  const value = product.price ?? product.variants?.flatMap((variant) => variant.prices ?? [])[0]?.amount
  if (value == null || value === "") return undefined
  const numeric = typeof value === "number" ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : undefined
}

export const normalizeBuyerProductVariants = (product: BuyerProductApiInput): BuyerProductVariant[] => {
  const variants = (product.variants ?? []).flatMap((variant, index) => {
    const id = variant.medusa_variant_id ?? variant.variant_id ?? variant.id
    if (!id) return []
    const inventoryQuantity = typeof variant.inventory_quantity === "number" ? variant.inventory_quantity : typeof variant.stock === "number" ? variant.stock : undefined
    const manageInventory = variant.manage_inventory ?? undefined
    const allowBackorder = variant.allow_backorder ?? undefined
    const hasInventory = manageInventory === false || inventoryQuantity == null || inventoryQuantity > 0 || allowBackorder === true
    const optionType = variant.option_type?.trim() || null
    const optionValue = variant.option_value?.trim() || null
    const rawPrice = variant.price ?? variant.prices?.[0]?.amount
    const numericPrice = typeof rawPrice === "number" ? rawPrice : Number(rawPrice)
    return [{
      id,
      title: variant.title?.trim() || [optionValue, variant.color, variant.size].filter(Boolean).join(" / ") || `Option ${index + 1}`,
      inventoryQuantity,
      manageInventory,
      allowBackorder,
      isPurchasable: Boolean(product.is_cart_addable && hasInventory),
      color: variant.color ?? null,
      size: variant.size ?? null,
      optionType,
      optionValue,
      imageUrl: variant.image_url ?? null,
      price: Number.isFinite(numericPrice) ? numericPrice : null,
      supplierSizeId: variant.supplier_size_id != null ? String(variant.supplier_size_id) : null,
      supplierColorId: variant.supplier_color_id != null ? String(variant.supplier_color_id) : null,
    }]
  })

  if (variants.length || !product.medusa_variant_id) return variants
  return [{
    id: product.medusa_variant_id,
    title: "Default option",
    isPurchasable: Boolean(product.is_cart_addable),
  }]
}

/**
 * Format a dollar amount for display.
 * Uses Intl.NumberFormat which already includes the currency symbol.
 * Returns "Price unavailable" for null/undefined.
 */
const formatPrice = (amount?: number): string => {
  if (amount == null || !Number.isFinite(amount)) return "Price unavailable"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
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
  const galleryImageUrls = normalizeBuyerProductGallery(product)
  const english = product.supplier_details?.english
  const supplierDetails: SupplierProductDetails | undefined = english
    ? {
        supplierProductCode: product.supplier_details?.supplier_product_code,
        purchasePrice: product.supplier_details?.purchase_price,
        englishName: english.english_name,
        englishDescription: english.english_description,
        englishMaterial: english.english_material,
        englishTechnology: english.english_technology,
        deliveryNote: english.delivery_note,
        colors: english.colors ?? [],
        sizes: english.sizes ?? [],
        views: english.views ?? [],
        categories: english.categories ?? [],
        images: english.images ?? [],
        blankDesignImages: english.blank_design_images ?? [],
        produceArea: english.produce_area,
        produceCountry: english.produce_country,
        warehouse: english.warehouse,
      variants: product.supplier_details?.variants ?? english.variants ?? [],
      printSpecs: product.supplier_details?.print_specs ?? english.print_areas ?? [],
      basicDetails: english.basic_details ?? [],
      sizeChart: english.size_chart ?? null,
      packagingSpecs: english.packaging_specs ?? null,
      officialImages: (english.official_images ?? []).map((image) => ({ url: image.url, colorName: image.color_name })),
    }
    : undefined

  return {
    id: product.product_id ?? product.id ?? `backend-product-${index}`,
    title: product.title?.trim() || "Untitled product",
    category: product.category_name ?? product.category ?? "Uncategorized",
    categoryIds: product.category_ids ?? [],
    price: formatPrice(numericPrice),
    numericPrice,
    imageUrl: normalizeBuyerProductImage(product),
    galleryImageUrls,
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
    shipFromCountry: product.ship_from_country ?? null,
    shipFromLabel: product.ship_from_label ?? null,
    supplierId: product.supplier_id ?? undefined,
    supplierProductId: product.supplier_product_id ?? undefined,
    supplierVariantId: product.supplier_variant_id ?? undefined,
    basicProductId: product.basic_product_id ?? undefined,
    viewId: product.view_id ?? undefined,
    designType: product.design_type ?? undefined,
    hasDesigner: Boolean(product.basic_product_id || product.supplier_product_id),
    isCartAddable: Boolean(product.is_cart_addable && variants.some((variant) => variant.isPurchasable)),
    averageRating: product.average_rating ?? null,
    reviewCount: product.review_count ?? 0,
    tags: Array.isArray(product.tags) ? product.tags : [],
    variants,
    storeId: product.store_id ?? undefined,
    storeName: product.store_name ?? undefined,
    storeSlug: product.store_slug ?? undefined,
    metadata: product.metadata ?? null,
    supplierDetails,
  }
}
