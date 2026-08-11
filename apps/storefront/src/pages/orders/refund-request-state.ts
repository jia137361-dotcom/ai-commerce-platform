import type { BuyerOrderDetailItem, BuyerRefundRequest } from "../../lib/buyer-api"

export const REFUND_REASONS = [
  ["changed_mind", "Changed my mind"],
  ["ordered_by_mistake", "Ordered by mistake"],
  ["wrong_item", "Wrong item"],
  ["damaged", "Damaged"],
  ["defective", "Defective"],
  ["not_as_described", "Not as described"],
  ["late_delivery", "Late delivery"],
  ["other", "Other"],
] as const

export const REFUND_STATUS_LABELS: Record<string, string> = {
  requested: "Request submitted",
  pending: "Request submitted",
  auto_review: "Under automatic review",
  manual_review: "Under seller review",
  awaiting_information: "More information required",
  approved: "Approved",
  processing: "Refund processing",
  refund_processing: "Refund processing",
  refund_pending: "Refund pending",
  partially_refunded: "Partially refunded",
  refunded: "Refunded",
  processed: "Refunded",
  rejected: "Rejected",
  refund_failed: "Refund failed",
  failed: "Refund failed",
  cancelled: "Cancelled",
}

const lineAmount = (item: BuyerOrderDetailItem) => {
  if (typeof item.subtotal === "number") return item.subtotal
  if (typeof item.unitPrice === "number") return item.unitPrice * item.quantity
  return 0
}

export const buildRefundSelection = (
  items: BuyerOrderDetailItem[],
  quantities: Record<string, number>,
  orderTotal?: number | null
) => {
  const selectedItems = items.flatMap((item) => {
    const quantity = Math.min(item.quantity, Math.max(0, Math.floor(quantities[item.id] ?? 0)))
    return quantity > 0 ? [{ item_id: item.id, quantity }] : []
  })
  const fullOrder = items.length > 0 && items.every((item) => quantities[item.id] === item.quantity)
  const itemEstimate = selectedItems.reduce((sum, selected) => {
    const item = items.find((candidate) => candidate.id === selected.item_id)
    return item ? sum + lineAmount(item) * (selected.quantity / item.quantity) : sum
  }, 0)
  return {
    items: selectedItems,
    fullOrder,
    estimatedAmount: fullOrder && typeof orderTotal === "number" ? orderTotal : itemEstimate,
  }
}

export const refundStatusLabel = (request: Pick<BuyerRefundRequest, "status">) =>
  REFUND_STATUS_LABELS[request.status] ?? request.status.replace(/_/g, " ")

export const canBuyerCancelRefund = (status: string) =>
  ["pending", "requested", "manual_review", "awaiting_information"].includes(status)

export const canBuyerProvideRefundInformation = (status: string) => status === "awaiting_information"
