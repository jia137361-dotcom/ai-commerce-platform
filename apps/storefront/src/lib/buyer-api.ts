import { mockProducts, reviews as mockReviews, type CartLineItem, type StoreCart, type StoreProduct } from "./mock-data"
import { normalizeBuyerProduct, type BuyerProductApiInput } from "./buyer-product"

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

type ApiProduct = BuyerProductApiInput

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
  customer_id?: string | null
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

export type CartContactUpdateInput = {
  email: string
  phone?: string
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
  email?: string | null
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

type ApiOrderLookupResponse = {
  order_id?: string
  display_id?: string | number
  order_number?: string | number
  email?: string | null
  store_id?: string
  payment_status?: unknown
  fulfillment_status?: unknown
  created_at?: string
}

type ApiFulfillmentOrder = {
  id?: string
  status?: string | null
  supplier?: string | null
  supplier_order_id?: string | null
  pushed_at?: string | null
  failed_reason?: string | null
}

type ApiShipment = {
  id?: string
  carrier?: string | null
  tracking_number?: string | null
  tracking_url?: string | null
  shipped_at?: string | null
  delivered_at?: string | null
  status?: string | null
}

type ApiOrderTrackingResponse = {
  order_id?: string
  store_id?: string
  payment_status?: unknown
  fulfillment_status?: unknown
  fulfillment_order?: ApiFulfillmentOrder | null
  shipments?: ApiShipment[]
}

type ApiOrderDetailItem = {
  id?: string
  product_id?: string | null
  variant_id?: string | null
  title?: string | null
  variant_title?: string | null
  thumbnail?: string | null
  quantity?: number | null
  unit_price?: number | null
  subtotal?: number | null
  metadata?: Record<string, unknown> | null
}

type ApiOrderAddress = Record<string, unknown> | null

type ApiOrderDetailResponse = {
  order_id?: string
  display_id?: string | number | null
  store_id?: string
  email?: string | null
  status?: string | null
  payment_status?: string | null
  fulfillment_status?: string | null
  created_at?: string | null
  currency_code?: string | null
  items?: ApiOrderDetailItem[]
  shipping_address?: ApiOrderAddress
  billing_address?: ApiOrderAddress
  subtotal?: number | null
  shipping_total?: number | null
  discount_total?: number | null
  tax_total?: number | null
  total?: number | null
  cancellation?: ApiOrderCancellation
  refund_request?: ApiRefundRequestCapability
}

type ApiOrderCancellation = {
  allowed?: boolean
  code?: string | null
  message?: string | null
}

type ApiOrderCancelResponse = {
  order?: {
    id?: string
    display_id?: string | number | null
    status?: string | null
    payment_status?: string | null
    fulfillment_status?: string | null
    cancelled_at?: string | null
  }
  cancelled?: boolean
  already_cancelled?: boolean
  cancellation?: ApiOrderCancellation
}

type ApiRefundRequest = {
  id?: string
  order_id?: string
  display_id?: string | number | null
  status?: string
  reason?: string
  note?: string | null
  requested_amount?: number
  approved_amount?: number | null
  currency_code?: string | null
  payment_provider_id?: string | null
  external_refund_id?: string | null
  provider_status?: string | null
  created_at?: string | null
  updated_at?: string | null
}

type ApiRefundRequestCapability = {
  allowed?: boolean
  code?: string | null
  message?: string | null
  open_request?: ApiRefundRequest | null
}

type ApiRefundRequestResponse = {
  refund_request?: ApiRefundRequest
}

type ApiRefundRequestsResponse = {
  refund_requests?: ApiRefundRequest[]
}

type ApiMyOrderPreviewItem = {
  title?: string
  thumbnail?: string | null
  quantity?: number
}

type ApiMyOrder = {
  order_id?: string
  display_id?: string | number | null
  created_at?: string | null
  email?: string | null
  status?: string | null
  payment_status?: string | null
  fulfillment_status?: string | null
  currency_code?: string | null
  total?: number | null
  item_count?: number
  preview_items?: ApiMyOrderPreviewItem[]
}

type ApiMyOrdersResponse = {
  orders?: ApiMyOrder[]
  count?: number
  limit?: number
  offset?: number
}

type ApiAuthTokenResponse = {
  token?: string
}

type ApiCustomerResponse = {
  customer?: ApiCustomer
}

type ApiCustomer = {
  id?: string
  email?: string | null
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type BuyerCustomer = {
  id: string
  email?: string | null
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export type BuyerRegisterInput = {
  email: string
  password: string
  firstName?: string
  lastName?: string
  phone?: string
}

export type BuyerSignInInput = {
  email: string
  password: string
}

export type BuyerProfileUpdateInput = {
  firstName?: string
  lastName?: string
  phone?: string
}

export type BuyerOrderLookupResult = {
  orderId: string
  displayId?: string
  email?: string | null
  storeId?: string
  paymentStatus?: unknown
  fulfillmentStatus?: unknown
  createdAt?: string
}

export type BuyerOrderShipment = {
  id?: string
  carrier?: string | null
  trackingNumber?: string | null
  trackingUrl?: string | null
  shippedAt?: string | null
  deliveredAt?: string | null
  status?: string | null
}

export type BuyerOrderTracking = {
  orderId: string
  storeId?: string
  paymentStatus?: unknown
  fulfillmentStatus?: unknown
  fulfillmentOrder?: ApiFulfillmentOrder | null
  shipments: BuyerOrderShipment[]
  events: Array<{
    label: string
    date?: string | null
    status?: string | null
  }>
}

export type BuyerOrderDetailItem = {
  id: string
  productId?: string | null
  variantId?: string | null
  title: string
  variantTitle?: string | null
  thumbnail?: string | null
  quantity: number
  unitPrice?: number | null
  subtotal?: number | null
  metadata?: Record<string, unknown> | null
}

export type BuyerOrderDetail = {
  orderId: string
  displayId?: string
  storeId?: string
  email?: string | null
  status?: string | null
  paymentStatus?: string | null
  fulfillmentStatus?: string | null
  createdAt?: string | null
  currencyCode?: string | null
  items: BuyerOrderDetailItem[]
  shippingAddress?: ApiOrderAddress
  billingAddress?: ApiOrderAddress
  subtotal?: number | null
  shippingTotal?: number | null
  discountTotal?: number | null
  taxTotal?: number | null
  total?: number | null
  cancellation?: BuyerOrderCancellation
  refundRequest?: BuyerRefundRequestCapability
}

export type BuyerOrderCancellation = {
  allowed: boolean
  code?: string | null
  message?: string | null
}

export type BuyerOrderCancelResult = {
  order: {
    id: string
    displayId?: string
    status?: string | null
    paymentStatus?: string | null
    fulfillmentStatus?: string | null
    cancelledAt?: string | null
  }
  cancelled: boolean
  alreadyCancelled?: boolean
  cancellation?: BuyerOrderCancellation
}

export type BuyerRefundRequest = {
  id: string
  orderId: string
  displayId?: string
  status: string
  reason: string
  note?: string | null
  requestedAmount: number
  approvedAmount?: number | null
  currencyCode?: string | null
  paymentProviderId?: string | null
  externalRefundId?: string | null
  providerStatus?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export type BuyerRefundRequestCapability = {
  allowed: boolean
  code?: string | null
  message?: string | null
  openRequest?: BuyerRefundRequest | null
}

export type BuyerOrderSummary = {
  orderId: string
  displayId?: string
  createdAt?: string | null
  email?: string | null
  status?: string | null
  paymentStatus?: string | null
  fulfillmentStatus?: string | null
  currencyCode?: string | null
  total?: number | null
  itemCount: number
  previewItems: Array<{
    title: string
    thumbnail?: string | null
    quantity: number
  }>
}

export type BuyerOrdersPage = {
  orders: BuyerOrderSummary[]
  count: number
  limit: number
  offset: number
}

export type BuyerOrdersQuery = {
  limit?: number
  offset?: number
  status?: string
  paymentStatus?: string
  fulfillmentStatus?: string
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
  const { payload } = await apiFetchWithStatus<T>(path, init)
  return payload
}

const apiFetchWithStatus = async <T>(path: string, init: RequestInit = {}): Promise<{ status: number; payload: T }> => {
  const backendUrl = config.backendUrl.replace(/\/+$/, "")
  if (!backendUrl) {
    throw new Error("VITE_MEDUSA_BASE_URL is missing")
  }
  if (isPlaceholderValue(config.publishableKey)) {
    throw new Error("VITE_PUBLISHABLE_API_KEY is missing or still a placeholder")
  }

  const response = await fetch(`${backendUrl}${path}`, {
    ...init,
    credentials: init.credentials ?? "include",
    headers: {
      ...headers(),
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  })
  if (!response.ok) {
    const body = await response.text()
    let parsed: { error?: { code?: string; message?: string } | string; cancellation?: ApiOrderCancellation } | undefined
    try {
      parsed = body ? JSON.parse(body) : undefined
    } catch {
      parsed = undefined
    }
    if (import.meta.env.DEV) {
      console.warn("[buyer-api] response error", {
        path,
        http_status: response.status,
        raw_response: body,
      })
    }
    const errorPayload = parsed?.error
    const code = typeof errorPayload === "object" ? errorPayload.code : undefined
    const message =
      typeof errorPayload === "object" && errorPayload.message
        ? errorPayload.message
        : typeof errorPayload === "string"
          ? errorPayload
          : `HTTP ${response.status}${body ? `: ${body.slice(0, 180)}` : ""}`
    throw Object.assign(new Error(message), {
      status: response.status,
      code,
      payload: parsed,
    })
  }
  const text = await response.text()
  return {
    status: response.status,
    payload: (text ? JSON.parse(text) : undefined) as T,
  }
}

const normalizeCustomer = (customer?: ApiCustomer): BuyerCustomer | null => {
  if (!customer?.id) return null
  return {
    id: customer.id,
    email: customer.email ?? null,
    firstName: customer.first_name ?? null,
    lastName: customer.last_name ?? null,
    phone: customer.phone ?? null,
    createdAt: customer.created_at ?? null,
    updatedAt: customer.updated_at ?? null,
  }
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
    customerId: cart.customer_id ?? null,
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
    const products = (payload.products ?? []).map(normalizeBuyerProduct)
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
    return { data: normalizeBuyerProduct(payload.product, 0), source: "backend" }
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

export const attachCustomerToCart = async (cartId: string) => {
  const payload = await apiFetch<ApiCartMutation>(`/store/carts/${encodeURIComponent(cartId)}/customer`, {
    method: "POST",
    body: JSON.stringify({}),
  })
  return normalizeCart(payload.cart ?? payload)
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

export const updateCartContact = async (cartId: string, input: CartContactUpdateInput) => {
  const payload = await apiFetch<ApiCartMutation>(`/store/carts/${encodeURIComponent(cartId)}/contact`, {
    method: "PUT",
    body: JSON.stringify({
      email: input.email,
      phone: input.phone,
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
    email: order?.email ?? null,
    total: readNumber(order?.total),
    currencyCode: order?.currency_code,
    storeId: payload.store_id ?? getBuyerStoreId(),
    paymentProviderId: payload.payment_provider_id,
    paymentStatus: payload.payment_status,
    fulfillmentStatus: payload.fulfillment_status,
    order,
  }
}

export const lookupOrder = async (email: string, displayId: string): Promise<BuyerOrderLookupResult> => {
  const params = new URLSearchParams({
    email: email.trim().toLowerCase(),
    display_id: displayId.trim(),
  })
  const payload = await apiFetch<ApiOrderLookupResponse>(`/store/orders/lookup?${params.toString()}`)
  return {
    orderId: payload.order_id ?? "",
    displayId: payload.display_id ? String(payload.display_id) : payload.order_number ? String(payload.order_number) : undefined,
    email: payload.email ?? null,
    storeId: payload.store_id,
    paymentStatus: payload.payment_status,
    fulfillmentStatus: payload.fulfillment_status,
    createdAt: payload.created_at,
  }
}

export const getMyOrders = async ({
  limit = 20,
  offset = 0,
  status,
  paymentStatus,
  fulfillmentStatus,
}: BuyerOrdersQuery = {}): Promise<BuyerOrdersPage> => {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  })
  if (status) params.set("status", status)
  if (paymentStatus) params.set("payment_status", paymentStatus)
  if (fulfillmentStatus) params.set("fulfillment_status", fulfillmentStatus)

  const { status: httpStatus, payload } = await apiFetchWithStatus<ApiMyOrdersResponse>(`/store/customers/me/orders?${params.toString()}`)
  const rawOrders = Array.isArray(payload.orders) ? payload.orders : []
  const parsedOrders = rawOrders.map((order) => ({
      orderId: order.order_id ?? "",
      displayId: order.display_id == null ? undefined : String(order.display_id),
      createdAt: order.created_at ?? null,
      email: order.email ?? null,
      status: order.status ?? null,
      paymentStatus: order.payment_status ?? null,
      fulfillmentStatus: order.fulfillment_status ?? null,
      currencyCode: order.currency_code ?? null,
      total: order.total ?? null,
      itemCount: order.item_count ?? 0,
      previewItems: (order.preview_items ?? []).map((item) => ({
        title: item.title ?? "Untitled item",
        thumbnail: item.thumbnail ?? null,
        quantity: item.quantity ?? 0,
      })),
    }))
  if (import.meta.env.DEV) {
    console.info("[account-orders-api] response", {
      http_status: httpStatus,
      raw_response: payload,
      parsed_order_count: parsedOrders.length,
    })
    if ((payload.count ?? parsedOrders.length) !== parsedOrders.length) {
      console.warn("[account-orders-api] count does not match parsed orders", {
        count: payload.count,
        parsed_order_count: parsedOrders.length,
      })
    }
  }
  return {
    orders: parsedOrders,
    count: payload.count ?? 0,
    limit: payload.limit ?? limit,
    offset: payload.offset ?? offset,
  }
}

const normalizeShipment = (shipment: ApiShipment): BuyerOrderShipment => ({
  id: shipment.id,
  carrier: shipment.carrier ?? null,
  trackingNumber: shipment.tracking_number ?? null,
  trackingUrl: shipment.tracking_url ?? null,
  shippedAt: shipment.shipped_at ?? null,
  deliveredAt: shipment.delivered_at ?? null,
  status: shipment.status ?? null,
})

const shipmentEvents = (shipments: BuyerOrderShipment[]) => {
  const events: BuyerOrderTracking["events"] = []
  for (const shipment of shipments) {
    if (shipment.shippedAt) {
      events.push({ label: "Shipped", date: shipment.shippedAt, status: shipment.status })
    }
    if (shipment.deliveredAt) {
      events.push({ label: "Delivered", date: shipment.deliveredAt, status: "delivered" })
    }
  }
  return events
}

export const getOrderTracking = async (orderId: string, email?: string): Promise<BuyerOrderTracking> => {
  const params = new URLSearchParams()
  if (email) params.set("email", email.trim().toLowerCase())
  const query = params.toString()
  const payload = await apiFetch<ApiOrderTrackingResponse>(`/store/orders/${encodeURIComponent(orderId)}/tracking${query ? `?${query}` : ""}`)
  const shipments = (payload.shipments ?? []).map(normalizeShipment)
  return {
    orderId: payload.order_id ?? orderId,
    storeId: payload.store_id,
    paymentStatus: payload.payment_status,
    fulfillmentStatus: payload.fulfillment_status,
    fulfillmentOrder: payload.fulfillment_order ?? null,
    shipments,
    events: shipmentEvents(shipments),
  }
}

export const getOrderDetail = async (orderId: string, email?: string): Promise<BuyerOrderDetail> => {
  const params = new URLSearchParams()
  if (email) params.set("email", email.trim().toLowerCase())
  const query = params.toString()
  const payload = await apiFetch<ApiOrderDetailResponse>(`/store/orders/${encodeURIComponent(orderId)}/detail${query ? `?${query}` : ""}`)
  return normalizeOrderDetail(payload, orderId)
}

export const getAuthenticatedOrderDetail = async (orderId: string): Promise<BuyerOrderDetail> => {
  const payload = await apiFetch<ApiOrderDetailResponse>(
    `/store/customers/me/orders/${encodeURIComponent(orderId)}`
  )
  return normalizeOrderDetail(payload, orderId)
}

const normalizeCancellation = (cancellation?: ApiOrderCancellation): BuyerOrderCancellation | undefined => {
  if (!cancellation) return undefined
  return {
    allowed: Boolean(cancellation.allowed),
    code: cancellation.code ?? null,
    message: cancellation.message ?? null,
  }
}

const normalizeRefundRequest = (request?: ApiRefundRequest | null): BuyerRefundRequest | null => {
  if (!request?.id) return null
  return {
    id: request.id,
    orderId: request.order_id ?? "",
    displayId: request.display_id == null ? undefined : String(request.display_id),
    status: request.status ?? "pending",
    reason: request.reason ?? "",
    note: request.note ?? null,
    requestedAmount: request.requested_amount ?? 0,
    approvedAmount: request.approved_amount ?? null,
    currencyCode: request.currency_code ?? null,
    paymentProviderId: request.payment_provider_id ?? null,
    externalRefundId: request.external_refund_id ?? null,
    providerStatus: request.provider_status ?? "not_connected",
    createdAt: request.created_at ?? null,
    updatedAt: request.updated_at ?? null,
  }
}

const normalizeRefundCapability = (
  capability?: ApiRefundRequestCapability
): BuyerRefundRequestCapability | undefined => {
  if (!capability) return undefined
  return {
    allowed: Boolean(capability.allowed),
    code: capability.code ?? null,
    message: capability.message ?? null,
    openRequest: normalizeRefundRequest(capability.open_request),
  }
}

const normalizeOrderDetail = (payload: ApiOrderDetailResponse, orderId: string): BuyerOrderDetail => {
  return {
    orderId: payload.order_id ?? orderId,
    displayId: payload.display_id == null ? undefined : String(payload.display_id),
    storeId: payload.store_id,
    email: payload.email ?? null,
    status: payload.status ?? null,
    paymentStatus: payload.payment_status ?? null,
    fulfillmentStatus: payload.fulfillment_status ?? null,
    createdAt: payload.created_at ?? null,
    currencyCode: payload.currency_code ?? undefined,
    items: (payload.items ?? []).map((item, index) => ({
      id: item.id ?? `order-line-${index}`,
      productId: item.product_id ?? null,
      variantId: item.variant_id ?? null,
      title: item.title ?? "Untitled item",
      variantTitle: item.variant_title ?? null,
      thumbnail: item.thumbnail ?? null,
      quantity: item.quantity ?? 0,
      unitPrice: item.unit_price ?? null,
      subtotal: item.subtotal ?? null,
      metadata: item.metadata ?? null,
    })),
    shippingAddress: payload.shipping_address ?? null,
    billingAddress: payload.billing_address ?? null,
    subtotal: payload.subtotal ?? null,
    shippingTotal: payload.shipping_total ?? null,
    discountTotal: payload.discount_total ?? null,
    taxTotal: payload.tax_total ?? null,
    total: payload.total ?? null,
    cancellation: normalizeCancellation(payload.cancellation),
    refundRequest: normalizeRefundCapability(payload.refund_request),
  }
}

export const cancelAuthenticatedOrder = async (orderId: string, reason?: string): Promise<BuyerOrderCancelResult> => {
  const payload = await apiFetch<ApiOrderCancelResponse>(`/store/customers/me/orders/${encodeURIComponent(orderId)}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason: reason?.trim() || undefined }),
  })
  const order = payload.order ?? {}
  return {
    order: {
      id: order.id ?? orderId,
      displayId: order.display_id == null ? undefined : String(order.display_id),
      status: order.status ?? null,
      paymentStatus: order.payment_status ?? null,
      fulfillmentStatus: order.fulfillment_status ?? null,
      cancelledAt: order.cancelled_at ?? null,
    },
    cancelled: Boolean(payload.cancelled),
    alreadyCancelled: Boolean(payload.already_cancelled),
    cancellation: normalizeCancellation(payload.cancellation),
  }
}

export const createRefundRequest = async (
  orderId: string,
  payload: { reason: string; note?: string }
): Promise<BuyerRefundRequest> => {
  const response = await apiFetch<ApiRefundRequestResponse>(
    `/store/customers/me/orders/${encodeURIComponent(orderId)}/refund-requests`,
    {
      method: "POST",
      body: JSON.stringify({
        reason: payload.reason.trim(),
        note: payload.note?.trim() || undefined,
      }),
    }
  )
  const request = normalizeRefundRequest(response.refund_request)
  if (!request) throw new Error("Refund request API did not return a request.")
  return request
}

export const listRefundRequests = async (orderId: string): Promise<BuyerRefundRequest[]> => {
  const response = await apiFetch<ApiRefundRequestsResponse>(
    `/store/customers/me/orders/${encodeURIComponent(orderId)}/refund-requests`
  )
  return (response.refund_requests ?? [])
    .map(normalizeRefundRequest)
    .filter((request): request is BuyerRefundRequest => Boolean(request))
}

const createCustomerSession = async (token: string) => {
  await apiFetch<{ user?: unknown }>("/auth/session", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export const getCurrentCustomer = async () => {
  const payload = await apiFetch<ApiCustomerResponse>("/store/customers/me")
  return normalizeCustomer(payload.customer)
}

export const signInCustomer = async (input: BuyerSignInInput) => {
  const payload = await apiFetch<ApiAuthTokenResponse>("/auth/customer/emailpass", {
    method: "POST",
    body: JSON.stringify({
      email: input.email.trim().toLowerCase(),
      password: input.password,
    }),
  })
  if (!payload.token) throw new Error("Authentication succeeded without a token.")
  await createCustomerSession(payload.token)
  const customer = await getCurrentCustomer()
  if (!customer) throw new Error("Unable to load customer after sign in.")
  return customer
}

export const registerCustomer = async (input: BuyerRegisterInput) => {
  const email = input.email.trim().toLowerCase()
  const auth = await apiFetch<ApiAuthTokenResponse>("/auth/customer/emailpass/register", {
    method: "POST",
    body: JSON.stringify({
      email,
      password: input.password,
    }),
  })
  if (!auth.token) throw new Error("Registration succeeded without an auth token.")
  const payload = await apiFetch<ApiCustomerResponse>("/store/customers", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${auth.token}`,
    },
    body: JSON.stringify({
      email,
      first_name: input.firstName?.trim() || undefined,
      last_name: input.lastName?.trim() || undefined,
      phone: input.phone?.trim() || undefined,
    }),
  })
  await createCustomerSession(auth.token)
  return normalizeCustomer(payload.customer) ?? getCurrentCustomer()
}

export const updateCustomerProfile = async (input: BuyerProfileUpdateInput) => {
  const payload = await apiFetch<ApiCustomerResponse>("/store/customers/me", {
    method: "POST",
    body: JSON.stringify({
      first_name: input.firstName?.trim() || undefined,
      last_name: input.lastName?.trim() || undefined,
      phone: input.phone?.trim() || undefined,
    }),
  })
  const customer = normalizeCustomer(payload.customer)
  if (!customer) throw new Error("Unable to load customer after profile update.")
  return customer
}

export const signOutCustomer = async () => {
  await apiFetch<{ success?: boolean }>("/auth/session", {
    method: "DELETE",
  })
}
