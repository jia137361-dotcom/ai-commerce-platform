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

