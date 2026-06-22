export type BuyerOrderBucket = "unpaid" | "processing" | "shipped" | "delivered" | "reviews" | "returns"

export const matchesBuyerOrderBucket = (input: { bucket: string; paymentStatus?: string; fulfillmentStatus?: string; orderId?: string; reviewedOrderIds?: Set<string>; returnOrderIds?: Set<string> }) => {
  const { bucket, paymentStatus = "", fulfillmentStatus = "none", orderId = "", reviewedOrderIds = new Set(), returnOrderIds = new Set() } = input
  if (bucket === "unpaid") return !["paid", "captured"].includes(paymentStatus)
  if (bucket === "processing") return ["paid", "captured"].includes(paymentStatus) && !["shipped", "delivered"].includes(fulfillmentStatus)
  if (bucket === "shipped") return fulfillmentStatus === "shipped"
  if (bucket === "delivered") return fulfillmentStatus === "delivered"
  if (bucket === "reviews") return fulfillmentStatus === "delivered" && Boolean(orderId) && !reviewedOrderIds.has(orderId)
  if (bucket === "returns") return Boolean(orderId) && returnOrderIds.has(orderId)
  return true
}
