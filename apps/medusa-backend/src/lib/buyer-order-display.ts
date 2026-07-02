import { isReceiptConfirmed } from "./order-receipt-confirmation"

export type BuyerOrderBucket =
  | "all"
  | "unpaid"
  | "packing"
  | "awaiting_receipt"
  | "reviews"

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

export const isPaidOrder = (paymentStatus: string | null | undefined) =>
  PAID_STATUSES.has(paymentStatus ?? "")

export const canConfirmReceipt = (input: {
  fulfillmentStatus?: string | null
  receiptConfirmed?: boolean
}) => {
  const fulfillment = input.fulfillmentStatus ?? "none"
  if (input.receiptConfirmed) return false
  return fulfillment === "shipped" || fulfillment === "delivered"
}

export const resolveBuyerOrderDisplayStatus = (input: {
  status?: string | null
  paymentStatus?: string | null
  fulfillmentStatus?: string | null
  receiptConfirmed?: boolean
  reviewEligible?: boolean
  reviewCompleted?: boolean
  returnIntent?: boolean
}): BuyerOrderDisplayStatus => {
  if (input.status === "cancelled") return "cancelled"
  if (input.returnIntent) return "refunding"
  if (!isPaidOrder(input.paymentStatus ?? "")) return "unpaid"

  const fulfillment = input.fulfillmentStatus ?? "none"
  if (!["shipped", "delivered"].includes(fulfillment)) return "packing"
  if (!input.receiptConfirmed) return "awaiting_receipt"
  if (input.reviewCompleted) return "reviewed"
  if (input.reviewEligible) return "awaiting_review"
  return "completed"
}

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

export const matchesBuyerOrderBucket = (input: {
  bucket: string
  status?: string | null
  paymentStatus?: string | null
  fulfillmentStatus?: string | null
  orderId?: string
  receiptConfirmed?: boolean
  reviewEligible?: boolean
  reviewedOrderIds?: Set<string>
  returnOrderIds?: Set<string>
}) => {
  const {
    bucket,
    status = "",
    paymentStatus = "",
    fulfillmentStatus = "none",
    orderId = "",
    receiptConfirmed = false,
    reviewEligible = false,
    reviewedOrderIds = new Set(),
    returnOrderIds = new Set(),
  } = input

  if (bucket === "all" || !bucket) return true
  if (status === "cancelled") return false
  if (bucket === "unpaid") return !isPaidOrder(paymentStatus)
  if (bucket === "packing") {
    return isPaidOrder(paymentStatus) && !["shipped", "delivered"].includes(fulfillmentStatus ?? "none")
  }
  if (bucket === "awaiting_receipt") {
    return canConfirmReceipt({ fulfillmentStatus, receiptConfirmed })
  }
  if (bucket === "reviews") {
    return (
      reviewEligible ||
      (Boolean(orderId) && reviewedOrderIds.has(orderId))
    )
  }
  if (bucket === "returns") {
    return Boolean(orderId) && returnOrderIds.has(orderId)
  }
  return true
}

export const readReceiptConfirmed = (order: {
  status?: unknown
  metadata?: Record<string, unknown> | null
}) => isReceiptConfirmed(order)
