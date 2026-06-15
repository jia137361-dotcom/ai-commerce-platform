import { mockProducts, type StoreProduct } from "./mock-data"

export type DataSource = "backend" | "mock" | "static"

export type BuyerStoreSettings = {
  storeId: string
  brandName: string
  logoUrl?: string
  supportEmail?: string
  seoTitle?: string
  seoDescription?: string
  metadata: Record<string, unknown>
}

export type BuyerCategory = {
  id: string
  name: string
  slug?: string
  description?: string | null
  parentId?: string | null
  sortOrder?: number
}

export type LoadResult<T> = {
  data: T
  source: DataSource
  error?: string
}

type ApiStoreSettings = {
  settings?: {
    store_id?: string
    brand_name?: string | null
    logo_url?: string | null
    support_email?: string | null
    seo_title?: string | null
    seo_description?: string | null
    metadata?: Record<string, unknown> | null
  }
}

type ApiCategory = {
  category_id?: string
  id?: string
  name?: string
  slug?: string
  description?: string | null
  parent_id?: string | null
  sort_order?: number
}

type ApiCategories = {
  categories?: ApiCategory[]
}

type ApiProduct = {
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
  variants?: Array<{ prices?: Array<{ amount?: number }> }>
  tags?: string[] | null
  metadata?: Record<string, unknown> | null
  medusa_product_id?: string | null
  medusa_variant_id?: string | null
  supplier_id?: string | null
  supplier_product_id?: string | null
  supplier_variant_id?: string | null
  is_cart_addable?: boolean
  average_rating?: number | null
  review_count?: number
  category_ids?: string[] | null
}

type ApiProducts = {
  products?: ApiProduct[]
}

const fallbackSettings: BuyerStoreSettings = {
  storeId: "default_store",
  brandName: "Nespresso",
  metadata: {},
}

const fallbackCategories: BuyerCategory[] = [
  { id: "all", name: "All", slug: "all", sortOrder: 0 },
  { id: "coffee", name: "Coffee", slug: "coffee", sortOrder: 1 },
  { id: "machines", name: "Machines", slug: "machines", sortOrder: 2 },
  { id: "deals", name: "Deals", slug: "deals", sortOrder: 3 },
]

const readEnv = (key: string, fallback = "") =>
  (import.meta.env[key] as string | undefined)?.trim() || fallback

const isPlaceholderValue = (value: string) =>
  !value || value.includes("replace_me") || value.includes("<") || value.includes(">")

const config = {
  backendUrl: readEnv("VITE_MEDUSA_BASE_URL", readEnv("NEXT_PUBLIC_MEDUSA_BACKEND_URL", "http://127.0.0.1:9000")),
  publishableKey: readEnv("VITE_PUBLISHABLE_API_KEY", readEnv("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY")),
  storeId: readEnv("VITE_DEFAULT_STORE_ID", readEnv("NEXT_PUBLIC_STORE_ID", "default_store")),
}

const headers = () => ({
  "x-publishable-api-key": config.publishableKey,
  "X-Store-Id": config.storeId || "default_store",
})

const money = (value: number | string | null | undefined) => {
  if (typeof value === "string" && value.trim().startsWith("$")) return value
  const numeric = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(numeric)) return "$0.00 USD"
  const amount = numeric > 999 ? numeric / 100 : numeric
  return `${new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)} USD`
}

const readNumber = (value: number | string | null | undefined) => {
  const numeric = typeof value === "number" ? value : Number(value)
  return Number.isFinite(numeric) ? (numeric > 999 ? numeric / 100 : numeric) : undefined
}

const firstVariantPrice = (product: ApiProduct) =>
  product.variants?.flatMap((variant) => variant.prices ?? [])[0]?.amount

const warnFallback = (label: string, error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.warn(`[buyer-api] ${label} fallback`, {
    message,
    backendUrl: config.backendUrl,
    storeId: config.storeId || "default_store",
  })
  return message
}

const apiFetch = async <T>(path: string): Promise<T> => {
  const backendUrl = config.backendUrl.replace(/\/+$/, "")
  if (!backendUrl) {
    throw new Error("VITE_MEDUSA_BASE_URL is missing")
  }
  if (isPlaceholderValue(config.publishableKey)) {
    throw new Error("VITE_PUBLISHABLE_API_KEY is missing or still a placeholder")
  }

  const response = await fetch(`${backendUrl}${path}`, { headers: headers() })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`HTTP ${response.status}${body ? `: ${body.slice(0, 180)}` : ""}`)
  }
  return response.json() as Promise<T>
}

const normalizeSettings = (payload: ApiStoreSettings): BuyerStoreSettings => {
  const settings = payload.settings
  return {
    storeId: settings?.store_id ?? config.storeId ?? "default_store",
    brandName: settings?.brand_name ?? "Nespresso",
    logoUrl: settings?.logo_url ?? undefined,
    supportEmail: settings?.support_email ?? undefined,
    seoTitle: settings?.seo_title ?? undefined,
    seoDescription: settings?.seo_description ?? undefined,
    metadata: settings?.metadata ?? {},
  }
}

const normalizeCategory = (category: ApiCategory, index: number): BuyerCategory => ({
  id: category.category_id ?? category.id ?? `category-${index}`,
  name: category.name ?? `Category ${index + 1}`,
  slug: category.slug,
  description: category.description,
  parentId: category.parent_id,
  sortOrder: category.sort_order,
})

const normalizeProduct = (product: ApiProduct, index: number): StoreProduct => {
  const fallback = mockProducts[index % mockProducts.length]
  const rawPrice = product.price ?? firstVariantPrice(product)
  const imageUrl =
    product.image_url ??
    product.mockup_image_url ??
    product.thumbnail ??
    product.images?.find((image) => image.url)?.url ??
    fallback.imageUrl

  return {
    id: product.product_id ?? product.id ?? `backend-product-${index}`,
    title: product.title ?? "Untitled Product",
    category: product.category_name ?? product.category ?? fallback.category,
    categoryIds: product.category_ids ?? [],
    price: money(rawPrice),
    numericPrice: readNumber(rawPrice),
    imageUrl,
    mockupImageUrl: product.mockup_image_url ?? undefined,
    designImageUrl: product.design_image_url ?? undefined,
    printFileUrl: product.print_file_url ?? undefined,
    badge: typeof product.metadata?.badge === "string" ? product.metadata.badge : undefined,
    description: product.description ?? undefined,
    medusaProductId: product.medusa_product_id ?? undefined,
    medusaVariantId: product.medusa_variant_id ?? undefined,
    supplierId: product.supplier_id ?? undefined,
    supplierProductId: product.supplier_product_id ?? undefined,
    supplierVariantId: product.supplier_variant_id ?? undefined,
    isCartAddable: Boolean(product.is_cart_addable && product.medusa_variant_id),
    averageRating: product.average_rating ?? null,
    reviewCount: product.review_count ?? 0,
    tags: Array.isArray(product.tags) ? product.tags : [],
  }
}

const mockProductsWithCategories = mockProducts.map((product, index) => ({
  ...product,
  categoryIds: product.categoryIds ?? [fallbackCategories[(index % (fallbackCategories.length - 1)) + 1]?.id ?? "all"],
}))

export const fetchStoreSettings = async (): Promise<LoadResult<BuyerStoreSettings>> => {
  try {
    return {
      data: normalizeSettings(await apiFetch<ApiStoreSettings>("/store/settings")),
      source: "backend",
    }
  } catch (error) {
    return { data: fallbackSettings, source: "static", error: warnFallback("settings", error) }
  }
}

export const fetchProductCategories = async (): Promise<LoadResult<BuyerCategory[]>> => {
  try {
    const payload = await apiFetch<ApiCategories>("/store/product-categories")
    const categories = (payload.categories ?? []).map(normalizeCategory)
    if (!categories.length) {
      throw new Error("Backend returned no categories")
    }
    return {
      data: [{ id: "all", name: "All", slug: "all", sortOrder: -1 }, ...categories],
      source: "backend",
    }
  } catch (error) {
    return { data: fallbackCategories, source: "static", error: warnFallback("categories", error) }
  }
}

export const fetchProducts = async (): Promise<LoadResult<StoreProduct[]>> => {
  try {
    const payload = await apiFetch<ApiProducts>("/store/products")
    const products = (payload.products ?? []).map(normalizeProduct)
    if (!products.length) {
      throw new Error("Backend returned no products")
    }
    return { data: products, source: "backend" }
  } catch (error) {
    return { data: mockProductsWithCategories, source: "mock", error: warnFallback("products", error) }
  }
}
