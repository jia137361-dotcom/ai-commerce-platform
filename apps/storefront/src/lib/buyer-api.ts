import { resolveStorePolicyDisplay } from "@ai-commerce/shared-types"
import { type CartLineItem, type StoreCart, type StoreProduct } from "./mock-data"
import { normalizeBuyerProduct, type BuyerProductApiInput } from "./buyer-product"
import { buildShipmentTrackingEvents } from "./buyer-tracking-events"
import { readBuyerPreferencesFromMetadata, type BuyerPreferences } from "./buyer-preferences"
import { buildShareChannels, buildShareText } from "./share-channels"
import { resolveStoreAssetUrl } from "./store-media-url"

export type DataSource = "backend" | "mock" | "static"

export type BuyerStoreSettings = {
  storeId: string
  brandName: string
  logoUrl?: string
  supportEmail?: string
  seoTitle?: string
  seoDescription?: string
  followerCount?: number
  description?: string
  announcement?: string
  bannerUrl?: string
  galleryUrls?: string[]
  shippingPolicy?: string
  paymentPolicy?: string
  returnsPolicy?: string
  cancellationPolicy?: string
  privacyPolicy?: string
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
  logisticsRating?: number | null
  overallRating?: number | null
  imageUrls?: string[]
  title?: string
  content: string
  createdAt?: string
  productId?: string
  productTitle?: string
  orderId?: string
  orderDisplayId?: string | number | null
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
    follower_count?: number | null
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
  logistics_rating?: number | null
  overall_rating?: number | null
  image_urls?: string[]
  title?: string | null
  content?: string | null
  created_at?: string
  product_id?: string
  product_title?: string
  order_id?: string
  order_display_id?: string | number | null
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

type ApiCartAddress = {
  first_name?: string | null
  last_name?: string | null
  address_1?: string | null
  address_2?: string | null
  city?: string | null
  province?: string | null
  postal_code?: string | null
  country_code?: string | null
}

type ApiCart = {
  id?: string
  cart_id?: string
  store_id?: string
  customer_id?: string | null
  email?: string
  currency_code?: string
  region_id?: string
  items?: ApiCartLineItem[]
  subtotal?: number
  total?: number
  shipping_address?: ApiCartAddress | null
}

type ApiPaymentProvider = { id?: string; is_enabled?: boolean }
type ApiPaymentProvidersResponse = { payment_providers?: ApiPaymentProvider[] }
type ApiPaymentSession = {
  id?: string
  provider_id?: string
  status?: string
  data?: Record<string, unknown> | null
}
type ApiPaymentCollection = {
  id?: string
  payment_sessions?: ApiPaymentSession[]
}
type ApiPaymentCollectionResponse = { payment_collection?: ApiPaymentCollection }

export type BuyerPaymentProvider = { id: string; isStripe: boolean }
export type BuyerPaymentSession = {
  id: string
  providerId: string
  status?: string
  clientSecret?: string
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
  amount?: number
  currencyCode: string
  available: boolean
  unavailableReason?: string
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
  paymentMethodLabel?: string | null
  paymentStatus?: unknown
  fulfillmentStatus?: unknown
  order?: unknown
}

type ApiCompleteCartResponse = {
  order_id?: string
  store_id?: string
  payment_provider_id?: string
  payment_method_label?: string | null
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
  supplier_orders?: ApiSupplierOrderTracking[]
}

type ApiSupplierOrderTracking = {
  id?: string | null
  supplier?: string | null
  supplier_order_id?: string | null
  status?: string | null
  status_text?: string | null
  payment_status?: string | null
  payment_status_text?: string | null
  logistics_name?: string | null
  logistics_status?: string | null
  logistics_status_text?: string | null
  tracking_number?: string | null
  tracking_url?: string | null
  last_synced_at?: string | null
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
  product_id?: string | null
}

type ApiMyOrder = {
  order_id?: string
  display_id?: string | number | null
  created_at?: string | null
  email?: string | null
  status?: string | null
  payment_status?: string | null
  fulfillment_status?: string | null
  buyer_display_status?: BuyerOrderSummary["buyerDisplayStatus"]
  buyer_display_status_label?: string
  currency_code?: string | null
  total?: number | null
  item_count?: number
  preview_items?: ApiMyOrderPreviewItem[]
  review_eligible?: boolean
  review_completed?: boolean
  receipt_confirmation_required?: boolean
  receipt_confirmed_at?: string | null
  return_intent?: boolean
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
  metadata?: Record<string, unknown> | null
  addresses?: ApiCustomerAddress[] | null
}

type ApiCustomerAddress = {
  id?: string
  address_name?: string | null
  first_name?: string | null
  last_name?: string | null
  company?: string | null
  address_1?: string | null
  address_2?: string | null
  city?: string | null
  province?: string | null
  postal_code?: string | null
  country_code?: string | null
  phone?: string | null
  is_default_shipping?: boolean
  is_default_billing?: boolean
}

export type BuyerCustomerAddress = {
  id: string
  label?: string | null
  firstName?: string | null
  lastName?: string | null
  company?: string | null
  address1: string
  address2?: string | null
  city: string
  province?: string | null
  postalCode: string
  countryCode: string
  phone?: string | null
  isDefaultShipping: boolean
  isDefaultBilling: boolean
}

export type BuyerCustomerAddressInput = Omit<BuyerCustomerAddress, "id"> & { id?: string }

export type BuyerCustomer = {
  id: string
  email?: string | null
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  metadata?: Record<string, unknown>
  addresses?: BuyerCustomerAddress[]
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
  supplierOrders: BuyerSupplierOrderTracking[]
  events: Array<{
    label: string
    date?: string | null
    status?: string | null
  }>
}

export type BuyerSupplierOrderTracking = {
  id?: string | null
  supplier?: string | null
  supplierOrderId?: string | null
  status?: string | null
  statusText?: string | null
  paymentStatus?: string | null
  paymentStatusText?: string | null
  logisticsName?: string | null
  logisticsStatus?: string | null
  logisticsStatusText?: string | null
  trackingNumber?: string | null
  trackingUrl?: string | null
  lastSyncedAt?: string | null
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
  buyerDisplayStatus?: "cancelled" | "unpaid" | "packing" | "awaiting_receipt" | "awaiting_review" | "reviewed" | "completed" | "refunding"
  buyerDisplayStatusLabel?: string
  currencyCode?: string | null
  total?: number | null
  itemCount: number
  previewItems: Array<{
    title: string
    thumbnail?: string | null
    quantity: number
    productId?: string | null
  }>
  reviewEligible?: boolean
  reviewCompleted?: boolean
  receiptConfirmationRequired?: boolean
  receiptConfirmedAt?: string | null
  returnIntent?: boolean
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
  bucket?: string
}

const fallbackSettings: BuyerStoreSettings = {
  storeId: "default_store",
  brandName: "Nespresso",
  metadata: {},
  galleryUrls: [],
}

const readEnv = (key: string, fallback = "") =>
  (import.meta.env[key] as string | undefined)?.trim() || fallback

const isPlaceholderValue = (value: string) =>
  !value || value.includes("replace_me") || value.includes("<") || value.includes(">")

const config = {
  backendUrl: readEnv("VITE_MEDUSA_BASE_URL", readEnv("NEXT_PUBLIC_MEDUSA_BACKEND_URL", "http://127.0.0.1:9000")),
  publishableKey: readEnv("VITE_PUBLISHABLE_API_KEY", readEnv("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY")),
  storeId: readEnv("VITE_DEFAULT_STORE_ID", readEnv("NEXT_PUBLIC_STORE_ID", "default_store")),
  aiWorkerPublicBase: (() => {
    const explicit = readEnv("VITE_AI_WORKER_PUBLIC_BASE_URL", readEnv("NEXT_PUBLIC_AI_WORKER_PUBLIC_BASE_URL"))
    if (explicit) return explicit.replace(/\/+$/, "")
    const base = readEnv("VITE_AI_WORKER_BASE_URL", readEnv("NEXT_PUBLIC_AI_WORKER_BASE_URL", "http://127.0.0.1:8001"))
    return `${base.replace(/\/+$/, "")}/static`
  })(),
}

export const getStripePublishableKey = () => readEnv("VITE_STRIPE_PK")

export const getBuyerStoreId = () => config.storeId || "default_store"

export const getAiWorkerPublicBase = () => config.aiWorkerPublicBase

export const getBuyerCartStorageKey = (storeId = getBuyerStoreId(), identity = "guest:anonymous") =>
  `citigoo:${storeId}:cart:${encodeURIComponent(identity)}`

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
  if (value == null || value === "") return undefined
  const numeric = typeof value === "number" ? value : Number(value)
  return Number.isFinite(numeric) ? (numeric > 999 ? numeric / 100 : numeric) : undefined
}

const readString = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined)

const resolveOrderItemThumbnailUrl = (thumbnail?: string | null) => {
  if (!thumbnail?.trim()) return null
  return resolveStoreAssetUrl(thumbnail, config.backendUrl, config.aiWorkerPublicBase) ?? thumbnail.trim()
}

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
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    if (/failed to fetch|networkerror|load failed/i.test(message)) {
      throw new Error("Unable to reach the store backend. Check that medusa-backend is running and restart it after updates.")
    }
    throw error instanceof Error ? error : new Error(message)
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
    metadata: customer.metadata ?? {},
    addresses: (customer.addresses ?? []).map(normalizeCustomerAddress).filter((address): address is BuyerCustomerAddress => Boolean(address)),
  }
}

const normalizeCustomerAddress = (address?: ApiCustomerAddress): BuyerCustomerAddress | null => {
  if (!address?.id || !address.address_1 || !address.city || !address.postal_code || !address.country_code) return null
  return {
    id: address.id,
    label: address.address_name ?? null,
    firstName: address.first_name ?? null,
    lastName: address.last_name ?? null,
    company: address.company ?? null,
    address1: address.address_1,
    address2: address.address_2 ?? null,
    city: address.city,
    province: address.province ?? null,
    postalCode: address.postal_code,
    countryCode: address.country_code.toLowerCase(),
    phone: address.phone ?? null,
    isDefaultShipping: Boolean(address.is_default_shipping),
    isDefaultBilling: Boolean(address.is_default_billing),
  }
}

const customerAddressPayload = (input: BuyerCustomerAddressInput) => ({
  address_name: input.label?.trim() || undefined,
  first_name: input.firstName?.trim() || undefined,
  last_name: input.lastName?.trim() || undefined,
  company: input.company?.trim() || undefined,
  address_1: input.address1.trim(),
  address_2: input.address2?.trim() || undefined,
  city: input.city.trim(),
  province: input.province?.trim() || undefined,
  postal_code: input.postalCode.trim(),
  country_code: input.countryCode.trim().toLowerCase(),
  phone: input.phone?.trim() || undefined,
  is_default_shipping: input.isDefaultShipping,
  is_default_billing: input.isDefaultBilling,
})

const normalizeSettings = (payload: ApiStoreSettings): BuyerStoreSettings => {
  const settings = payload.settings
  const metadata = settings?.metadata ?? {}
  const metadataString = (key: string) => typeof metadata[key] === "string" && metadata[key].trim() ? metadata[key].trim() : undefined
  const gallery = metadata.gallery_urls
  const brandName = settings?.brand_name ?? "Nespresso"
  const policies = resolveStorePolicyDisplay(metadata, brandName)
  const backendBase = config.backendUrl
  const galleryUrls = Array.isArray(gallery)
    ? gallery
        .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
        .map((value) => resolveStoreAssetUrl(value, backendBase) ?? value.trim())
    : []
  return {
    storeId: settings?.store_id ?? config.storeId ?? "default_store",
    brandName,
    logoUrl: resolveStoreAssetUrl(settings?.logo_url ?? undefined, backendBase),
    supportEmail: settings?.support_email ?? undefined,
    seoTitle: settings?.seo_title ?? undefined,
    seoDescription: settings?.seo_description ?? undefined,
    followerCount: typeof settings?.follower_count === "number" ? settings.follower_count : undefined,
    description: metadataString("description") ?? settings?.seo_description ?? undefined,
    announcement: metadataString("announcement"),
    bannerUrl: resolveStoreAssetUrl(metadataString("banner_url") ?? metadataString("hero_image_url"), backendBase),
    galleryUrls,
    shippingPolicy: policies.shippingPolicy,
    paymentPolicy: policies.paymentPolicy,
    returnsPolicy: policies.returnsPolicy,
    cancellationPolicy: policies.cancellationPolicy,
    privacyPolicy: policies.privacyPolicy,
    metadata,
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
  logisticsRating: review.logistics_rating ?? null,
  overallRating: review.overall_rating ?? null,
  imageUrls: review.image_urls ?? [],
  title: review.title ?? undefined,
  content: review.content ?? "",
  createdAt: review.created_at,
  productId: review.product_id,
  productTitle: review.product_title,
  orderId: review.order_id,
  orderDisplayId: review.order_display_id ?? null,
})

const normalizeReviews = (payload: ApiReviews, productId: string): BuyerReviewsSummary => ({
  productId: payload.product_id ?? productId,
  averageRating: payload.average_rating ?? null,
  reviewCount: payload.review_count ?? payload.reviews?.length ?? 0,
  ratingBreakdown: payload.rating_breakdown ?? {},
  reviews: (payload.reviews ?? []).map(normalizeReview),
})

const emptyReviews = (productId: string): BuyerReviewsSummary => ({ productId, averageRating: null, reviewCount: 0, ratingBreakdown: {}, reviews: [] })

const fallbackShare = (product: StoreProduct): BuyerShareInfo => {
  const productUrl = `${window.location.origin}/products/${encodeURIComponent(product.id)}`
  return {
    productId: product.id,
    title: product.title,
    description: product.description,
    imageUrl: product.imageUrl,
    productUrl,
    shareText: buildShareText(product.title, productUrl),
    channels: buildShareChannels({
      pageUrl: productUrl,
      title: product.title,
      imageUrl: product.imageUrl,
    }),
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
    shareText: payload.share_text ?? buildShareText(product.title, productUrl),
    channels: payload.channels ?? buildShareChannels({
      pageUrl: productUrl,
      title: payload.title ?? product.title,
      imageUrl: payload.image_url ?? product.imageUrl,
    }),
  }
}

const normalizeCartLineItem = (item: ApiCartLineItem): CartLineItem => {
  const quantity = Math.max(1, Math.floor(item.quantity ?? 1))
  const rawUnitPrice = readNumber(item.unit_price)
  const rawTotal = readNumber(item.total)
  const unitPrice = rawUnitPrice ?? (rawTotal != null ? rawTotal / quantity : 0)
  const total = rawTotal ?? (rawUnitPrice != null ? rawUnitPrice * quantity : 0)
  return {
    id: item.id ?? item.variant_id ?? `line-${Math.random().toString(36).slice(2)}`,
    title: item.title ?? readString(item.metadata?.mc_product_title) ?? "Cart item",
    imageUrl: item.thumbnail ?? readString(item.metadata?.mockup_image_url),
    quantity,
    unitPrice,
    total,
    hasUnitPrice: rawUnitPrice != null || rawTotal != null,
    hasTotal: rawTotal != null || rawUnitPrice != null,
    variantId: item.variant_id,
    variantTitle: readString(item.metadata?.variant_title) ?? readString(item.metadata?.supplier_variant_title),
    productId: item.product_id ?? readString(item.metadata?.mc_product_id),
    colorName: readString(item.metadata?.color_name) ?? readString(item.metadata?.color),
    sizeName: readString(item.metadata?.size_name) ?? readString(item.metadata?.size),
  }
}

const normalizeCartShippingAddress = (address?: ApiCartAddress | null) => {
  if (!address?.country_code || !address.address_1 || !address.city || !address.postal_code) return null
  return {
    firstName: address.first_name ?? undefined,
    lastName: address.last_name ?? undefined,
    address1: address.address_1,
    address2: address.address_2 ?? undefined,
    city: address.city,
    province: address.province ?? undefined,
    postalCode: address.postal_code,
    countryCode: address.country_code.toLowerCase(),
  }
}

const normalizeCart = (cart: ApiCart): StoreCart => {
  const items = (cart.items ?? []).map(normalizeCartLineItem)
  const rawSubtotal = readNumber(cart.subtotal)
  const rawTotal = readNumber(cart.total)
  const derivedSubtotalAvailable = items.length > 0 && items.every((item) => item.hasTotal)
  const subtotal = rawSubtotal ?? (derivedSubtotalAvailable ? items.reduce((sum, item) => sum + item.total, 0) : 0)
  const total = rawTotal ?? subtotal
  return {
    id: cart.cart_id ?? cart.id ?? "",
    regionId: cart.region_id,
    storeId: cart.store_id,
    email: cart.email,
    customerId: cart.customer_id ?? null,
    currencyCode: cart.currency_code ?? "usd",
    items,
    subtotal,
    total,
    hasSubtotal: rawSubtotal != null || derivedSubtotalAvailable,
    hasTotal: rawTotal != null || rawSubtotal != null || derivedSubtotalAvailable,
    shippingAddress: normalizeCartShippingAddress(cart.shipping_address),
  }
}

const normalizePaymentSession = (session?: ApiPaymentSession): BuyerPaymentSession | null => {
  if (!session?.id || !session.provider_id) return null
  const clientSecret = typeof session.data?.client_secret === "string" ? session.data.client_secret : undefined
  return {
    id: session.id,
    providerId: session.provider_id,
    status: session.status,
    clientSecret,
  }
}

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
    return {
      data: [{ id: "all", name: "All", slug: "all", sortOrder: -1 }, ...categories],
      source: "backend",
    }
  } catch (error) {
    return { data: [{ id: "all", name: "All", slug: "all", sortOrder: -1 }], source: "static", error: warnFallback("categories", error) }
  }
}

export const fetchProducts = async (): Promise<LoadResult<StoreProduct[]>> => {
  try {
    const payload = await apiFetch<ApiProducts>("/store/products")
    const products = (payload.products ?? []).map(normalizeBuyerProduct)
    return { data: products, source: "backend" }
  } catch (error) {
    return { data: [], source: "static", error: warnFallback("products", error) }
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
    return { data: { id: productId, title: "Product unavailable", category: "", price: "Price unavailable", imageUrl: "", isCartAddable: false, variants: [] }, source: "static", error: warnFallback("product detail", error) }
  }
}

export const fetchProductReviews = async (productId: string): Promise<LoadResult<BuyerReviewsSummary>> => {
  try {
    const payload = await apiFetch<ApiReviews>(`/store/products/${encodeURIComponent(productId)}/reviews`)
    return { data: normalizeReviews(payload, productId), source: "backend" }
  } catch (error) {
    return { data: emptyReviews(productId), source: "static", error: warnFallback("product reviews", error) }
  }
}

export const submitProductReview = async (input: {
  productId: string
  email: string
  orderNumber: string
  rating: number
  logisticsRating: number
  overallRating: number
  title?: string
  content?: string
  customerName?: string
  imageUrls?: string[]
}) => apiFetch<ApiReviews>(`/store/products/${encodeURIComponent(input.productId)}/reviews`, {
  method: "POST",
  body: JSON.stringify({
    email: input.email,
    order_number: input.orderNumber,
    rating: input.rating,
    logistics_rating: input.logisticsRating,
    overall_rating: input.overallRating,
    title: input.title,
    content: input.content,
    customer_name: input.customerName,
    image_urls: input.imageUrls ?? [],
  }),
})

export const uploadReviewImage = async (input: { fileBase64: string; contentType: string }) => {
  const payload = await apiFetch<{ image_url?: string }>("/store/reviews/upload-image", {
    method: "POST",
    body: JSON.stringify({
      file_base64: input.fileBase64,
      content_type: input.contentType,
    }),
  })
  if (!payload.image_url) {
    throw new Error("Image upload did not return a URL")
  }
  return { imageUrl: payload.image_url }
}

export const fetchStoreReviews = async (): Promise<LoadResult<BuyerReviewsSummary>> => {
  try {
    const payload = await apiFetch<ApiReviews>("/store/reviews")
    return { data: normalizeReviews(payload, "store"), source: "backend" }
  } catch (error) {
    return { data: emptyReviews("store"), source: "static", error: warnFallback("store reviews", error) }
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

export const createCart = async (options?: { countryCode?: string; regionId?: string }) => {
  let regionId = options?.regionId
  if (!regionId) {
    const regions = await listStoreRegions()
    regionId = resolveStoreRegionId(regions, options?.countryCode ?? "us")
  }
  const cart = await apiFetch<ApiCart>("/store/carts", {
    method: "POST",
    body: JSON.stringify({
      currency_code: "usd",
      ...(regionId ? { region_id: regionId } : {}),
    }),
  })
  return normalizeCart(cart)
}

export type StoreRegionSummary = {
  region_id: string
  name: string
  currency_code: string
  country_codes: string[]
}

export const listStoreRegions = async (): Promise<StoreRegionSummary[]> => {
  const payload = await apiFetch<{ regions: StoreRegionSummary[] }>("/store/market-regions")
  return payload.regions ?? []
}

export const resolveStoreRegionId = (regions: StoreRegionSummary[], countryCode: string) => {
  const normalized = countryCode.trim().toLowerCase()
  const matched = regions.find((region) => region.country_codes.includes(normalized))
  return matched?.region_id ?? regions[0]?.region_id
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
      amount: readNumber(option.amount),
      currencyCode: option.currency_code ?? "usd",
      available: readNumber(option.amount) != null,
      unavailableReason: readNumber(option.amount) == null ? "Price is unavailable for this cart/address." : undefined,
    }))

  return {
    options,
    requiresShippingMethod: payload.requires_shipping_method ?? options.length > 0,
  }
}

export const listCartPaymentProviders = async (regionId: string): Promise<BuyerPaymentProvider[]> => {
  const params = new URLSearchParams({ region_id: regionId })
  const payload = await apiFetch<ApiPaymentProvidersResponse>(`/store/payment-providers?${params.toString()}`)
  return (payload.payment_providers ?? [])
    .filter((provider): provider is Required<Pick<ApiPaymentProvider, "id">> & ApiPaymentProvider => Boolean(provider.id))
    .filter((provider) => provider.is_enabled !== false)
    .filter((provider) => provider.id === "pp_system_default" || provider.id.startsWith("pp_stripe_"))
    .map((provider) => ({ id: provider.id, isStripe: provider.id.startsWith("pp_stripe_") }))
}

export const initializeCartPaymentSession = async (
  cartId: string,
  providerId: string
): Promise<BuyerPaymentSession> => {
  const collectionPayload = await apiFetch<ApiPaymentCollectionResponse>("/store/payment-collections", {
    method: "POST",
    body: JSON.stringify({ cart_id: cartId }),
  })
  const collectionId = collectionPayload.payment_collection?.id
  if (!collectionId) throw new Error("Medusa did not return a payment collection for this cart.")

  const sessionPayload = await apiFetch<ApiPaymentCollectionResponse>(
    `/store/payment-collections/${encodeURIComponent(collectionId)}/payment-sessions`,
    {
      method: "POST",
      body: JSON.stringify({ provider_id: providerId }),
    }
  )
  const sessions = sessionPayload.payment_collection?.payment_sessions ?? []
  const session = normalizePaymentSession(sessions.find((candidate) => candidate.provider_id === providerId))
  if (!session) throw new Error("Medusa did not return the selected payment session.")
  if (providerId.startsWith("pp_stripe_") && !session.clientSecret) {
    throw new Error("Stripe payment session is missing client_secret.")
  }
  return session
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
    paymentMethodLabel: payload.payment_method_label ?? null,
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
  bucket,
}: BuyerOrdersQuery = {}): Promise<BuyerOrdersPage> => {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  })
  if (status) params.set("status", status)
  if (paymentStatus) params.set("payment_status", paymentStatus)
  if (fulfillmentStatus) params.set("fulfillment_status", fulfillmentStatus)
  if (bucket) params.set("bucket", bucket)

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
      buyerDisplayStatus: order.buyer_display_status ?? undefined,
      buyerDisplayStatusLabel: order.buyer_display_status_label ?? undefined,
      currencyCode: order.currency_code ?? null,
      total: order.total ?? null,
      itemCount: order.item_count ?? 0,
      previewItems: (order.preview_items ?? []).map((item) => ({
        title: item.title ?? "Untitled item",
        thumbnail: resolveOrderItemThumbnailUrl(item.thumbnail),
        quantity: item.quantity ?? 0,
        productId: item.product_id ?? null,
      })),
      reviewEligible: Boolean(order.review_eligible),
      reviewCompleted: Boolean(order.review_completed),
      receiptConfirmationRequired: Boolean(order.receipt_confirmation_required),
      receiptConfirmedAt: order.receipt_confirmed_at ?? null,
      returnIntent: Boolean(order.return_intent),
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

export const confirmOrderReceived = async (orderId: string) => {
  return apiFetch<{ order_id: string; status: string; confirmed_at: string }>(
    `/store/customers/me/orders/${encodeURIComponent(orderId)}/confirm-received`,
    { method: "POST" }
  )
}

export const changeBuyerPassword = async (currentPassword: string, newPassword: string) => {
  return apiFetch<{ updated: boolean }>("/store/customers/me/password", {
    method: "POST",
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  })
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

const normalizeSupplierOrderTracking = (supplierOrder: ApiSupplierOrderTracking): BuyerSupplierOrderTracking => ({
  id: supplierOrder.id ?? null,
  supplier: supplierOrder.supplier ?? null,
  supplierOrderId: supplierOrder.supplier_order_id ?? null,
  status: supplierOrder.status ?? null,
  statusText: supplierOrder.status_text ?? null,
  paymentStatus: supplierOrder.payment_status ?? null,
  paymentStatusText: supplierOrder.payment_status_text ?? null,
  logisticsName: supplierOrder.logistics_name ?? null,
  logisticsStatus: supplierOrder.logistics_status ?? null,
  logisticsStatusText: supplierOrder.logistics_status_text ?? null,
  trackingNumber: supplierOrder.tracking_number ?? null,
  trackingUrl: supplierOrder.tracking_url ?? null,
  lastSyncedAt: supplierOrder.last_synced_at ?? null,
})

export const getOrderTracking = async (orderId: string, email?: string): Promise<BuyerOrderTracking> => {
  const params = new URLSearchParams()
  if (email) params.set("email", email.trim().toLowerCase())
  const query = params.toString()
  const payload = await apiFetch<ApiOrderTrackingResponse>(`/store/orders/${encodeURIComponent(orderId)}/tracking${query ? `?${query}` : ""}`)
  const shipments = (payload.shipments ?? []).map(normalizeShipment)
  const supplierOrders = (payload.supplier_orders ?? []).map(normalizeSupplierOrderTracking)
  return {
    orderId: payload.order_id ?? orderId,
    storeId: payload.store_id,
    paymentStatus: payload.payment_status,
    fulfillmentStatus: payload.fulfillment_status,
    fulfillmentOrder: payload.fulfillment_order ?? null,
    shipments,
    supplierOrders,
    events: buildShipmentTrackingEvents(shipments),
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

const readOrderMoneyMajor = (value: number | string | null | undefined) => {
  if (value == null || value === "") return null
  const numeric = typeof value === "number" ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : null
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
      thumbnail: resolveOrderItemThumbnailUrl(item.thumbnail),
      quantity: item.quantity ?? 0,
      unitPrice: readOrderMoneyMajor(item.unit_price),
      subtotal: readOrderMoneyMajor(item.subtotal),
      metadata: item.metadata ?? null,
    })),
    shippingAddress: payload.shipping_address ?? null,
    billingAddress: payload.billing_address ?? null,
    subtotal: readOrderMoneyMajor(payload.subtotal),
    shippingTotal: readOrderMoneyMajor(payload.shipping_total),
    discountTotal: readOrderMoneyMajor(payload.discount_total),
    taxTotal: readOrderMoneyMajor(payload.tax_total),
    total: readOrderMoneyMajor(payload.total),
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
  const signedIn = await apiFetch<ApiAuthTokenResponse>("/auth/customer/emailpass", {
    method: "POST",
    body: JSON.stringify({ email, password: input.password }),
  })
  if (!signedIn.token) throw new Error("Customer was created but session authentication did not return a token.")
  await createCustomerSession(signedIn.token)
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

export const readBuyerPreferences = (customer: BuyerCustomer | null | undefined): BuyerPreferences => {
  return readBuyerPreferencesFromMetadata(customer?.metadata)
}

export const updateBuyerPreferences = async (input: Partial<BuyerPreferences>) => {
  const current = await getCurrentCustomer()
  if (!current) throw new Error("Sign in to save account preferences.")
  const previous = readBuyerPreferences(current)
  const next = {
    country_code: (input.countryCode ?? previous.countryCode).toLowerCase(),
    currency_code: (input.currencyCode ?? previous.currencyCode).toLowerCase(),
  }
  const payload = await apiFetch<ApiCustomerResponse>("/store/customers/me", {
    method: "POST",
    body: JSON.stringify({
      metadata: {
        ...(current.metadata ?? {}),
        buyer_preferences: next,
      },
    }),
  })
  const customer = normalizeCustomer(payload.customer)
  if (!customer) throw new Error("Unable to reload saved account preferences.")
  return customer
}

export const listCustomerAddresses = async (): Promise<BuyerCustomerAddress[]> => {
  const payload = await apiFetch<{ addresses?: ApiCustomerAddress[] }>("/store/customers/me/addresses?limit=50")
  return (payload.addresses ?? []).map(normalizeCustomerAddress).filter((address): address is BuyerCustomerAddress => Boolean(address))
}

export const createCustomerAddress = async (input: BuyerCustomerAddressInput) => {
  await apiFetch<ApiCustomerResponse>("/store/customers/me/addresses", {
    method: "POST",
    body: JSON.stringify(customerAddressPayload(input)),
  })
  return listCustomerAddresses()
}

export const updateCustomerAddress = async (addressId: string, input: BuyerCustomerAddressInput) => {
  await apiFetch<ApiCustomerResponse>(`/store/customers/me/addresses/${encodeURIComponent(addressId)}`, {
    method: "POST",
    body: JSON.stringify(customerAddressPayload(input)),
  })
  return listCustomerAddresses()
}

export const deleteCustomerAddress = async (addressId: string) => {
  await apiFetch<{ deleted?: boolean }>(`/store/customers/me/addresses/${encodeURIComponent(addressId)}`, {
    method: "DELETE",
  })
  return listCustomerAddresses()
}

export type BuyerPaymentMethod = {
  id: string
  type: string
  brand?: string
  last4?: string
  expMonth?: number
  expYear?: number
  walletType?: string | null
  isDefault: boolean
  label: string
}

type ApiPaymentMethod = {
  id?: string
  type?: string
  brand?: string
  last4?: string
  exp_month?: number
  exp_year?: number
  expMonth?: number
  expYear?: number
  wallet_type?: string | null
  walletType?: string | null
  is_default?: boolean
  isDefault?: boolean
  label?: string
}

const normalizePaymentMethod = (method: ApiPaymentMethod): BuyerPaymentMethod | null => {
  if (!method.id) return null
  return {
    id: method.id,
    type: method.type ?? "card",
    brand: method.brand,
    last4: method.last4,
    expMonth: method.expMonth ?? method.exp_month,
    expYear: method.expYear ?? method.exp_year,
    walletType: method.walletType ?? method.wallet_type ?? null,
    isDefault: Boolean(method.isDefault ?? method.is_default),
    label: method.label ?? "Payment method",
  }
}

export const listCustomerPaymentMethods = async () => {
  const payload = await apiFetch<{
    stripe_configured?: boolean
    default_payment_method_id?: string | null
    payment_methods?: ApiPaymentMethod[]
  }>("/store/customers/me/payment-methods")

  const paymentMethods = (payload.payment_methods ?? [])
    .map(normalizePaymentMethod)
    .filter((method): method is BuyerPaymentMethod => Boolean(method))

  return {
    stripeConfigured: Boolean(payload.stripe_configured),
    defaultPaymentMethodId: payload.default_payment_method_id ?? null,
    paymentMethods,
  }
}

export const createCustomerPaymentMethodSetup = async () => {
  const payload = await apiFetch<{ client_secret?: string; setup_intent_id?: string }>(
    "/store/customers/me/payment-methods",
    { method: "POST", body: JSON.stringify({}) }
  )
  if (!payload.client_secret?.includes("_secret_")) {
    throw new Error("Stripe did not return a setup client secret.")
  }
  return {
    clientSecret: payload.client_secret,
    setupIntentId: payload.setup_intent_id ?? "",
  }
}

export const deleteCustomerPaymentMethod = async (paymentMethodId: string) => {
  await apiFetch(`/store/customers/me/payment-methods/${encodeURIComponent(paymentMethodId)}`, {
    method: "DELETE",
  })
  return listCustomerPaymentMethods()
}

export const setDefaultCustomerPaymentMethod = async (paymentMethodId: string) => {
  await apiFetch(`/store/customers/me/payment-methods/${encodeURIComponent(paymentMethodId)}`, {
    method: "POST",
    body: JSON.stringify({}),
  })
  return listCustomerPaymentMethods()
}

export type BuyerEmailVerificationStatus = {
  email?: string | null
  verified: boolean
  verifiedAt?: string | null
}

export const fetchBuyerEmailVerificationStatus = async (): Promise<BuyerEmailVerificationStatus> => {
  const payload = await apiFetch<BuyerEmailVerificationStatus>("/store/customers/me/email-verification")
  return {
    email: payload.email ?? null,
    verified: Boolean(payload.verified),
    verifiedAt: payload.verifiedAt ?? null,
  }
}

export const sendBuyerEmailVerification = async () => {
  const payload = await apiFetch<{ sent?: boolean; email?: string; expires_at?: string; dev_code?: string }>(
    "/store/customers/me/email-verification",
    {
      method: "POST",
      body: JSON.stringify({ action: "send" }),
    }
  )
  return payload
}

export const confirmBuyerEmailVerification = async (code: string) => {
  const payload = await apiFetch<{ verified?: boolean; verifiedAt?: string; email?: string }>(
    "/store/customers/me/email-verification",
    {
      method: "POST",
      body: JSON.stringify({ action: "confirm", code }),
    }
  )
  return payload
}

export const signOutCustomer = async () => {
  await apiFetch<{ success?: boolean }>("/auth/session", {
    method: "DELETE",
  })
}

export const subscribeNewsletter = async (email: string) =>
  apiFetch<{ email: string; created: boolean; message: string }>("/store/newsletter/subscribe", {
    method: "POST",
    body: JSON.stringify({ email }),
  })

export const fetchStoreFollowState = async () =>
  apiFetch<{ store_id: string; follower_count: number; following: boolean }>("/store/follow")

export const updateStoreFollowState = async (following: boolean) =>
  apiFetch<{ store_id: string; follower_count: number; following: boolean }>("/store/follow", {
    method: "POST",
    body: JSON.stringify({ following }),
  })

export type BuyerStoreMessage = {
  id: string
  senderRole: "buyer" | "seller"
  body: string
  orderId?: string | null
  createdAt?: string
}

const normalizeStoreMessage = (message: {
  message_id?: string
  sender_role?: "buyer" | "seller"
  body?: string
  order_id?: string | null
  created_at?: string
}): BuyerStoreMessage => ({
  id: message.message_id ?? "",
  senderRole: message.sender_role ?? "buyer",
  body: message.body ?? "",
  orderId: message.order_id ?? null,
  createdAt: message.created_at,
})

export const fetchBuyerStoreMessages = async () => {
  const payload = await apiFetch<{ messages?: Array<Record<string, unknown>> }>("/store/messages")
  return (payload.messages ?? []).map((message) =>
    normalizeStoreMessage(message as Parameters<typeof normalizeStoreMessage>[0])
  )
}

export const sendBuyerStoreMessage = async (input: { body: string; orderId?: string }) =>
  apiFetch<{ message?: Record<string, unknown> }>("/store/messages", {
    method: "POST",
    body: JSON.stringify({
      body: input.body,
      order_id: input.orderId,
    }),
  })
