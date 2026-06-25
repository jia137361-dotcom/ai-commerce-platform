import type { BuyerOrderSummary } from "../../lib/buyer-api"

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
      return "To receive"
    case "awaiting_review":
      return "Awaiting review"
    case "reviewed":
      return "Reviewed"
    case "completed":
      return "Completed"
    case "refunding":
      return "Refund in progress"
    default:
      return "Processing"
  }
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
  return `/products/${encodeURIComponent(productId)}?${params.toString()}#reviews`
}
