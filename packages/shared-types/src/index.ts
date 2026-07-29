export const ProductStatuses = ["draft", "published", "unpublished", "archived"] as const
export const ProductSources = ["manual", "ai"] as const
export const OrderPaymentStatuses = ["pending", "paid", "cancelled", "refunded"] as const
export const FulfillmentStatuses = [
  "not_started",
  "waiting",
  "queued",
  "pushed",
  "in_production",
  "shipped",
  "delivered",
  "failed"
] as const

export type ProductStatus = (typeof ProductStatuses)[number]
export type ProductSource = (typeof ProductSources)[number]
export type OrderPaymentStatus = (typeof OrderPaymentStatuses)[number]
export type FulfillmentStatus = (typeof FulfillmentStatuses)[number]

export type ProductVariantRow = {
  supplier_variant_id: string
  medusa_variant_id?: string
  supplier_size_id?: string
  supplier_color_id?: string
  option_type?: string
  option_value?: string
  color: string
  size: string
  price: number
  cost?: number
  weight?: number | null
  supplier_sku?: string | null
  image_url?: string | null
  enabled?: boolean
}

export type ProductRegionSummary = {
  region_id: string
  name: string
  currency_code: string
  country_codes: string[]
}

export type ProductGalleryItem = {
  id: string
  label: string
  url: string
  kind: "mockup" | "design" | "print_file"
}

export type NormalizedProduct = {
  product_id: string
  store_id: string
  title: string
  description?: string | null
  status: string
  source?: string | null
  ai_job_id?: string | null
  prompt?: string | null
  price?: number | null
  cost?: number | null
  tags?: string[]
  category_ids?: string[]
  supplier_id?: string | null
  basic_product_id?: string | null
  platform_product_id?: string | null
  supplier_product_id?: string | null
  supplier_variant_id?: string | null
  medusa_variant_id?: string | null
  is_cart_addable?: boolean
  requires_shipping?: boolean
  supported_region_ids?: string[]
  supported_regions?: ProductRegionSummary[]
  ship_from_country?: string | null
  ship_from_label?: string | null
  variants?: ProductVariantRow[]
  design_image_url?: string | null
  mockup_image_url?: string | null
  print_file_url?: string | null
  image_url?: string | null
  metadata?: Record<string, unknown>
}

export type AiJobProgress = {
  job_id: string
  store_id: string
  status: string
  progress: number
  current_step: string | null
  estimated_seconds: number | null
  product_id: string | null
  error: string | null
}

export type FulfillmentTimelineStep = {
  key: string
  label: string
  status: "pending" | "active" | "completed"
  timestamp: string | null
}

export type StoreNotification = {
  id: string
  type: string
  title: string
  body: string | null
  read: boolean
  created_at?: string
}

export type StoreSettings = {
  store_id: string
  brand_name: string | null
  logo_url: string | null
  support_email: string | null
  seo_title: string | null
  seo_description: string | null
  metadata: Record<string, unknown>
}

export * from "./store-policy-presets.js"
