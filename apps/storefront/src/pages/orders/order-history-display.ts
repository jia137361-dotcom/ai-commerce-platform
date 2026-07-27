import type { BuyerOrderDetail, BuyerOrderSummary } from "../../lib/buyer-api"

export type BuyerOrderDisplayStatus =
  | "cancelled"
  | "unpaid"
  | "packing"
  | "awaiting_receipt"
  | "awaiting_review"
  | "reviewed"
  | "completed"
  | "refunding"

const PAID_STATUSES = new Set(["paid", "captured", "payment_recorded_as_paid"])

export const buyerOrderDisplayStatusLabel = (status: BuyerOrderDisplayStatus) => {
  switch (status) {
    case "cancelled":
      return "Cancelled"
    case "unpaid":
      return "Unpaid"
    case "packing":
      return "Processing"
    case "awaiting_receipt":
      return "Delivered, pending confirmation"
    case "awaiting_review":
      return "Received"
    case "reviewed":
      return "Received"
    case "completed":
      return "Closed"
    case "refunding":
      return "Refund / After-sales"
    default:
      return "Processing"
  }
}

/** Fallback product link when reorder-by-variant is unavailable. */
export const orderAgainHref = (order: BuyerOrderSummary) => {
  const productId = order.previewItems.find((item) => item.productId)?.productId
  if (!productId) return "/store"
  const params = new URLSearchParams()
  if (order.storeId) params.set("store", order.storeId)
  const query = params.toString()
  return `/products/${encodeURIComponent(productId)}${query ? `?${query}` : ""}`
}

export const collectReorderLinesFromSummary = (order: BuyerOrderSummary) =>
  order.previewItems
    .filter((item): item is typeof item & { variantId: string } => Boolean(item.variantId))
    .map((item) => ({
      variantId: item.variantId,
      quantity: Math.max(1, item.quantity || 1),
    }))

export const collectReorderLinesFromDetail = (order: BuyerOrderDetail) =>
  order.items
    .filter((item): item is typeof item & { variantId: string } => Boolean(item.variantId))
    .map((item) => ({
      variantId: item.variantId,
      quantity: Math.max(1, item.quantity || 1),
    }))

export const formatOrderTime = (value?: string | null) => {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export const resolveBuyerOrderDisplayStatus = (order: BuyerOrderSummary): BuyerOrderDisplayStatus => {
  if (order.buyerDisplayStatus) return order.buyerDisplayStatus
  if (order.status === "cancelled") return "cancelled"
  if (order.returnIntent) return "refunding"
  if (!PAID_STATUSES.has(order.paymentStatus ?? "")) return "unpaid"
  const fulfillment = order.fulfillmentStatus ?? "none"
  if (!["shipped", "delivered"].includes(fulfillment)) return "packing"
  if (!order.receiptConfirmedAt && order.receiptConfirmationRequired !== false) {
    if (order.receiptConfirmationRequired || fulfillment === "shipped" || fulfillment === "delivered") {
      return "awaiting_receipt"
    }
  }
  if (order.reviewCompleted) return "reviewed"
  if (order.reviewEligible) return "awaiting_review"
  if (order.receiptConfirmedAt) return "completed"
  return "awaiting_receipt"
}

export const canTrackOrder = (order: BuyerOrderSummary) =>
  ["shipped", "delivered"].includes(order.fulfillmentStatus ?? "") || order.status === "completed"

export const canConfirmReceipt = (order: BuyerOrderSummary) =>
  Boolean(order.receiptConfirmationRequired) ||
  (["shipped", "delivered"].includes(order.fulfillmentStatus ?? "") && !order.receiptConfirmedAt)

export const canRequestRefund = (order: BuyerOrderSummary) =>
  Boolean(order.receiptConfirmedAt) && !order.returnIntent

export const canViewReview = (order: BuyerOrderSummary) =>
  Boolean(order.reviewCompleted && order.previewItems[0]?.productId)

export const buildViewReviewHref = (order: BuyerOrderSummary) => {
  const productId = order.previewItems[0]?.productId
  if (!productId) return null
  const orderNumber = order.displayId ?? order.orderId
  const params = new URLSearchParams({ viewReviewOrder: orderNumber })
  if (order.storeId) params.set("store", order.storeId)
  return `/products/${encodeURIComponent(productId)}?${params.toString()}#reviews`
}
