import { mockProducts, reviews as mockReviews, type CartLineItem, type StoreCart, type StoreProduct } from "./mock-data"

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

export type BuyerReview = {
  id: string
  customerName: string
  rating: number
  title?: string
  content: string
  createdAt?: string
}

export type BuyerReviewsSummary = {
  productId: string
  averageRating: number | null
  reviewCount: number
  ratingBreakdown: Record<string, number>
  reviews: BuyerReview[]
}

export type BuyerShareInfo = {
  productId: string
  title: string
  description?: string
  imageUrl?: string
  productUrl: string
  shareText: string
  channels: Record<string, {
    enabled?: boolean
    type?: string
    url?: string
    value?: string
    message?: string
  }>
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

type ApiProductDetail = {
  product?: ApiProduct
}

type ApiReview = {
  review_id?: string
  id?: string
  customer_name?: string | null
  rating?: number
  title?: string | null
  content?: string | null
  created_at?: string
}

type ApiReviews = {
  product_id?: string
  average_rating?: number | null
  review_count?: number
  rating_breakdown?: Record<string, number>
  reviews?: ApiReview[]
}

type ApiShare = {
  product_id?: string
  title?: string
  description?: string | null
  image_url?: string | null
  product_url?: string
  share_text?: string
  channels?: BuyerShareInfo["channels"]
}

type ApiCartLineItem = {
  id?: string
  title?: string
  quantity?: number
  unit_price?: number
  total?: number
  variant_id?: string
  product_id?: string
  thumbnail?: string | null
  metadata?: Record<string, unknown> | null
}

type ApiCart = {
  id?: string
  cart_id?: string
  store_id?: string
  email?: string
  currency_code?: string
  items?: ApiCartLineItem[]
  subtotal?: number
  total?: number
}

type ApiCartMutation = ApiCart & {
  cart?: ApiCart
}

export type CartAddressUpdateInput = {
  email: string
  phone: string
  shippingAddress: {
    firstName: string
    lastName: string
    address1: string
    address2?: string
    city: string
    province?: string
    postalCode: string
    countryCode: string
  }
}

export type CartShippingOption = {
  id: string
  name: string
  amount: number
  currencyCode: string
}

type ApiShippingOption = {
  id?: string
  name?: string
  amount?: number
  currency_code?: string
}

type ApiShippingOptionsResponse = {
  shipping_options?: ApiShippingOption[]
  requires_shipping_method?: boolean
}

type ApiCompletedOrder = {
  id?: string
  display_id?: string | number
  email?: string | null
  total?: number
  currency_code?: string
}

export type CompleteCartResponse = {
  orderId: string
  displayId?: string
  email?: string
  total?: number
  currencyCode?: string
  storeId: string
  paymentProviderId?: string
  paymentStatus?: unknown
  fulfillmentStatus?: unknown
  order?: unknown
}

type ApiCompleteCartResponse = {
  order_id?: string
  store_id?: string
  payment_provider_id?: string
  payment_status?: unknown
  fulfillment_status?: unknown
  order?: ApiCompletedOrder
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

export const getBuyerStoreId = () => config.storeId || "default_store"

export const getBuyerCartStorageKey = (storeId = getBuyerStoreId()) => `citigoo:${storeId}:cart_id`

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

export const formatBuyerMoney = (value: number | undefined, currency = "USD") => {
  const amount = Number.isFinite(value) ? (value as number) : 0
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount)
}

const readNumber = (value: number | string | null | undefined) => {
  const numeric = typeof value === "number" ? value : Number(value)
  return Number.isFinite(numeric) ? (numeric > 999 ? numeric / 100 : numeric) : undefined
}

const firstVariantPrice = (product: ApiProduct) =>
  product.variants?.flatMap((variant) => variant.prices ?? [])[0]?.amount

const readString = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined)

const warnFallback = (label: string, error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.warn(`[buyer-api] ${label} fallback`, {
    message,
    backendUrl: config.backendUrl,
    storeId: config.storeId || "default_store",
  })
  return message
}

const apiFetch = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const backendUrl = config.backendUrl.replace(/\/+$/, "")
  if (!backendUrl) {
    throw new Error("VITE_MEDUSA_BASE_URL is missing")
  }
  if (isPlaceholderValue(config.publishableKey)) {
    throw new Error("VITE_PUBLISHABLE_API_KEY is missing or still a placeholder")
  }

  const response = await fetch(`${backendUrl}${path}`, {
    ...init,
    headers: {
      ...headers(),
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  })
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

const normalizeReview = (review: ApiReview, index: number): BuyerReview => ({
  id: review.review_id ?? review.id ?? `review-${index}`,
  customerName: review.customer_name ?? "Verified buyer",
  rating: review.rating ?? 5,
  title: review.title ?? undefined,
  content: review.content ?? "",
  createdAt: review.created_at,
})

const normalizeReviews = (payload: ApiReviews, productId: string): BuyerReviewsSummary => ({
  productId: payload.product_id ?? productId,
  averageRating: payload.average_rating ?? null,
  reviewCount: payload.review_count ?? payload.reviews?.length ?? 0,
  ratingBreakdown: payload.rating_breakdown ?? {},
  reviews: (payload.reviews ?? []).map(normalizeReview),
})

const fallbackReviews = (productId: string): BuyerReviewsSummary => ({
  productId,
  averageRating: 4.8,
  reviewCount: mockReviews.length,
  ratingBreakdown: { "5": 2, "4": 1, "3": 0, "2": 0, "1": 0 },
  reviews: mockReviews.map((review) => ({
    id: review.id,
    customerName: review.user,
    rating: review.rating,
    title: review.location,
    content: review.text,
    createdAt: review.date,
  })),
})

const fallbackShare = (product: StoreProduct): BuyerShareInfo => {
  const productUrl = `${window.location.origin}/products/${encodeURIComponent(product.id)}`
  return {
    productId: product.id,
    title: product.title,
    description: product.description,
    imageUrl: product.imageUrl,
    productUrl,
    shareText: `${product.title} ${productUrl}`,
    channels: {
      copy_link: {
        enabled: true,
        type: "copy",
        value: productUrl,
      },
    },
  }
}

const normalizeShare = (payload: ApiShare, product: StoreProduct): BuyerShareInfo => {
  const productUrl = payload.product_url ?? `${window.location.origin}/products/${encodeURIComponent(product.id)}`
  return {
    productId: payload.product_id ?? product.id,
    title: payload.title ?? product.title,
    description: payload.description ?? product.description,
    imageUrl: payload.image_url ?? product.imageUrl,
    productUrl,
    shareText: payload.share_text ?? `${product.title} ${productUrl}`,
    channels: payload.channels ?? {},
  }
}

const normalizeCartLineItem = (item: ApiCartLineItem): CartLineItem => {
  const quantity = item.quantity ?? 1
  const unitPrice = readNumber(item.unit_price) ?? readNumber(item.total) ?? 0
  const total = readNumber(item.total) ?? unitPrice * quantity
  return {
    id: item.id ?? item.variant_id ?? `line-${Math.random().toString(36).slice(2)}`,
    title: item.title ?? readString(item.metadata?.mc_product_title) ?? "Cart item",
    imageUrl: item.thumbnail ?? readString(item.metadata?.mockup_image_url),
    quantity,
    unitPrice,
    total,
    variantId: item.variant_id,
    variantTitle: readString(item.metadata?.variant_title) ?? readString(item.metadata?.supplier_variant_title),
    productId: item.product_id ?? readString(item.metadata?.mc_product_id),
    colorName: readString(item.metadata?.color_name) ?? readString(item.metadata?.color),
    sizeName: readString(item.metadata?.size_name) ?? readString(item.metadata?.size),
  }
}

const normalizeCart = (cart: ApiCart): StoreCart => {
  const items = (cart.items ?? []).map(normalizeCartLineItem)
  const subtotal = readNumber(cart.subtotal) ?? items.reduce((sum, item) => sum + item.total, 0)
  const total = readNumber(cart.total) ?? subtotal
  return {
    id: cart.cart_id ?? cart.id ?? "",
    storeId: cart.store_id,
    email: cart.email,
    currencyCode: cart.currency_code ?? "usd",
    items,
    subtotal,
    total,
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

export const fetchProductDetail = async (productId: string): Promise<LoadResult<StoreProduct>> => {
  try {
    const payload = await apiFetch<ApiProductDetail>(`/store/products/${encodeURIComponent(productId)}`)
    if (!payload.product) {
      throw new Error("Backend returned no product")
    }
    return { data: normalizeProduct(payload.product, 0), source: "backend" }
  } catch (error) {
    const fallback = mockProducts.find((product) => product.id === productId) ?? mockProducts[0]
    return { data: fallback, source: "mock", error: warnFallback("product detail", error) }
  }
}

export const fetchProductReviews = async (productId: string): Promise<LoadResult<BuyerReviewsSummary>> => {
  try {
    const payload = await apiFetch<ApiReviews>(`/store/products/${encodeURIComponent(productId)}/reviews`)
    return { data: normalizeReviews(payload, productId), source: "backend" }
  } catch (error) {
    return { data: fallbackReviews(productId), source: "mock", error: warnFallback("product reviews", error) }
  }
}

export const fetchProductShare = async (product: StoreProduct): Promise<LoadResult<BuyerShareInfo>> => {
  try {
    const payload = await apiFetch<ApiShare>(`/store/products/${encodeURIComponent(product.id)}/share`)
    return { data: normalizeShare(payload, product), source: "backend" }
  } catch (error) {
    return { data: fallbackShare(product), source: "static", error: warnFallback("product share", error) }
  }
}

export const createCart = async () => {
  const cart = await apiFetch<ApiCart>("/store/carts", {
    method: "POST",
    body: JSON.stringify({ currency_code: "usd" }),
  })
  return normalizeCart(cart)
}

export const fetchCart = async (cartId: string) => {
  return normalizeCart(await apiFetch<ApiCart>(`/store/carts/${encodeURIComponent(cartId)}`))
}

export const addCartLineItem = async (cartId: string, variantId: string, quantity: number) => {
  const payload = await apiFetch<ApiCartMutation>(`/store/carts/${encodeURIComponent(cartId)}/line-items`, {
    method: "POST",
    body: JSON.stringify({ variant_id: variantId, quantity }),
  })
  if (payload.cart || payload.items) {
    return normalizeCart(payload.cart ?? payload)
  }
  return fetchCart(cartId)
}

export const updateCartLineItem = async (cartId: string, lineId: string, quantity: number) => {
  const payload = await apiFetch<ApiCartMutation>(`/store/carts/${encodeURIComponent(cartId)}/line-items/${encodeURIComponent(lineId)}`, {
    method: "PUT",
    body: JSON.stringify({ quantity }),
  })
  return normalizeCart(payload.cart ?? payload)
}

export const deleteCartLineItem = async (cartId: string, lineId: string) => {
  const payload = await apiFetch<ApiCartMutation>(`/store/carts/${encodeURIComponent(cartId)}/line-items/${encodeURIComponent(lineId)}`, {
    method: "DELETE",
  })
  return normalizeCart(payload.cart ?? payload)
}

export const updateCartAddress = async (cartId: string, input: CartAddressUpdateInput) => {
  const payload = await apiFetch<ApiCartMutation>(`/store/carts/${encodeURIComponent(cartId)}/address`, {
    method: "PUT",
    body: JSON.stringify({
      email: input.email,
      phone: input.phone,
      shipping_address: {
        first_name: input.shippingAddress.firstName,
        last_name: input.shippingAddress.lastName,
        address_1: input.shippingAddress.address1,
        address_2: input.shippingAddress.address2,
        city: input.shippingAddress.city,
        province: input.shippingAddress.province,
        postal_code: input.shippingAddress.postalCode,
        country_code: input.shippingAddress.countryCode,
      },
    }),
  })
  return normalizeCart(payload.cart ?? payload)
}

export const getCartShippingOptions = async (cartId: string) => {
  const payload = await apiFetch<ApiShippingOptionsResponse>(`/store/carts/${encodeURIComponent(cartId)}/shipping-options`)
  const options = (payload.shipping_options ?? [])
    .filter((option): option is Required<Pick<ApiShippingOption, "id" | "name">> & ApiShippingOption =>
      Boolean(option.id && option.name)
    )
    .map<CartShippingOption>((option) => ({
      id: option.id,
      name: option.name,
      amount: readNumber(option.amount) ?? 0,
      currencyCode: option.currency_code ?? "usd",
    }))

  return {
    options,
    requiresShippingMethod: payload.requires_shipping_method ?? options.length > 0,
  }
}

export const selectCartShippingMethod = async (cartId: string, optionId: string) => {
  const payload = await apiFetch<ApiCartMutation>(`/store/carts/${encodeURIComponent(cartId)}/shipping-methods`, {
    method: "POST",
    body: JSON.stringify({ option_id: optionId }),
  })
  return normalizeCart(payload.cart ?? payload)
}

export const completeCart = async (cartId: string, paymentProviderId?: string): Promise<CompleteCartResponse> => {
  const payload = await apiFetch<ApiCompleteCartResponse>(`/store/carts/${encodeURIComponent(cartId)}/complete`, {
    method: "POST",
    body: JSON.stringify(paymentProviderId ? { payment_provider_id: paymentProviderId } : {}),
  })
  const order = payload.order
  return {
    orderId: payload.order_id ?? order?.id ?? "",
    displayId: order?.display_id ? String(order.display_id) : undefined,
    email: order?.email ?? undefined,
    total: readNumber(order?.total),
    currencyCode: order?.currency_code,
    storeId: payload.store_id ?? getBuyerStoreId(),
    paymentProviderId: payload.payment_provider_id,
    paymentStatus: payload.payment_status,
    fulfillmentStatus: payload.fulfillment_status,
    order,
  }
}
