import { resolveStorePolicyDisplay } from "@ai-commerce/shared-types"
import type { PaymentIntent } from "@stripe/stripe-js"
import { type CartLineItem, type StoreCart, type StoreProduct } from "./mock-data"
import { normalizeBuyerProduct, type BuyerProductApiInput } from "./buyer-product"
import { buildShipmentTrackingEvents } from "./buyer-tracking-events"
import { readBuyerPreferencesFromMetadata, type BuyerPreferences } from "./buyer-preferences"
import { buildShareChannels, buildShareText } from "./share-channels"
import { resolveStoreAssetUrl } from "./store-media-url"
import { toEnglishCategoryLabel } from "./supplier-category-label"
import { readPayPalOrderId } from "./paypal-payment-session"
import { normalizeMedusaCartMoney } from "./cart-money"
import {
  getBuyerStoreId,
  getDefaultBuyerStoreId,
  getLegacyDefaultStoreId,
  getPersistedBuyerStoreId,
  getScopedBuyerStoreId,
  isMarketplaceContext,
  isMarketplaceStoreId,
  MARKETPLACE_STORE_ID,
  resetActiveBuyerStoreId,
  resolveBuyerStoreId,
  setActiveBuyerStoreId,
} from "./buyer-store-context"

export {
  getBuyerStoreId,
  getDefaultBuyerStoreId,
  getLegacyDefaultStoreId,
  getPersistedBuyerStoreId,
  getScopedBuyerStoreId,
  isMarketplaceContext,
  isMarketplaceStoreId,
  MARKETPLACE_STORE_ID,
  resetActiveBuyerStoreId,
  resolveBuyerStoreId,
  setActiveBuyerStoreId,
}

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

export type MarketplaceStore = {
  storeId: string
  name: string
  slug: string
  logoUrl?: string
  bannerUrl?: string
  description?: string
  brandName: string
  productCount: number
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
  completed_at?: string | null
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
  client_secret?: string
  clientSecret?: string
  data?: Record<string, unknown> | null
}
type ApiPaymentCollection = {
  id?: string
  payment_sessions?: ApiPaymentSession[]
}
type ApiPaymentCollectionResponse = {
  payment_collection?: ApiPaymentCollection
  payment_session?: ApiPaymentSession
  payment_sessions?: ApiPaymentSession[]
}
type ApiPaymentAttempt = {
  id?: string
  cart_id?: string | null
  store_id?: string | null
  customer_id?: string | null
  provider_id?: string | null
  payment_collection_id?: string | null
  payment_session_id?: string | null
  provider_payment_id?: string | null
  completed_order_id?: string | null
  status?: string
  expires_at?: string | null
  last_error?: string | null
  recovery_action?: BuyerPaymentAttempt["recoveryAction"]
}
type ApiPaymentRecoveryResponse = {
  cart_id?: string
  status?: string
  payment_attempt?: ApiPaymentAttempt
  payment_session?: ApiPaymentSession | null
  order_id?: string | null
  payment_intent_status?: string | null
}

export type BuyerPaymentProvider = { id: string; isStripe: boolean; isPayPal?: boolean }
export type BuyerPaymentSession = {
  id: string
  providerId: string
  status?: string
  clientSecret?: string
  paypalOrderId?: string
  paypalStatus?: string
}
export type BuyerPaymentAttemptStatus =
  | "created"
  | "awaiting_payment"
  | "requires_action"
  | "payment_failed"
  | "payment_processing"
  | "payment_succeeded"
  | "order_completion_failed"
  | "completed"
  | "expired"
  | "cancelled"

export type BuyerPaymentAttempt = {
  id: string
  cartId: string | null
  storeId: string | null
  customerId: string | null
  providerId: string | null
  paymentCollectionId: string | null
  paymentSessionId: string | null
  providerPaymentId: string | null
  completedOrderId: string | null
  status: BuyerPaymentAttemptStatus | string
  expiresAt: string | null
  lastError: string | null
  recoveryAction: "confirm_payment" | "complete_order" | "wait" | "completed" | "expired"
}

export type BuyerPaymentRecovery = {
  cartId: string
  status: BuyerPaymentAttemptStatus | string
  paymentAttempt: BuyerPaymentAttempt
  paymentSession: BuyerPaymentSession | null
  orderId: string | null
  paymentIntentStatus: string | null
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
  amount_minor?: number
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
  receipt_confirmation_required?: boolean
  receipt_confirmed_at?: string | null
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
  eligible_amount?: number | null
  approved_amount?: number | null
  requested_items?: unknown
  currency_code?: string | null
  payment_provider_id?: string | null
  external_refund_id?: string | null
  provider_status?: string | null
  created_at?: string | null
  updated_at?: string | null
  policy_result?: string | null
  production_status_snapshot?: string | null
  latest_production_status?: string | null
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
  variant_id?: string | null
}

type ApiMyOrder = {
  order_id?: string
  display_id?: string | number | null
  order_kind?: "order" | "checkout_reservation"
  checkout_cart_id?: string | null
  checkout_recovery_href?: string | null
  payment_expires_at?: string | null
  payment_attempt_status?: string | null
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
  store_id?: string | null
  platform_checkout_id?: string | null
  platform_checkout_index?: number | null
  platform_checkout_count?: number | null
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
  password?: string
  code?: string
  rememberMe?: boolean
  acceptedTerms?: boolean
}

export type BuyerSignInInput = {
  email: string
  password?: string
  code?: string
  rememberMe?: boolean
}

export type BuyerOtpSendResult = {
  sent: boolean
  email: string
  expiresAt?: string
  devCode?: string
}

export type BuyerPasswordResetRequest = {
  email: string
}

export type BuyerPasswordResetConfirm = {
  email: string
  code: string
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
  receiptConfirmationRequired?: boolean
  receiptConfirmedAt?: string | null
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
  eligibleAmount?: number | null
  approvedAmount?: number | null
  currencyCode?: string | null
  paymentProviderId?: string | null
  externalRefundId?: string | null
  providerStatus?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  policyResult?: string | null
  productionStatusSnapshot?: string | null
  latestProductionStatus?: string | null
  requestedItems?: Array<{ itemId: string; quantity: number }>
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
  orderKind?: "order" | "checkout_reservation"
  checkoutCartId?: string | null
  checkoutRecoveryHref?: string | null
  paymentExpiresAt?: string | null
  paymentAttemptStatus?: string | null
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
    variantId?: string | null
  }>
  reviewEligible?: boolean
  reviewCompleted?: boolean
  receiptConfirmationRequired?: boolean
  receiptConfirmedAt?: string | null
  returnIntent?: boolean
  storeId?: string | null
  platformCheckoutId?: string | null
  platformCheckoutIndex?: number | null
  platformCheckoutCount?: number | null
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
  scope?: "platform" | "all"
}

export const marketplaceBuyerSettings: BuyerStoreSettings = {
  storeId: MARKETPLACE_STORE_ID,
  brandName: "CiiVerse Marketplace",
  metadata: {},
}

const fallbackSettings: BuyerStoreSettings = {
  storeId: getLegacyDefaultStoreId(),
  brandName: "CiiVerse",
  metadata: {},
  galleryUrls: [],
}

const readEnv = (key: string, fallback = "") =>
  (import.meta.env[key] as string | undefined)?.trim() || fallback

const isPlaceholderValue = (value: string) =>
  !value || value.includes("replace_me") || value.includes("<") || value.includes(">")

const config = {
  // Route every development origin through Vite's proxy. This keeps checkout
  // working when local Vite is exposed through a temporary HTTPS tunnel.
  backendUrl: import.meta.env.DEV && typeof window !== "undefined"
    ? window.location.origin
    : readEnv("VITE_MEDUSA_BASE_URL", readEnv("NEXT_PUBLIC_MEDUSA_BACKEND_URL", "http://127.0.0.1:9000")),
  publishableKey: readEnv("VITE_PUBLISHABLE_API_KEY", readEnv("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY")),
  aiWorkerPublicBase: (() => {
    const explicit = readEnv("VITE_AI_WORKER_PUBLIC_BASE_URL", readEnv("NEXT_PUBLIC_AI_WORKER_PUBLIC_BASE_URL"))
    if (explicit) return explicit.replace(/\/+$/, "")
    const base = readEnv("VITE_AI_WORKER_BASE_URL", readEnv("NEXT_PUBLIC_AI_WORKER_BASE_URL", "http://127.0.0.1:8001"))
    return `${base.replace(/\/+$/, "")}/static`
  })(),
}

export const getStripePublishableKey = () => readEnv("VITE_STRIPE_PK")
export const getPayPalClientId = () => readEnv("VITE_PAYPAL_CLIENT_ID")

export type BuyerWalletBalance = { currency_code: string; amount: number; amount_minor: number; withdrawal_supported: boolean }
export type BuyerWalletEntry = { id: string; type: string; amount: number; amount_minor: number; currency_code: string; status: string; affects_balance: boolean; description: string | null; created_at: string }
export type BuyerWalletWithdrawal = { id: string; request_id: string | null; amount: number; amount_minor: number; currency_code: string; status: string; paypal_email_masked: string | null; provider_batch_id: string | null; error_message: string | null; created_at: string }
export type BuyerWallet = {
  store_id: string
  customer_id: string
  preferred_currency: string | null
  paypal_email_masked: string | null
  paypal_account_bound: boolean
  payout_mode: "disabled" | "mock" | "sandbox"
  minimum_withdrawal: number
  withdrawal_fee: number
  balances: BuyerWalletBalance[]
  ledger: BuyerWalletEntry[]
  withdrawals: BuyerWalletWithdrawal[]
}

export const getAiWorkerPublicBase = () => config.aiWorkerPublicBase

export const getBuyerCartStorageKey = (storeId = getBuyerStoreId(), identity = "guest:anonymous") =>
  `citigoo:${storeId}:cart:${encodeURIComponent(identity)}`

const resolveRequestStoreId = (storeId?: string) => storeId ?? resolveBuyerStoreId() ?? undefined

const headers = (storeId?: string) => {
  const resolved = resolveRequestStoreId(storeId)
  return {
    "x-publishable-api-key": config.publishableKey,
    ...(resolved ? { "X-Store-Id": resolved } : {}),
  }
}

const platformHeaders = () => ({
  "x-publishable-api-key": config.publishableKey,
})

const isPlatformCustomerOrdersPath = (path: string) =>
  /\/store\/customers\/me\/orders(?:\?|$)/.test(path) &&
  (path.includes("scope=platform") || path.includes("scope=all"))

type StoreScopedRequestOptions = {
  storeId?: string
}

const storeScopedFetch = async <T>(
  path: string,
  init: RequestInit = {},
  options?: StoreScopedRequestOptions
) => {
  const backendUrl = config.backendUrl.replace(/\/+$/, "")
  if (isPlaceholderValue(config.publishableKey)) {
    throw new Error("VITE_PUBLISHABLE_API_KEY is missing or still a placeholder")
  }

  const scopedStoreId = getScopedBuyerStoreId(options?.storeId)
  const url = backendUrl ? `${backendUrl}${path}` : path

  const response = await fetch(url, {
    ...init,
    credentials: init.credentials ?? "include",
    headers: {
      ...headers(scopedStoreId),
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
    let parsed: { error?: { code?: string; message?: string } | string } | undefined
    try {
      parsed = body ? JSON.parse(body) : undefined
    } catch {
      parsed = undefined
    }
    const errorPayload = parsed?.error
    const message =
      typeof errorPayload === "object" && errorPayload.message
        ? errorPayload.message
        : typeof errorPayload === "string"
          ? errorPayload
          : `HTTP ${response.status}${body ? `: ${body.slice(0, 180)}` : ""}`
    throw Object.assign(new Error(message), { status: response.status, payload: parsed })
  }

  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

/**
 * Format a dollar amount for display.
 * Returns "Price unavailable" for null/undefined/NaN instead of "$0.00".
 */
export const formatBuyerMoney = (value: number | undefined | null, currency = "USD"): string => {
  if (value == null || !Number.isFinite(value)) return "Price unavailable"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(value)
}

/**
 * Read a dollar amount from API response.
 * No heuristic conversion — the backend is responsible for sending major units (dollars).
 * Returns undefined for null/undefined/NaN.
 */
const readNumber = (value: number | string | null | undefined): number | undefined => {
  if (value == null || value === "") return undefined
  const numeric = typeof value === "number" ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : undefined
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
    storeId: getBuyerStoreId(),
  })
  return message
}

const apiFetch = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const { payload } = await apiFetchWithStatus<T>(path, init)
  return payload
}

const apiFetchWithStatus = async <T>(path: string, init: RequestInit = {}): Promise<{ status: number; payload: T }> => {
  const backendUrl = config.backendUrl.replace(/\/+$/, "")
  if (isPlaceholderValue(config.publishableKey)) {
    throw new Error("VITE_PUBLISHABLE_API_KEY is missing or still a placeholder")
  }

  const url = backendUrl ? `${backendUrl}${path}` : path
  const response = await fetch(url, {
    ...init,
    credentials: init.credentials ?? "include",
    headers: {
      ...(isPlatformCustomerOrdersPath(path) ? platformHeaders() : headers()),
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
  const brandName = settings?.brand_name ?? "Citigoo"
  const policies = resolveStorePolicyDisplay(metadata, brandName)
  const backendBase = config.backendUrl
  const galleryUrls = Array.isArray(gallery)
    ? gallery
        .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
        .map((value) => resolveStoreAssetUrl(value, backendBase) ?? value.trim())
    : []
  return {
    storeId: settings?.store_id ?? getBuyerStoreId(),
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
  const rawUnitPrice = normalizeMedusaCartMoney(item.unit_price)
  const rawTotal = normalizeMedusaCartMoney(item.total)
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
  const rawSubtotal = normalizeMedusaCartMoney(cart.subtotal)
  const rawTotal = normalizeMedusaCartMoney(cart.total)
  const derivedSubtotalAvailable = items.length > 0 && items.every((item) => item.hasTotal)
  const subtotal = rawSubtotal ?? (derivedSubtotalAvailable ? items.reduce((sum, item) => sum + item.total, 0) : 0)
  const total = rawTotal ?? subtotal
  return {
    id: cart.cart_id ?? cart.id ?? "",
    completedAt: cart.completed_at ?? null,
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

export const normalizePaymentSession = (session?: ApiPaymentSession): BuyerPaymentSession | null => {
  if (!session?.id || !session.provider_id) return null
  const dataClientSecret =
    typeof session.data?.client_secret === "string"
      ? session.data.client_secret
      : typeof session.data?.clientSecret === "string"
        ? session.data.clientSecret
        : undefined
  const clientSecret =
    typeof session.client_secret === "string"
      ? session.client_secret
      : typeof session.clientSecret === "string"
        ? session.clientSecret
        : dataClientSecret
  const paypalOrderId = readPayPalOrderId(session.provider_id, session.data)
  return {
    id: session.id,
    providerId: session.provider_id,
    status: session.status,
    clientSecret,
    paypalOrderId,
    paypalStatus: typeof session.data?.paypal_status === "string" ? session.data.paypal_status : undefined,
  }
}

const normalizePaymentAttempt = (attempt?: ApiPaymentAttempt): BuyerPaymentAttempt | null => {
  if (!attempt?.id) return null
  return {
    id: attempt.id,
    cartId: attempt.cart_id ?? null,
    storeId: attempt.store_id ?? null,
    customerId: attempt.customer_id ?? null,
    providerId: attempt.provider_id ?? null,
    paymentCollectionId: attempt.payment_collection_id ?? null,
    paymentSessionId: attempt.payment_session_id ?? null,
    providerPaymentId: attempt.provider_payment_id ?? null,
    completedOrderId: attempt.completed_order_id ?? null,
    status: attempt.status ?? "created",
    expiresAt: attempt.expires_at ?? null,
    lastError: attempt.last_error ?? null,
    recoveryAction: attempt.recovery_action ?? "confirm_payment",
  }
}

export const fetchBuyerPageSettings = async (options?: {
  storeId?: string
  marketplace?: boolean
}): Promise<LoadResult<BuyerStoreSettings>> => {
  const explicitStoreId = options?.storeId?.trim()
  const marketplace = options?.marketplace ?? (!explicitStoreId && !resolveBuyerStoreId())
  if (marketplace && !explicitStoreId) {
    return { data: marketplaceBuyerSettings, source: "static" }
  }

  const storeId = getScopedBuyerStoreId(explicitStoreId)
  try {
    return {
      data: normalizeSettings(
        await storeScopedFetch<ApiStoreSettings>("/store/settings", {}, { storeId })
      ),
      source: "backend",
    }
  } catch (error) {
    return {
      data: marketplace ? marketplaceBuyerSettings : { ...fallbackSettings, storeId },
      source: "static",
      error: warnFallback("settings", error),
    }
  }
}

export const fetchStoreSettings = async (options?: {
  storeId?: string
  marketplace?: boolean
}) => fetchBuyerPageSettings(options)

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

export const fetchProducts = async (options?: { countryCode?: string }): Promise<LoadResult<StoreProduct[]>> => {
  try {
    const params = new URLSearchParams()
    if (options?.countryCode?.trim()) params.set("country_code", options.countryCode.trim().toLowerCase())
    const query = params.toString()
    const payload = await apiFetch<ApiProducts>(`/store/products${query ? `?${query}` : ""}`)
    const products = (payload.products ?? []).map(normalizeBuyerProduct)
    return { data: products, source: "backend" }
  } catch (error) {
    return { data: [], source: "static", error: warnFallback("products", error) }
  }
}

/** S2BDIY / supplier blank listed for the buyer Shop catalog. */
export type SupplierCatalogItem = {
  id: number
  code: string
  name: string
  enName?: string
  purchasePriceCny: number
  estimatedRetailUsd?: number
  imageUrl: string
  blankDesignImageUrl?: string
  categories: Array<{ id: number; name: string; enName?: string }>
}

export type SupplierCatalogPage = {
  items: SupplierCatalogItem[]
  total: number
  page: number
  perPage: number
  lastPage: number
  supplierId: string
}

type ApiSupplierCatalog = {
  supplier_id?: string
  data?: Array<{
    id?: number | string
    code?: string
    name?: string
    en_name?: string
    purchase_price?: string | number
    view_image_src?: string
    blank_design_image?: string
    categorys?: Array<{ id?: number; name?: string; en_name?: string }>
  }>
  total?: number
  page?: number
  per_page?: number
  last_page?: number
}

const estimateRetailUsdFromCny = (cnyPrice: number): number | undefined => {
  if (!Number.isFinite(cnyPrice) || cnyPrice <= 0) return undefined
  const rate = 6.77
  const usdBase = cnyPrice / rate
  const low = 20 / rate
  const high = 40 / rate
  let markup = 2.3
  if (usdBase <= low) markup = 3
  else if (usdBase < high) markup = 3 - ((usdBase - low) / (high - low)) * 0.7
  return Math.round(cnyPrice / rate * markup * 100) / 100
}

const normalizeSupplierCatalogItem = (
  row: NonNullable<ApiSupplierCatalog["data"]>[number]
): SupplierCatalogItem | null => {
  const id = Number(row.id)
  if (!Number.isFinite(id) || id <= 0) return null
  const purchasePriceCny = Number(row.purchase_price) || 0
  return {
    id,
    code: String(row.code ?? id),
    name: String(row.en_name || row.name || `Blank ${id}`),
    enName: row.en_name ? String(row.en_name) : undefined,
    purchasePriceCny,
    estimatedRetailUsd: estimateRetailUsdFromCny(purchasePriceCny),
    imageUrl: String(row.view_image_src || row.blank_design_image || ""),
    blankDesignImageUrl: row.blank_design_image ? String(row.blank_design_image) : undefined,
    categories: (row.categorys ?? [])
      .map((category) => {
        const categoryId = Number(category.id)
        if (!Number.isFinite(categoryId) || categoryId <= 0) return null
        return {
          id: categoryId,
          name: String(category.en_name || category.name || `Category ${categoryId}`),
          enName: category.en_name ? String(category.en_name) : undefined,
        }
      })
      .filter((category): category is NonNullable<typeof category> => Boolean(category)),
  }
}

export const fetchSupplierCatalog = async (options?: {
  page?: number
  perPage?: number
  categoryId?: number | null
  keyword?: string
  supplierId?: string
}): Promise<LoadResult<SupplierCatalogPage>> => {
  const empty: SupplierCatalogPage = {
    items: [],
    total: 0,
    page: 1,
    perPage: options?.perPage ?? 24,
    lastPage: 1,
    supplierId: options?.supplierId ?? "sup_s2bdiy",
  }
  try {
    const params = new URLSearchParams({
      page: String(options?.page ?? 1),
      per_page: String(options?.perPage ?? 24),
    })
    if (options?.supplierId) params.set("supplier_id", options.supplierId)
    if (options?.categoryId) params.set("category_id", String(options.categoryId))
    if (options?.keyword?.trim()) params.set("keyword", options.keyword.trim())
    const payload = await apiFetch<ApiSupplierCatalog>(`/store/supplier-catalog?${params.toString()}`)
    const items = (payload.data ?? [])
      .map(normalizeSupplierCatalogItem)
      .filter((item): item is SupplierCatalogItem => Boolean(item))
    return {
      data: {
        items,
        total: payload.total ?? items.length,
        page: payload.page ?? options?.page ?? 1,
        perPage: payload.per_page ?? options?.perPage ?? 24,
        lastPage: payload.last_page ?? 1,
        supplierId: payload.supplier_id ?? options?.supplierId ?? "sup_s2bdiy",
      },
      source: "backend",
    }
  } catch (error) {
    return { data: empty, source: "static", error: warnFallback("supplier catalog", error) }
  }
}

export const ensureSupplierCatalogBlank = async (input: {
  basicProductId: number
  supplierId?: string
}): Promise<{ productId: string; created: boolean }> => {
  const payload = await apiFetch<{
    product_id?: string
    created?: boolean
  }>("/store/supplier-catalog/ensure", {
    method: "POST",
    body: JSON.stringify({
      basic_product_id: input.basicProductId,
      supplier_id: input.supplierId ?? "sup_s2bdiy",
    }),
  })
  const productId = payload.product_id?.trim()
  if (!productId) {
    throw new Error("Unable to open this blank for customization")
  }
  return { productId, created: Boolean(payload.created) }
}

export type SupplierCatalogCategory = {
  id: number
  name: string
  enName?: string
  parentId: number | null
}

export const fetchSupplierCatalogCategories = async (options?: {
  supplierId?: string
}): Promise<LoadResult<SupplierCatalogCategory[]>> => {
  try {
    const params = new URLSearchParams()
    if (options?.supplierId) params.set("supplier_id", options.supplierId)
    const query = params.toString()
    const payload = await apiFetch<{
      categories?: Array<{
        id?: number
        name?: string
        en_name?: string
        parent_id?: number | null
      }>
    }>(`/store/supplier-catalog/categories${query ? `?${query}` : ""}`)
    return {
      data: (payload.categories ?? [])
        .map((row): SupplierCatalogCategory | null => {
          const id = Number(row.id)
          if (!Number.isFinite(id) || id <= 0) return null
          return {
            id,
            name: String(row.en_name || row.name || `Category ${id}`),
            enName: row.en_name ? String(row.en_name) : undefined,
            parentId: row.parent_id && Number(row.parent_id) > 0 ? Number(row.parent_id) : null,
          }
        })
        .filter((row): row is SupplierCatalogCategory => row != null)
        .map((row) => ({
          ...row,
          name: toEnglishCategoryLabel(row.name, row.enName, row.id),
          enName: toEnglishCategoryLabel(row.name, row.enName, row.id),
        })),
      source: "backend",
    }
  } catch (error) {
    return { data: [], source: "static", error: warnFallback("supplier catalog categories", error) }
  }
}

type ApiMarketplaceStores = {
  stores?: Array<{
    store_id?: string
    name?: string
    slug?: string
    logo_url?: string | null
    banner_url?: string | null
    description?: string | null
    brand_name?: string | null
    product_count?: number
  }>
  count?: number
}

type ApiMarketplaceStoreDetail = {
  store?: ApiMarketplaceStores["stores"] extends Array<infer T> ? T : never
}

const normalizeMarketplaceStore = (store: NonNullable<ApiMarketplaceStores["stores"]>[number]): MarketplaceStore => ({
  storeId: store.store_id ?? "",
  name: store.name ?? "Untitled store",
  slug: store.slug ?? "",
  logoUrl: store.logo_url ?? undefined,
  bannerUrl: store.banner_url ?? undefined,
  description: store.description ?? undefined,
  brandName: store.brand_name ?? store.name ?? "Store",
  productCount: store.product_count ?? 0,
})

export const fetchMarketplaceStores = async (query = ""): Promise<LoadResult<MarketplaceStore[]>> => {
  try {
    const params = new URLSearchParams({ limit: "48" })
    if (query.trim()) params.set("q", query.trim())
    const payload = await apiFetch<ApiMarketplaceStores>(`/store/stores?${params.toString()}`)
    return {
      data: (payload.stores ?? []).map(normalizeMarketplaceStore),
      source: "backend",
    }
  } catch (error) {
    return { data: [], source: "static", error: warnFallback("marketplace stores", error) }
  }
}

export const fetchMarketplaceStoreBySlug = async (slug: string): Promise<LoadResult<MarketplaceStore | null>> => {
  try {
    const payload = await apiFetch<ApiMarketplaceStoreDetail>(`/store/stores/${encodeURIComponent(slug)}`)
    if (!payload.store) {
      return { data: null, source: "backend", error: "Store not found" }
    }
    return { data: normalizeMarketplaceStore(payload.store), source: "backend" }
  } catch (error) {
    return { data: null, source: "static", error: warnFallback("marketplace store", error) }
  }
}

export const fetchMarketplaceProducts = async (options?: {
  query?: string
  storeId?: string
}): Promise<LoadResult<StoreProduct[]>> => {
  try {
    const params = new URLSearchParams({ limit: "48" })
    if (options?.query?.trim()) params.set("q", options.query.trim())
    if (options?.storeId?.trim()) params.set("store_id", options.storeId.trim())
    const payload = await apiFetch<ApiProducts>(`/store/marketplace/products?${params.toString()}`)
    const products = (payload.products ?? []).map(normalizeBuyerProduct)
    return { data: products, source: "backend" }
  } catch (error) {
    return { data: [], source: "static", error: warnFallback("marketplace products", error) }
  }
}

export const fetchProductDetail = async (
  productId: string,
  options?: { storeId?: string }
): Promise<LoadResult<StoreProduct>> => {
  try {
    // Store context must go via X-Store-Id header. Query params like ?store= hit Medusa's
    // core /store/products/:id route and fail with "Unrecognized fields: 'store'".
    const payload = await storeScopedFetch<ApiProductDetail>(
      `/store/products/${encodeURIComponent(productId)}`,
      {},
      { storeId: options?.storeId }
    )
    if (!payload.product) {
      throw new Error("Backend returned no product")
    }
    return { data: normalizeBuyerProduct(payload.product, 0), source: "backend" }
  } catch (error) {
    return { data: { id: productId, title: "Product unavailable", category: "", price: "Price unavailable", imageUrl: "", isCartAddable: false, variants: [] }, source: "static", error: warnFallback("product detail", error) }
  }
}

export type BuyerProductShippingQuote = {
  amountUsd: number
  currencyCode: string
  logisticsName?: string | null
  dayFrom?: number | null
  dayTo?: number | null
}

export const fetchProductShippingQuote = async (productId: string, input: { countryCode?: string; sizeId?: string; quantity?: number; storeId?: string }) => {
  const params = new URLSearchParams({ country: input.countryCode ?? "us", quantity: String(input.quantity ?? 1) })
  if (input.sizeId) params.set("size_id", input.sizeId)
  const payload = await storeScopedFetch<{ quote?: { amount_usd?: number; currency_code?: string; logistics_name?: string | null; day_from?: number | null; day_to?: number | null } }>(`/store/products/${encodeURIComponent(productId)}/shipping-quote?${params.toString()}`, {}, { storeId: input.storeId })
  const quote = payload.quote
  if (!quote || typeof quote.amount_usd !== "number") throw new Error("Shipping quote unavailable")
  return { amountUsd: quote.amount_usd, currencyCode: quote.currency_code ?? "usd", logisticsName: quote.logistics_name, dayFrom: quote.day_from, dayTo: quote.day_to } satisfies BuyerProductShippingQuote
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

export const createCart = async (options?: {
  countryCode?: string
  regionId?: string
  storeId?: string
}) => {
  const regions = await listStoreRegions()
  const region = options?.regionId
    ? regions.find((entry) => entry.region_id === options.regionId)
    : resolveStoreRegion(regions, options?.countryCode ?? "us")
  const regionId = region?.region_id ?? options?.regionId
  const currencyCode = region?.currency_code ?? "usd"
  const cart = await storeScopedFetch<ApiCart>(
    "/store/carts",
    {
      method: "POST",
      body: JSON.stringify({
        currency_code: currencyCode,
        ...(regionId ? { region_id: regionId } : {}),
      }),
    },
    { storeId: options?.storeId }
  )
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
  return resolveStoreRegion(regions, countryCode)?.region_id ?? regions[0]?.region_id
}

export const resolveStoreRegion = (regions: StoreRegionSummary[], countryCode: string) => {
  const normalized = countryCode.trim().toLowerCase()
  return regions.find((region) => region.country_codes.includes(normalized)) ?? regions[0]
}

export const fetchCart = async (cartId: string, options?: StoreScopedRequestOptions) => {
  return normalizeCart(
    await storeScopedFetch<ApiCart>(`/store/carts/${encodeURIComponent(cartId)}`, {}, options)
  )
}

export const attachCustomerToCart = async (cartId: string, options?: StoreScopedRequestOptions) => {
  const payload = await storeScopedFetch<ApiCartMutation>(
    `/store/carts/${encodeURIComponent(cartId)}/customer`,
    { method: "POST", body: JSON.stringify({}) },
    options
  )
  return normalizeCart(payload.cart ?? payload)
}

export const addCartLineItem = async (
  cartId: string,
  variantId: string,
  quantity: number,
  options?: StoreScopedRequestOptions
) => {
  const payload = await storeScopedFetch<ApiCartMutation>(
    `/store/carts/${encodeURIComponent(cartId)}/line-items`,
    { method: "POST", body: JSON.stringify({ variant_id: variantId, quantity }) },
    options
  )
  if (payload.cart || payload.items) {
    return normalizeCart(payload.cart ?? payload)
  }
  return fetchCart(cartId, options)
}

export type ReorderLineInput = {
  variantId: string
  quantity: number
}

/**
 * Rebuild a checkout cart from prior order lines and return the checkout URL.
 * Custom designs / catalog items both re-add via Medusa variant_id.
 */
export const reorderItemsToCheckout = async (input: {
  storeId: string
  countryCode?: string
  items: ReorderLineInput[]
  customerId?: string | null
}): Promise<{ cart: StoreCart; checkoutHref: string }> => {
  const lines = input.items.filter((item) => item.variantId && item.quantity > 0)
  if (!lines.length) {
    throw new Error("This order has no purchasable variants to order again.")
  }

  setActiveBuyerStoreId(input.storeId)
  let cart = await createCart({
    storeId: input.storeId,
    countryCode: input.countryCode ?? "us",
  })
  for (const line of lines) {
    cart = await addCartLineItem(cart.id, line.variantId, line.quantity, {
      storeId: input.storeId,
    })
  }

  const identity = input.customerId ? `buyer:${input.customerId}` : "guest:anonymous"
  try {
    window.localStorage.setItem(getBuyerCartStorageKey(input.storeId, identity), cart.id)
  } catch {
    // Storage may be unavailable in private mode; checkout still works with the returned href.
  }

  return {
    cart,
    // Checkout must use the cart rebuilt above. Falling back to the stored
    // cart can select an older checkout reservation and route the buyer back
    // to an empty cart instead of displaying this reorder's checkout.
    checkoutHref: `/checkout?${new URLSearchParams({
      store: input.storeId,
      cart_id: cart.id,
    }).toString()}`,
  }
}

export const updateCartLineItem = async (
  cartId: string,
  lineId: string,
  quantity: number,
  options?: StoreScopedRequestOptions
) => {
  const payload = await storeScopedFetch<ApiCartMutation>(
    `/store/carts/${encodeURIComponent(cartId)}/line-items/${encodeURIComponent(lineId)}`,
    { method: "PUT", body: JSON.stringify({ quantity }) },
    options
  )
  return normalizeCart(payload.cart ?? payload)
}

export const deleteCartLineItem = async (
  cartId: string,
  lineId: string,
  options?: StoreScopedRequestOptions
) => {
  const payload = await storeScopedFetch<ApiCartMutation>(
    `/store/carts/${encodeURIComponent(cartId)}/line-items/${encodeURIComponent(lineId)}`,
    { method: "DELETE" },
    options
  )
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
    .map<CartShippingOption>((option) => {
      // Backend now returns major USD in `amount`. Fall back to minor if a legacy payload slips through.
      const major =
        typeof option.amount === "number" && Number.isFinite(option.amount)
          ? option.amount
          : typeof option.amount_minor === "number" && Number.isFinite(option.amount_minor)
            ? option.amount_minor / 100
            : undefined
      return {
        id: option.id,
        name: option.name,
        amount: major,
        currencyCode: option.currency_code ?? "usd",
        available: major != null,
        unavailableReason: major == null ? "Price is unavailable for this cart/address." : undefined,
      }
    })

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
    .filter((provider) => provider.id === "pp_system_default" || provider.id.startsWith("pp_stripe_") || provider.id.startsWith("pp_paypal_"))
    .map((provider) => ({
      id: provider.id,
      isStripe: provider.id.startsWith("pp_stripe_"),
      isPayPal: provider.id.startsWith("pp_paypal_"),
    }))
}

export const initializeCartPaymentSession = async (
  cartId: string,
  providerId: string,
  options?: StoreScopedRequestOptions
): Promise<BuyerPaymentSession> => {
  const recovery = await initializeCartPaymentRecovery(cartId, providerId, options)
  const session = recovery.paymentSession
  if (!session) throw new Error("Medusa did not return the selected payment session.")
  if (providerId.startsWith("pp_stripe_") && !session.clientSecret) {
    throw new Error("Stripe payment session is missing client_secret.")
  }
  return session
}

const paymentRecoveryInFlight = new Map<string, Promise<BuyerPaymentRecovery>>()

export const initializeCartPaymentRecovery = async (
  cartId: string,
  providerId: string,
  options?: StoreScopedRequestOptions
): Promise<BuyerPaymentRecovery> => {
  const key = `${options?.storeId ?? getScopedBuyerStoreId()}:${cartId}:${providerId}`
  const existing = paymentRecoveryInFlight.get(key)
  if (existing) return existing

  const request = postCartPaymentRecovery(cartId, providerId, false, options)
  paymentRecoveryInFlight.set(key, request)
  void request.then(
    () => {
      if (paymentRecoveryInFlight.get(key) === request) paymentRecoveryInFlight.delete(key)
    },
    () => {
      if (paymentRecoveryInFlight.get(key) === request) paymentRecoveryInFlight.delete(key)
    }
  )
  return request
}

export const reserveCheckoutPayment = async (
  cartId: string,
  providerId: string,
  options?: StoreScopedRequestOptions
): Promise<BuyerPaymentRecovery> => {
  return postCartPaymentRecovery(cartId, providerId, true, options)
}

const postCartPaymentRecovery = async (
  cartId: string,
  providerId: string,
  reserveOnly: boolean,
  options?: StoreScopedRequestOptions
): Promise<BuyerPaymentRecovery> => {
  const payload = await storeScopedFetch<ApiPaymentRecoveryResponse>(
    `/store/carts/${encodeURIComponent(cartId)}/payment-recovery`,
    {
      method: "POST",
      body: JSON.stringify({ provider_id: providerId, ...(reserveOnly ? { reserve_only: true } : {}) }),
    },
    options
  )
  const paymentAttempt = normalizePaymentAttempt(payload.payment_attempt)
  if (!paymentAttempt) throw new Error("Payment recovery did not return an attempt.")
  const paymentSession = normalizePaymentSession(payload.payment_session ?? undefined)
  const recoveredPayPalSession =
    paymentSession &&
    !paymentSession.paypalOrderId &&
    paymentAttempt.providerId?.startsWith("pp_paypal_") &&
    paymentAttempt.providerPaymentId
      ? { ...paymentSession, paypalOrderId: paymentAttempt.providerPaymentId }
      : paymentSession
  return {
    cartId: payload.cart_id ?? cartId,
    status: payload.status ?? paymentAttempt.status,
    paymentAttempt,
    paymentSession: recoveredPayPalSession,
    orderId: payload.order_id ?? paymentAttempt.completedOrderId,
    paymentIntentStatus: payload.payment_intent_status ?? null,
  }
}

export const selectCartShippingMethod = async (cartId: string, optionId: string) => {
  const payload = await apiFetch<ApiCartMutation>(`/store/carts/${encodeURIComponent(cartId)}/shipping-methods`, {
    method: "POST",
    body: JSON.stringify({ option_id: optionId }),
  })
  return normalizeCart(payload.cart ?? payload)
}

export type PreparedPlatformCheckout = {
  platform_checkout_id: string
  group_count: number
  grand_subtotal: number
  grand_total: number
  currency_code: string
  groups: Array<{
    store_id: string
    cart_id: string
    store_name: string
    item_count: number
    subtotal: number
    total: number
    currency_code: string
    platform_checkout_index: number
    platform_checkout_count: number
  }>
}

export const preparePlatformCheckout = async (
  groups: Array<{ store_id: string; cart_id: string }>
): Promise<PreparedPlatformCheckout> =>
  apiFetch<PreparedPlatformCheckout>("/store/platform/checkout/prepare", {
    method: "POST",
    body: JSON.stringify({ groups }),
  })

export const getPlatformCheckoutOrders = async (platformCheckoutId: string) =>
  apiFetch<{
    platform_checkout_id: string
    order_count: number
    orders: Array<{
      order_id: string
      display_id: string | number | null
      store_id: string
      store_name: string
      total: number | null
      currency_code: string | null
      created_at: string | null
      status: string | null
    }>
  }>(`/store/platform/checkout/${encodeURIComponent(platformCheckoutId)}/orders`)

export const payCartWithSavedPaymentMethod = async (
  cartId: string,
  paymentMethodId: string,
  options?: StoreScopedRequestOptions & { providerId?: string; returnUrl?: string }
) => {
  return storeScopedFetch<{
    provider_id?: string
    payment_intent_id?: string
    payment_intent_status?: PaymentIntent.Status
    client_secret?: string
    payment_method_id?: string
    payment_method_label?: string
  }>(
    `/store/carts/${encodeURIComponent(cartId)}/stripe/use-saved-payment-method`,
    {
      method: "POST",
      body: JSON.stringify({
        payment_method_id: paymentMethodId,
        provider_id: options?.providerId,
        return_url:
          options?.returnUrl ||
          (typeof window !== "undefined" ? `${window.location.origin}/checkout` : undefined),
      }),
    },
    options
  )
}

export const payCartWithSavedPayPalPaymentMethod = async (
  cartId: string,
  paymentMethodId: string,
  options?: StoreScopedRequestOptions & { providerId?: string }
) => storeScopedFetch<{
  provider_id?: string
  payment_method_id?: string
  payment_method_label?: string
}>(
  `/store/carts/${encodeURIComponent(cartId)}/paypal/use-saved-payment-method`,
  {
    method: "POST",
    body: JSON.stringify({ payment_method_id: paymentMethodId, provider_id: options?.providerId }),
  },
  options
)

export const completeCart = async (
  cartId: string,
  options?: {
    paymentProviderId?: string
    storeId?: string
    platformCheckout?: {
      platformCheckoutId: string
      platformCheckoutIndex: number
      platformCheckoutCount: number
    }
  }
): Promise<CompleteCartResponse> => {
  const body: Record<string, unknown> = {}
  if (options?.paymentProviderId) body.payment_provider_id = options.paymentProviderId
  if (options?.platformCheckout) {
    body.platform_checkout_id = options.platformCheckout.platformCheckoutId
    body.platform_checkout_index = options.platformCheckout.platformCheckoutIndex
    body.platform_checkout_count = options.platformCheckout.platformCheckoutCount
  }
  const payload = await storeScopedFetch<ApiCompleteCartResponse>(
    `/store/carts/${encodeURIComponent(cartId)}/complete`,
    { method: "POST", body: JSON.stringify(body) },
    { storeId: options?.storeId }
  )
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
  scope,
}: BuyerOrdersQuery = {}): Promise<BuyerOrdersPage> => {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  })
  if (status) params.set("status", status)
  if (paymentStatus) params.set("payment_status", paymentStatus)
  if (fulfillmentStatus) params.set("fulfillment_status", fulfillmentStatus)
  if (bucket) params.set("bucket", bucket)
  if (scope) params.set("scope", scope)

  const { status: httpStatus, payload } = await apiFetchWithStatus<ApiMyOrdersResponse>(`/store/customers/me/orders?${params.toString()}`)
  const rawOrders = Array.isArray(payload.orders) ? payload.orders : []
  const parsedOrders = rawOrders.map((order) => ({
      orderId: order.order_id ?? "",
      displayId: order.display_id == null ? undefined : String(order.display_id),
      orderKind: order.order_kind ?? "order",
      checkoutCartId: order.checkout_cart_id ?? null,
      checkoutRecoveryHref: order.checkout_recovery_href ?? null,
      paymentExpiresAt: order.payment_expires_at ?? null,
      paymentAttemptStatus:
        "payment_attempt_status" in order && typeof order.payment_attempt_status === "string"
          ? order.payment_attempt_status
          : null,
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
        variantId: item.variant_id ?? null,
      })),
      reviewEligible: Boolean(order.review_eligible),
      reviewCompleted: Boolean(order.review_completed),
      receiptConfirmationRequired: Boolean(order.receipt_confirmation_required),
      receiptConfirmedAt: order.receipt_confirmed_at ?? null,
      returnIntent: Boolean(order.return_intent),
      storeId: order.store_id ?? null,
      platformCheckoutId: order.platform_checkout_id ?? null,
      platformCheckoutIndex: order.platform_checkout_index ?? null,
      platformCheckoutCount: order.platform_checkout_count ?? null,
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
    eligibleAmount: request.eligible_amount ?? null,
    approvedAmount: request.approved_amount ?? null,
    currencyCode: request.currency_code ?? null,
    paymentProviderId: request.payment_provider_id ?? null,
    externalRefundId: request.external_refund_id ?? null,
    providerStatus: request.provider_status ?? "not_connected",
    createdAt: request.created_at ?? null,
    updatedAt: request.updated_at ?? null,
    policyResult: request.policy_result ?? null,
    productionStatusSnapshot: request.production_status_snapshot ?? null,
    latestProductionStatus: request.latest_production_status ?? null,
    requestedItems: Array.isArray(request.requested_items)
      ? request.requested_items.flatMap((entry) => {
          if (!entry || typeof entry !== "object") return []
          const row = entry as { item_id?: unknown; id?: unknown; quantity?: unknown }
          const itemId = String(row.item_id ?? row.id ?? "").trim()
          const quantity = Number(row.quantity)
          return itemId && Number.isInteger(quantity) && quantity > 0 ? [{ itemId, quantity }] : []
        })
      : undefined,
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

/**
 * Read a major-unit amount from the order detail API response.
 * Medusa and the backend API already use canonical major units.
 * This function just validates and normalizes the value.
 * Returns null for null/undefined/NaN.
 */
const readOrderMoneyMajor = (value: number | string | null | undefined): number | null => {
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
    receiptConfirmationRequired: Boolean(payload.receipt_confirmation_required),
    receiptConfirmedAt: payload.receipt_confirmed_at ?? null,
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
  payload: { reason: string; note?: string; items?: unknown[]; idempotencyKey: string }
): Promise<BuyerRefundRequest> => {
  const response = await apiFetch<ApiRefundRequestResponse>(
    `/store/customers/me/orders/${encodeURIComponent(orderId)}/refund-requests`,
    {
      method: "POST",
      body: JSON.stringify({
        reason: payload.reason.trim(),
        note: payload.note?.trim() || undefined,
        items: payload.items,
        idempotency_key: payload.idempotencyKey,
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

export const updateRefundRequest = async (
  orderId: string,
  requestId: string,
  input: { action: "cancel" | "provide_information"; note?: string }
): Promise<BuyerRefundRequest> => {
  const response = await apiFetch<ApiRefundRequestResponse>(
    `/store/customers/me/orders/${encodeURIComponent(orderId)}/refund-requests/${encodeURIComponent(requestId)}`,
    { method: "POST", body: JSON.stringify(input) }
  )
  const request = normalizeRefundRequest(response.refund_request)
  if (!request) throw new Error("Refund request API did not return a request.")
  return request
}

const createCustomerSession = async (token: string) => {
  await apiFetch<{ user?: unknown }>("/auth/session", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export const getBuyerGoogleAuthStatus = async (): Promise<{ enabled: boolean; callbackUrl?: string | null }> => {
  try {
    const payload = await apiFetch<{ enabled?: boolean; callback_url?: string | null }>("/store/auth/google/status")
    return {
      enabled: Boolean(payload.enabled),
      callbackUrl: payload.callback_url,
    }
  } catch {
    return { enabled: false }
  }
}

export const startBuyerGoogleAuth = async (input?: {
  callbackUrl?: string
  /** Clear an existing buyer session before starting OAuth (switch account). */
  signOutFirst?: boolean
}): Promise<{ location: string }> => {
  if (input?.signOutFirst !== false) {
    await signOutCustomer().catch(() => undefined)
  }
  const callbackUrl = input?.callbackUrl
  const payload = await apiFetch<{ location?: string; token?: string }>("/auth/customer/google", {
    method: "POST",
    body: JSON.stringify(callbackUrl ? { callback_url: callbackUrl } : {}),
  })
  if (payload.token) {
    await createCustomerSession(payload.token)
    throw Object.assign(new Error("GOOGLE_ALREADY_AUTHENTICATED"), { code: "GOOGLE_ALREADY_AUTHENTICATED" })
  }
  if (!payload.location) {
    throw new Error("Google sign-in did not return a redirect URL.")
  }
  return { location: payload.location }
}

export const completeBuyerGoogleCallback = async (input: {
  query: Record<string, string>
  rememberMe?: boolean
}): Promise<BuyerCustomer> => {
  const params = new URLSearchParams(input.query)
  const callbackPath = `/auth/customer/google/callback?${params.toString()}`
  const auth = await apiFetch<ApiAuthTokenResponse>(callbackPath, {
    method: "POST",
  })
  if (!auth.token) {
    throw new Error("Google authentication succeeded without a token.")
  }

  const completed = await apiFetch<ApiAuthTokenResponse & { customer_id?: string; created?: boolean }>(
    "/store/auth/google/complete",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify({
        remember_me: Boolean(input.rememberMe),
      }),
    }
  )
  if (!completed.token) {
    throw new Error("Unable to finish Google sign-in.")
  }
  await createCustomerSession(completed.token)
  const customer = await getCurrentCustomer()
  if (!customer) throw new Error("Unable to load customer after Google sign-in.")
  return customer
}

export const sendBuyerLoginOtp = async (email: string): Promise<BuyerOtpSendResult> => {
  const payload = await apiFetch<{
    sent?: boolean
    email?: string
    expires_at?: string
    dev_code?: string
  }>("/store/auth/otp/send", {
    method: "POST",
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  })
  return {
    sent: Boolean(payload.sent),
    email: payload.email ?? email.trim().toLowerCase(),
    expiresAt: payload.expires_at,
    devCode: payload.dev_code,
  }
}

export const confirmBuyerLoginOtp = async (input: {
  email: string
  code: string
  rememberMe?: boolean
  password?: string
}): Promise<BuyerCustomer> => {
  const payload = await apiFetch<ApiAuthTokenResponse & { expires_in?: string; remember_me?: boolean }>(
    "/store/auth/otp/confirm",
    {
      method: "POST",
      body: JSON.stringify({
        email: input.email.trim().toLowerCase(),
        code: input.code.trim(),
        remember_me: Boolean(input.rememberMe),
        ...(input.password ? { password: input.password } : {}),
      }),
    }
  )
  if (!payload.token) throw new Error("Authentication succeeded without a token.")
  await createCustomerSession(payload.token)
  const customer = await getCurrentCustomer()
  if (!customer) throw new Error("Unable to load customer after sign in.")
  return customer
}

export const getCurrentCustomer = async () => {
  const payload = await apiFetch<ApiCustomerResponse>("/store/customers/me")
  return normalizeCustomer(payload.customer)
}

export const signInCustomer = async (input: BuyerSignInInput) => {
  if (input.code?.trim()) {
    return confirmBuyerLoginOtp({
      email: input.email,
      code: input.code,
      rememberMe: input.rememberMe,
    })
  }
  if (!input.password) {
    throw new Error("Enter your password or request a sign-in code.")
  }
  try {
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
  } catch (error) {
    if (error instanceof Error && error.message && !/incorrect/i.test(error.message)) {
      throw error
    }
    throw new Error("The email or password is incorrect.")
  }
}

export const registerCustomer = async (input: BuyerRegisterInput) => {
  const email = input.email.trim().toLowerCase()
  if (input.code?.trim()) {
    if (!input.password) {
      throw new Error("Create a password after verifying your email.")
    }
    return confirmBuyerLoginOtp({
      email,
      code: input.code,
      password: input.password,
      rememberMe: input.rememberMe,
    })
  }
  if (!input.password) {
    throw new Error("Enter a password or complete email verification.")
  }
  try {
    let auth: ApiAuthTokenResponse
    try {
      auth = await apiFetch<ApiAuthTokenResponse>("/auth/customer/emailpass/register", {
        method: "POST",
        body: JSON.stringify({
          email,
          password: input.password,
        }),
      })
    } catch (registrationError) {
      // An earlier customer-create failure can leave an unbound auth identity.
      // A successful sign-in proves ownership of that identity and lets this
      // request safely finish the missing customer record.
      try {
        auth = await apiFetch<ApiAuthTokenResponse>("/auth/customer/emailpass", {
          method: "POST",
          body: JSON.stringify({ email, password: input.password }),
        })
      } catch {
        throw registrationError
      }
    }
    if (!auth.token) throw new Error("Registration succeeded without an auth token.")
    try {
      const payload = await apiFetch<ApiCustomerResponse>("/store/customers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ email }),
      })
      const signedIn = await apiFetch<ApiAuthTokenResponse>("/auth/customer/emailpass", {
        method: "POST",
        body: JSON.stringify({ email, password: input.password }),
      })
      if (!signedIn.token) throw new Error("Customer was created but session authentication did not return a token.")
      await createCustomerSession(signedIn.token)
      return normalizeCustomer(payload.customer) ?? getCurrentCustomer()
    } catch (customerCreateError) {
      // A valid identity can already be attached to a customer if a prior
      // request completed after the browser was interrupted. Reuse that
      // account instead of reporting an irrecoverable registration failure.
      await createCustomerSession(auth.token)
      const existingCustomer = await getCurrentCustomer()
      if (existingCustomer) return existingCustomer
      throw customerCreateError
    }
  } catch {
    throw new Error("We couldn't create that account. Check the email and password, or sign in if you already have an account.")
  }
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
  provider?: "stripe" | "paypal"
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
  provider?: "stripe" | "paypal"
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
    provider: method.provider === "paypal" ? "paypal" : "stripe",
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
    paypal_vault_configured?: boolean
    default_payment_method_id?: string | null
    payment_methods?: ApiPaymentMethod[]
  }>("/store/customers/me/payment-methods")

  const paymentMethods = (payload.payment_methods ?? [])
    .map(normalizePaymentMethod)
    .filter((method): method is BuyerPaymentMethod => Boolean(method))

  return {
    stripeConfigured: Boolean(payload.stripe_configured),
    paypalVaultConfigured: Boolean(payload.paypal_vault_configured),
    defaultPaymentMethodId: payload.default_payment_method_id ?? null,
    paymentMethods,
  }
}

export const createPayPalVaultSetup = async () => {
  const payload = await apiFetch<{
    setup_token_id?: string
    user_id_token?: string
    client_token?: string
    merchant_id?: string
    approval_url?: string
  }>(
    "/store/customers/me/payment-methods/paypal/setup",
    { method: "POST", body: JSON.stringify({}) }
  )
  if (!payload.setup_token_id) throw new Error("PayPal did not return an authorization token.")
  if (!payload.user_id_token && payload.client_token) {
    throw new Error("Medusa is still returning the legacy PayPal client token. Restart the Medusa backend so /paypal/setup returns user_id_token.")
  }
  if (!payload.user_id_token) throw new Error("PayPal did not return a user id token.")
  return {
    setupTokenId: payload.setup_token_id,
    userIdToken: payload.user_id_token,
    merchantId: payload.merchant_id ?? "",
    approvalUrl: payload.approval_url ?? "",
  }
}

export const completePayPalVaultSetup = async (setupTokenId: string) => {
  await apiFetch("/store/customers/me/payment-methods/paypal/complete", {
    method: "POST",
    body: JSON.stringify({ setup_token_id: setupTokenId }),
  })
  return listCustomerPaymentMethods()
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
  const payload = await apiFetch<{ sent?: boolean; email?: string; expires_at?: string; dev_code?: string; generation_id?: string }>(
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

export const requestBuyerPasswordReset = async (input: BuyerPasswordResetRequest) => {
  const payload = await apiFetch<{ sent?: boolean; message?: string; dev_code?: string; expires_at?: string }>(
    "/store/customers/password-reset",
    {
      method: "POST",
      body: JSON.stringify({ email: input.email.trim().toLowerCase() }),
    }
  )
  return payload
}

export const confirmBuyerPasswordReset = async (input: BuyerPasswordResetConfirm) => {
  const payload = await apiFetch<{ reset?: boolean; email?: string }>("/store/customers/password-reset", {
    method: "PUT",
    body: JSON.stringify({
      email: input.email.trim().toLowerCase(),
      code: input.code.trim(),
      password: input.password,
    }),
  })
  return payload
}

export type BuyerPlanId = "free" | "ai_creative"

export type BuyerPlanSnapshot = {
  planId: BuyerPlanId
  planName: string
  planStatus: "active" | "past_due" | "canceled"
  priceLabel: string
  aiCreditsRemaining: number
  aiCreditsMonthly: number
  productLimit: number
  storageLimitBytes: number
  storageUsedBytes: number
  discountPercent: number
  planRenewsAt?: string | null
  canUseAi: boolean
}

export type BuyerPlanCatalogEntry = {
  id: BuyerPlanId
  name: string
  priceLabel: string
  monthlyPriceUsd: number
  aiCreditsMonthly: number
  productLimit: number
  storageLimitBytes: number
  discountPercent: number
  description: string
}

type ApiBuyerPlan = {
  plan_id?: string
  plan_name?: string
  plan_status?: string
  price_label?: string
  ai_credits_remaining?: number
  ai_credits_monthly?: number
  product_limit?: number
  storage_limit_bytes?: number
  storage_used_bytes?: number
  plan_discount_percent?: number
  plan_renews_at?: string | null
  can_use_ai?: boolean
}

const mapBuyerPlan = (payload?: ApiBuyerPlan | null): BuyerPlanSnapshot => ({
  planId: payload?.plan_id === "ai_creative" ? "ai_creative" : "free",
  planName: payload?.plan_name ?? (payload?.plan_id === "ai_creative" ? "AI Creative" : "Free"),
  planStatus:
    payload?.plan_status === "past_due" || payload?.plan_status === "canceled"
      ? payload.plan_status
      : "active",
  priceLabel: payload?.price_label ?? "$0/month",
  aiCreditsRemaining: Number(payload?.ai_credits_remaining ?? 5),
  aiCreditsMonthly: Number(payload?.ai_credits_monthly ?? 5),
  productLimit: Number(payload?.product_limit ?? 25),
  storageLimitBytes: Number(payload?.storage_limit_bytes ?? 2 * 1024 * 1024 * 1024),
  storageUsedBytes: Number(payload?.storage_used_bytes ?? 0),
  discountPercent: Number(payload?.plan_discount_percent ?? 0),
  planRenewsAt: payload?.plan_renews_at ?? null,
  canUseAi: Boolean(payload?.can_use_ai ?? (Number(payload?.ai_credits_remaining ?? 5) > 0)),
})

export const formatStorageGb = (bytes: number) => {
  const gb = bytes / (1024 * 1024 * 1024)
  return `${gb % 1 === 0 ? gb.toFixed(0) : gb.toFixed(1)}GB`
}

export type BuyerCoupon = {
  walletId: string | null
  couponId: string
  code: string
  title: string
  description: string | null
  couponType: string
  discountAmount: number
  minSubtotal: number
  amountLabel: string
  conditionLabel: string
  scope: string
  productIds: string[]
  scopeLabel: string
  storeName: string
  quantity: number
  status: string
  expiresAt: string | null
  expiringSoon: boolean
  isDefault: boolean
}

export type CheckoutPricingBreakdown = {
  merchandiseSubtotal: number
  shippingTotal: number
  couponDiscount: number
  planDiscount: number
  planDiscountPercent: number
  discountTotal: number
  payableTotal: number
  appliedCoupon: {
    buyerCouponId: string
    couponId: string
    code: string
    title: string
    discountAmount: number
    minSubtotal: number
  } | null
  currencyCode: string
}

const mapBuyerCoupon = (row: Record<string, unknown>): BuyerCoupon => ({
  walletId: typeof row.wallet_id === "string" ? row.wallet_id : null,
  couponId: String(row.coupon_id ?? ""),
  code: String(row.code ?? ""),
  title: String(row.title ?? "Coupon"),
  description: typeof row.description === "string" ? row.description : null,
  couponType: String(row.coupon_type ?? "goods_voucher"),
  discountAmount: Number(row.discount_amount ?? 0),
  minSubtotal: Number(row.min_subtotal ?? 0),
  amountLabel: String(row.amount_label ?? ""),
  conditionLabel: String(row.condition_label ?? ""),
  scope: String(row.scope ?? "all_store"),
  productIds: Array.isArray(row.product_ids) ? row.product_ids.map(String) : [],
  scopeLabel: String(row.scope_label ?? "All items in this store"),
  storeName: String(row.store_name ?? "ciiverse"),
  quantity: Math.max(1, Number(row.quantity ?? 1)),
  status: String(row.status ?? "available"),
  expiresAt: typeof row.expires_at === "string" ? row.expires_at : null,
  expiringSoon: Boolean(row.expiring_soon),
  isDefault: Boolean(row.is_default),
})

const mapCheckoutPricing = (payload: Record<string, unknown>): CheckoutPricingBreakdown => {
  const applied = payload.applied_coupon && typeof payload.applied_coupon === "object"
    ? (payload.applied_coupon as Record<string, unknown>)
    : null
  return {
    merchandiseSubtotal: Number(payload.merchandise_subtotal ?? 0),
    shippingTotal: Number(payload.shipping_total ?? 0),
    couponDiscount: Number(payload.coupon_discount ?? 0),
    planDiscount: Number(payload.plan_discount ?? 0),
    planDiscountPercent: Number(payload.plan_discount_percent ?? 0),
    discountTotal: Number(payload.discount_total ?? 0),
    payableTotal: Number(payload.payable_total ?? 0),
    appliedCoupon: applied
      ? {
          buyerCouponId: String(applied.buyer_coupon_id ?? ""),
          couponId: String(applied.coupon_id ?? ""),
          code: String(applied.code ?? ""),
          title: String(applied.title ?? ""),
          discountAmount: Number(applied.discount_amount ?? 0),
          minSubtotal: Number(applied.min_subtotal ?? 0),
        }
      : null,
    currencyCode: String(payload.currency_code ?? "usd"),
  }
}

export const fetchMyCoupons = async (bucket = "all"): Promise<BuyerCoupon[]> => {
  const params = new URLSearchParams({ bucket })
  const payload = await apiFetch<{ coupons?: Array<Record<string, unknown>> }>(
    `/store/customers/me/coupons?${params.toString()}`
  )
  return (payload.coupons ?? []).map(mapBuyerCoupon)
}

export const claimCouponByCode = async (code: string): Promise<BuyerCoupon> => {
  const payload = await apiFetch<{ coupon?: Record<string, unknown> }>(
    "/store/customers/me/coupons/claim",
    { method: "POST", body: JSON.stringify({ code }) }
  )
  if (!payload.coupon) throw new Error("Coupon claim did not return a coupon")
  return mapBuyerCoupon(payload.coupon)
}

export const fetchCartCouponPricing = async (cartId: string): Promise<CheckoutPricingBreakdown> => {
  const payload = await apiFetch<{ pricing?: Record<string, unknown> }>(
    `/store/carts/${encodeURIComponent(cartId)}/coupons`
  )
  return mapCheckoutPricing((payload.pricing ?? {}) as Record<string, unknown>)
}

export const applyCartCoupon = async (
  cartId: string,
  buyerCouponId: string
): Promise<CheckoutPricingBreakdown> => {
  const payload = await apiFetch<{ pricing?: Record<string, unknown> }>(
    `/store/carts/${encodeURIComponent(cartId)}/coupons`,
    {
      method: "POST",
      body: JSON.stringify({ action: "apply", buyer_coupon_id: buyerCouponId }),
    }
  )
  return mapCheckoutPricing((payload.pricing ?? {}) as Record<string, unknown>)
}

export const clearCartCoupon = async (cartId: string): Promise<CheckoutPricingBreakdown> => {
  const payload = await apiFetch<{ pricing?: Record<string, unknown> }>(
    `/store/carts/${encodeURIComponent(cartId)}/coupons`,
    { method: "POST", body: JSON.stringify({ action: "clear" }) }
  )
  return mapCheckoutPricing((payload.pricing ?? {}) as Record<string, unknown>)
}

export const fetchBuyerPlan = async (): Promise<{
  plan: BuyerPlanSnapshot
  catalog: BuyerPlanCatalogEntry[]
}> => {
  const payload = await apiFetch<{
    plan?: ApiBuyerPlan
    catalog?: Array<{
      id?: string
      name?: string
      price_label?: string
      monthly_price_usd?: number
      ai_credits_monthly?: number
      product_limit?: number
      storage_limit_bytes?: number
      discount_percent?: number
      description?: string
    }>
  }>("/store/customers/me/plan")

  return {
    plan: mapBuyerPlan(payload.plan),
    catalog: (payload.catalog ?? []).map((entry) => ({
      id: entry.id === "ai_creative" ? "ai_creative" : "free",
      name: entry.name ?? "Plan",
      priceLabel: entry.price_label ?? "$0/month",
      monthlyPriceUsd: Number(entry.monthly_price_usd ?? 0),
      aiCreditsMonthly: Number(entry.ai_credits_monthly ?? 5),
      productLimit: Number(entry.product_limit ?? 25),
      storageLimitBytes: Number(entry.storage_limit_bytes ?? 2 * 1024 * 1024 * 1024),
      discountPercent: Number(entry.discount_percent ?? 0),
      description: entry.description ?? "",
    })),
  }
}

export const upgradeBuyerPlan = async (planId: BuyerPlanId) => {
  const payload = await apiFetch<{
    plan?: ApiBuyerPlan
    message?: string
    billing?: string
  }>("/store/customers/me/plan", {
    method: "POST",
    body: JSON.stringify({ action: "upgrade", plan_id: planId }),
  })
  return {
    plan: mapBuyerPlan(payload.plan),
    message: payload.message,
    billing: payload.billing,
  }
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

export const fetchBuyerStoreMessages = async (options?: { storeId?: string }) => {
  const payload = await storeScopedFetch<{ messages?: Array<Record<string, unknown>> }>(
    "/store/messages",
    {},
    { storeId: options?.storeId }
  )
  return (payload.messages ?? []).map((message) =>
    normalizeStoreMessage(message as Parameters<typeof normalizeStoreMessage>[0])
  )
}

export const sendBuyerStoreMessage = async (input: { body: string; orderId?: string; storeId?: string }) =>
  storeScopedFetch<{ message?: Record<string, unknown> }>(
    "/store/messages",
    {
      method: "POST",
      body: JSON.stringify({
        body: input.body,
        order_id: input.orderId,
      }),
    },
    { storeId: input.storeId }
  )

// ---- Designer SDK ----

export type DesignConfig = {
  sdkBaseUrl: string
  token: string
  basicProductId: string
  viewId?: string | null
  designType?: number
  designerUrl: string
  editorMode?: "new" | "redesign"
  s2bProductId?: string | null
  sizeId?: string | null
  colorId?: string | null
  savedDesign?: DesignCompleteResult | null
}

type ApiDesignConfig = {
  sdk_base_url?: string
  token?: string
  basic_product_id?: string
  view_id?: string | null
  design_type?: number
  designer_url?: string
  editor_mode?: "new" | "redesign"
  s2b_product_id?: string | null
  size_id?: string | null
  color_id?: string | null
  saved_design?: {
    mc_product_id?: string
    medusa_variant_id?: string | null
    title?: string
    mockup_url?: string | null
    price?: number | null
    supplier_product_id?: string | null
    basic_product_id?: string | null
    blank_product_id?: string | null
    size_id?: string | null
    color_id?: string | null
    size_name?: string | null
    color_name?: string | null
    editor_path?: string
  } | null
}

const mapSavedDesignFromConfig = (
  saved: NonNullable<ApiDesignConfig["saved_design"]>
): DesignCompleteResult | null => {
  if (!saved.mc_product_id || !saved.medusa_variant_id) return null
  const sizeId = saved.size_id != null ? Number(saved.size_id) : NaN
  const colorId = saved.color_id != null ? Number(saved.color_id) : NaN
  const sizes =
    Number.isFinite(sizeId) && saved.size_name
      ? [{ id: sizeId, name: saved.size_name }]
      : []
  const colors =
    Number.isFinite(colorId) && saved.color_name
      ? [{ id: colorId, name: saved.color_name }]
      : []
  const variants =
    Number.isFinite(sizeId) && Number.isFinite(colorId)
      ? [
          {
            sizeId,
            colorId,
            sizeName: saved.size_name ?? `Size ${sizeId}`,
            colorName: saved.color_name ?? `Color ${colorId}`,
            supplierVariantId: `${saved.supplier_product_id ?? "s2b"}_${sizeId}_${colorId}`,
            medusaVariantId: saved.medusa_variant_id,
          },
        ]
      : []
  return {
    mcProductId: saved.mc_product_id,
    variantId: saved.medusa_variant_id,
    title: saved.title ?? "Custom Design",
    mockupUrl: saved.mockup_url ?? null,
    price: saved.price ?? undefined,
    s2bProductId: saved.supplier_product_id ?? null,
    basicProductId: saved.basic_product_id ?? null,
    blankProductId: saved.blank_product_id ?? null,
    status: "draft",
    saveAs: "draft",
    editorPath: saved.editor_path ?? `/design/${encodeURIComponent(saved.mc_product_id)}`,
    sizes,
    colors,
    variants,
    selectedSizeId: Number.isFinite(sizeId) ? sizeId : null,
    selectedColorId: Number.isFinite(colorId) ? colorId : null,
  }
}

export const fetchProductDesignConfig = async (
  productId: string,
  options?: { materialId?: string | null }
): Promise<DesignConfig> => {
  const params = new URLSearchParams()
  if (options?.materialId) params.set("materialId", options.materialId)
  const qs = params.toString()
  const payload = await apiFetch<ApiDesignConfig>(
    `/store/products/${encodeURIComponent(productId)}/design-config${qs ? `?${qs}` : ""}`
  )
  if (!payload.token || !payload.basic_product_id || !payload.sdk_base_url) {
    throw new Error("Design config is incomplete")
  }
  const sdkBaseUrl = payload.sdk_base_url
  const designerUrl =
    payload.designer_url ??
    `${sdkBaseUrl.replace(/\/$/, "")}/singleDesign?${new URLSearchParams({
      token: payload.token,
      basicProductId: payload.basic_product_id,
    }).toString()}`
  return {
    sdkBaseUrl,
    token: payload.token,
    basicProductId: payload.basic_product_id,
    viewId: payload.view_id ?? null,
    designType: payload.design_type,
    designerUrl,
    editorMode: payload.editor_mode,
    s2bProductId: payload.s2b_product_id ?? null,
    sizeId: payload.size_id ?? null,
    colorId: payload.color_id ?? null,
    savedDesign: payload.saved_design ? mapSavedDesignFromConfig(payload.saved_design) : null,
  }
}

export type DesignCompleteInput = {
  s2bProductId: number | string
  basicProductId: number | string
  quantity?: number
  sizeId?: number | string | null
  colorId?: number | string | null
  price?: number | null
  mockupUrl?: string | null
  saveAs?: "draft" | "ready"
  blankProductId?: string | null
  guestKey?: string | null
}

export type DesignOption = {
  id: number
  name: string
}

export type DesignVariantOption = {
  sizeId: number
  colorId: number
  sizeName: string
  colorName: string
  supplierVariantId: string
  medusaVariantId: string | null
}

export type DesignCompleteResult = {
  mcProductId: string
  variantId: string
  title: string
  mockupUrl?: string | null
  price?: number
  s2bProductId?: string | null
  basicProductId?: string | null
  blankProductId?: string | null
  status?: string
  saveAs?: "draft" | "ready"
  editorPath?: string | null
  sizes: DesignOption[]
  colors: DesignOption[]
  variants: DesignVariantOption[]
  selectedSizeId: number | null
  selectedColorId: number | null
}

type ApiDesignCompleteResult = {
  mc_product_id?: string
  medusa_variant_id?: string
  title?: string
  mockup_url?: string | null
  price?: number
  supplier_product_id?: string
  basic_product_id?: string
  blank_product_id?: string | null
  status?: string
  save_as?: "draft" | "ready"
  editor_path?: string
  sizes?: Array<{ id?: number; name?: string }>
  colors?: Array<{ id?: number; name?: string }>
  variants?: Array<{
    size_id?: number
    color_id?: number
    size_name?: string
    color_name?: string
    supplier_variant_id?: string
    medusa_variant_id?: string | null
  }>
  selected_size_id?: number
  selected_color_id?: number
}

const mapDesignCompletePayload = (payload: ApiDesignCompleteResult): DesignCompleteResult => {
  if (!payload.mc_product_id || !payload.medusa_variant_id) {
    throw new Error("Design session did not return a sellable product variant")
  }
  const variants: DesignVariantOption[] = (payload.variants ?? [])
    .map((row) => {
      const sizeId = typeof row.size_id === "number" ? row.size_id : Number(row.size_id)
      const colorId = typeof row.color_id === "number" ? row.color_id : Number(row.color_id)
      if (!Number.isFinite(sizeId) || !Number.isFinite(colorId)) return null
      return {
        sizeId,
        colorId,
        sizeName: row.size_name ?? `Size ${sizeId}`,
        colorName: row.color_name ?? `Color ${colorId}`,
        supplierVariantId: row.supplier_variant_id ?? `${sizeId}_${colorId}`,
        medusaVariantId: row.medusa_variant_id ?? null,
      }
    })
    .filter((row): row is DesignVariantOption => Boolean(row))

  return {
    mcProductId: payload.mc_product_id,
    variantId: payload.medusa_variant_id,
    title: payload.title ?? "Custom Design",
    mockupUrl: payload.mockup_url ?? null,
    price: payload.price,
    s2bProductId: payload.supplier_product_id ?? null,
    basicProductId: payload.basic_product_id ?? null,
    blankProductId: payload.blank_product_id ?? null,
    status: payload.status,
    saveAs: payload.save_as ?? "draft",
    editorPath: payload.editor_path ?? null,
    sizes: (payload.sizes ?? [])
      .map((row) => ({
        id: typeof row.id === "number" ? row.id : Number(row.id),
        name: row.name ?? "",
      }))
      .filter((row) => Number.isFinite(row.id) && row.name),
    colors: (payload.colors ?? [])
      .map((row) => ({
        id: typeof row.id === "number" ? row.id : Number(row.id),
        name: row.name ?? "",
      }))
      .filter((row) => Number.isFinite(row.id) && row.name),
    variants,
    selectedSizeId:
      typeof payload.selected_size_id === "number" ? payload.selected_size_id : null,
    selectedColorId:
      typeof payload.selected_color_id === "number" ? payload.selected_color_id : null,
  }
}

export const completeDesignSession = async (input: DesignCompleteInput): Promise<DesignCompleteResult> => {
  const payload = await apiFetch<ApiDesignCompleteResult>("/store/design-sessions/complete", {
    method: "POST",
    body: JSON.stringify({
      s2b_product_id: input.s2bProductId,
      basic_product_id: input.basicProductId,
      quantity: input.quantity ?? 1,
      size_id: input.sizeId ?? undefined,
      color_id: input.colorId ?? undefined,
      price: input.price ?? undefined,
      mockup_url: input.mockupUrl ?? undefined,
      save_as: input.saveAs ?? "draft",
      blank_product_id: input.blankProductId ?? undefined,
      guest_key: input.guestKey ?? undefined,
    }),
  })
  return mapDesignCompletePayload(payload)
}

export type DesignClaimInput = {
  basicProductId: number | string
  blankProductId?: string | null
  guestKey?: string | null
  excludeS2bIds?: Array<number | string>
  saveAs?: "draft" | "ready"
  snapshotOnly?: boolean
  mockupUrl?: string | null
}

export type DesignClaimResult =
  | { claimed: false; knownS2bIds: string[] }
  | ({ claimed: true; knownS2bIds: string[] } & DesignCompleteResult)

export const claimLatestDesignSession = async (
  input: DesignClaimInput
): Promise<DesignClaimResult> => {
  const payload = await apiFetch<ApiDesignCompleteResult & { claimed?: boolean; known_s2b_ids?: string[] }>(
    "/store/design-sessions/claim-latest",
    {
      method: "POST",
      body: JSON.stringify({
        basic_product_id: input.basicProductId,
        blank_product_id: input.blankProductId ?? undefined,
        guest_key: input.guestKey ?? undefined,
        exclude_s2b_ids: input.excludeS2bIds ?? [],
        save_as: input.saveAs ?? "draft",
        snapshot_only: Boolean(input.snapshotOnly),
        mockup_url: input.mockupUrl ?? undefined,
      }),
    }
  )
  const knownS2bIds = Array.isArray(payload.known_s2b_ids)
    ? payload.known_s2b_ids.map(String)
    : []
  if (!payload.claimed) {
    return { claimed: false, knownS2bIds }
  }
  return {
    claimed: true,
    knownS2bIds,
    ...mapDesignCompletePayload(payload),
  }
}

export type BuyerMyDesign = {
  mcProductId: string
  variantId?: string | null
  title: string
  mockupUrl?: string | null
  price?: number | null
  status?: string | null
  s2bProductId?: string | null
  basicProductId?: string | null
  blankProductId?: string | null
  editorPath: string
  createdAt?: string | null
}

export const fetchBuyerMyDesigns = async (guestKey?: string | null): Promise<LoadResult<BuyerMyDesign[]>> => {
  try {
    const params = new URLSearchParams()
    if (guestKey) params.set("guest_key", guestKey)
    const query = params.toString()
    const payload = await apiFetch<{
      designs?: Array<{
        mc_product_id?: string
        medusa_variant_id?: string | null
        title?: string
        mockup_url?: string | null
        price?: number | null
        status?: string
        s2b_product_id?: string | null
        basic_product_id?: string | null
        blank_product_id?: string | null
        editor_path?: string
        created_at?: string | null
      }>
    }>(`/store/my-designs${query ? `?${query}` : ""}`)
    return {
      data: (payload.designs ?? [])
        .map((row) => ({
          mcProductId: String(row.mc_product_id ?? ""),
          variantId: row.medusa_variant_id ?? null,
          title: row.title ?? "Custom Design",
          mockupUrl: row.mockup_url ?? null,
          price: row.price ?? null,
          status: row.status ?? null,
          s2bProductId: row.s2b_product_id ?? null,
          basicProductId: row.basic_product_id ?? null,
          blankProductId: row.blank_product_id ?? null,
          editorPath: row.editor_path || `/design/${encodeURIComponent(String(row.mc_product_id ?? ""))}`,
          createdAt: row.created_at ?? null,
        }))
        .filter((item) => item.mcProductId),
      source: "backend",
    }
  } catch (error) {
    return { data: [], source: "static", error: warnFallback("my designs", error) }
  }
}

// ---- Buyer AI Studio ----

export type BuyerAiJobResult = {
  jobId: string
  status: string
  progress: number
  currentStep?: string | null
  error?: string | null
  designImageUrl?: string | null
  mockupImageUrl?: string | null
  materialId?: string | null
  materialUrl?: string | null
  editorPath?: string | null
  title?: string | null
  mockMode?: boolean
}

type ApiBuyerAiJob = {
  job_id?: string
  status?: string
  progress?: number
  current_step?: string | null
  error?: string | null
  result?: {
    design_image_url?: string
    mockup_image_url?: string
    material_id?: string | null
    material_url?: string | null
    editor_path?: string
    title?: string
    mock_mode?: boolean
  } | null
}

const mapBuyerAiJob = (payload: ApiBuyerAiJob): BuyerAiJobResult => ({
  jobId: payload.job_id ?? "",
  status: payload.status ?? "queued",
  progress: payload.progress ?? 0,
  currentStep: payload.current_step ?? null,
  error: payload.error ?? null,
  designImageUrl: payload.result?.design_image_url ?? null,
  mockupImageUrl: payload.result?.mockup_image_url ?? null,
  materialId: payload.result?.material_id ?? null,
  materialUrl: payload.result?.material_url ?? null,
  editorPath: payload.result?.editor_path ?? null,
  title: payload.result?.title ?? null,
  mockMode: Boolean(payload.result?.mock_mode),
})

export const startBuyerAiGenerate = async (input: {
  prompt: string
  productId?: string | null
  stylePreset?: string
  guestKey?: string | null
}): Promise<BuyerAiJobResult> => {
  const payload = await apiFetch<ApiBuyerAiJob>("/store/ai/generate", {
    method: "POST",
    body: JSON.stringify({
      product_id: input.productId || undefined,
      prompt: input.prompt,
      style_preset: input.stylePreset,
      print_position: "front",
      guest_key: input.guestKey ?? undefined,
    }),
  })
  if (!payload.job_id) {
    throw new Error("AI generate did not return a job id")
  }
  return mapBuyerAiJob(payload)
}

export const fetchBuyerAiJob = async (
  jobId: string,
  guestKey?: string | null
): Promise<BuyerAiJobResult> => {
  const params = new URLSearchParams()
  if (guestKey) params.set("guest_key", guestKey)
  const query = params.toString()
  const payload = await apiFetch<ApiBuyerAiJob>(
    `/store/ai/jobs/${encodeURIComponent(jobId)}${query ? `?${query}` : ""}`
  )
  return mapBuyerAiJob(payload)
}

export type BuyerAiMaterial = {
  id: string
  jobId: string
  createdAt?: string | null
  prompt?: string | null
  title?: string | null
  designImageUrl?: string | null
  printFileUrl?: string | null
  mockupImageUrl?: string | null
  materialId?: string | null
  materialUrl?: string | null
  productId?: string | null
  editorPath?: string | null
  mockMode?: boolean
}

export const fetchBuyerAiMaterials = async (
  guestKey?: string | null
): Promise<LoadResult<BuyerAiMaterial[]>> => {
  try {
    const params = new URLSearchParams()
    if (guestKey) params.set("guest_key", guestKey)
    const query = params.toString()
    const payload = await apiFetch<{
      materials?: Array<{
        id?: string
        job_id?: string
        created_at?: string | null
        prompt?: string | null
        title?: string | null
        design_image_url?: string | null
        print_file_url?: string | null
        mockup_image_url?: string | null
        material_id?: string | null
        material_url?: string | null
        product_id?: string | null
        editor_path?: string | null
        mock_mode?: boolean
      }>
    }>(`/store/ai/materials${query ? `?${query}` : ""}`)
    return {
      data: (payload.materials ?? []).map((row) => ({
        id: String(row.id ?? row.job_id ?? ""),
        jobId: String(row.job_id ?? row.id ?? ""),
        createdAt: row.created_at ?? null,
        prompt: row.prompt ?? null,
        title: row.title ?? null,
        designImageUrl: row.design_image_url ?? null,
        printFileUrl: row.print_file_url ?? null,
        mockupImageUrl: row.mockup_image_url ?? null,
        materialId: row.material_id ?? null,
        materialUrl: row.material_url ?? null,
        productId: row.product_id ?? null,
        editorPath: row.editor_path ?? null,
        mockMode: Boolean(row.mock_mode),
      })).filter((item) => item.id),
      source: "backend",
    }
  } catch (error) {
    return { data: [], source: "static", error: warnFallback("buyer ai materials", error) }
  }
}

// ─── Product Favorites ─────────────────────────────────────────────────────────

type FavoriteCheckResult = {
  is_favorited: boolean
}

type FavoriteToggleResult = {
  is_favorited: boolean
  message?: string
}

type FavoriteListResult = {
  favorites: Array<{
    id: string
    title: string
    price?: number
    image_url?: string
    status?: string
    created_at?: string
  }>
  count: number
}

export const checkProductFavorite = async (productId: string): Promise<FavoriteCheckResult> => {
  try {
    return await apiFetch<FavoriteCheckResult>(`/store/products/${encodeURIComponent(productId)}/favorite`)
  } catch {
    return { is_favorited: false }
  }
}

export const toggleProductFavorite = async (productId: string, isCurrentlyFavorited: boolean): Promise<FavoriteToggleResult> => {
  if (isCurrentlyFavorited) {
    return apiFetch<FavoriteToggleResult>(`/store/products/${encodeURIComponent(productId)}/favorite`, {
      method: "DELETE",
    })
  }
  return apiFetch<FavoriteToggleResult>(`/store/products/${encodeURIComponent(productId)}/favorite`, {
    method: "POST",
  })
}

export const fetchFavoriteProducts = async (): Promise<FavoriteListResult> => {
  try {
    return await apiFetch<FavoriteListResult>("/store/favorites")
  } catch {
    return { favorites: [], count: 0 }
  }
}

// ─── Custom Editor APIs (proxy to S2BDIY, token stays server-side) ───

/**
 * Upload a design image to S2BDIY via our backend proxy.
 * Returns material_id for use in quickCreate.
 */
export const uploadDesignMaterial = async (imageBase64: string): Promise<{
  material_id: number
  material_url: string | null
  name: string
}> => {
  const payload = await apiFetch<{
    material_id: number
    material_url: string | null
    name: string
  }>("/store/design-sessions/material-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_base64: imageBase64 }),
  })
  return payload
}

/**
 * Create a designed product on S2BDIY via our backend proxy.
 * Returns s2b_product_id.
 */
export const quickCreateDesign = async (input: {
  basicProductId: number | string
  sizeId: number | string
  colorId: number | string
  materialId: number | string
  viewId?: number | string
  designType?: number
  name?: string
}): Promise<{
  s2b_product_id: number | string
  product_name?: string
  product_code?: string
}> => {
  const payload = await apiFetch<{
    s2b_product_id: number | string
    product_name?: string
    product_code?: string
  }>("/store/design-sessions/quick-create", {
    method: "POST",
    body: JSON.stringify({
      basic_product_id: input.basicProductId,
      size_id: input.sizeId,
      color_id: input.colorId,
      name: input.name ?? "Custom Design",
      views: [
        {
          view_id: input.viewId ?? 1,
          objects: [
            {
              type: "image",
              material_id: input.materialId,
              design_type: input.designType ?? 1,
            },
          ],
        },
      ],
    }),
  })
  return payload
}

/**
 * Get designed product detail (mockup URLs) from S2BDIY via our backend proxy.
 */
export const fetchS2bProductDetail = async (s2bProductId: number | string): Promise<{
  product_id: number | string
  product_name: string | null
  mockup_urls: string[]
  variants: Array<{
    id: number
    size_id: number
    color_id: number
    size_name: string
    color_name: string
  }>
}> => {
  const payload = await apiFetch<{
    product_id: number | string
    product_name: string | null
    mockup_urls: string[]
    variants: Array<{
      id: number
      size_id: number
      color_id: number
      size_name: string
      color_name: string
    }>
  }>(`/store/design-sessions/product-detail/${encodeURIComponent(String(s2bProductId))}`)
  return payload
}

export const fetchBuyerWallet = async (): Promise<BuyerWallet> => {
  const payload = await apiFetch<{ wallet: BuyerWallet }>("/store/customers/me/wallet")
  return payload.wallet
}

export const createBuyerWalletWithdrawal = async (amount: number, currencyCode: string, requestId: string) => {
  const payload = await apiFetch<{ withdrawal: BuyerWalletWithdrawal; wallet: BuyerWallet }>(
    "/store/customers/me/wallet/withdrawals",
    {
      method: "POST",
      body: JSON.stringify({ amount, currency_code: currencyCode.toLowerCase(), request_id: requestId }),
    }
  )
  return payload
}
