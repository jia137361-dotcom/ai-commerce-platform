import type { BuyerOrderSummary } from "../../lib/buyer-api"

export type OrderHistoryGroup =
  | {
      kind: "platform"
      key: string
      platformCheckoutId: string
      orders: BuyerOrderSummary[]
    }
  | {
      kind: "single"
      key: string
      order: BuyerOrderSummary
    }

export const groupOrdersForHistory = (orders: BuyerOrderSummary[]): OrderHistoryGroup[] => {
  const platformBuckets = new Map<string, BuyerOrderSummary[]>()
  const singles: BuyerOrderSummary[] = []

  for (const order of orders) {
    const platformCheckoutId = order.platformCheckoutId?.trim()
    if (platformCheckoutId) {
      const bucket = platformBuckets.get(platformCheckoutId) ?? []
      bucket.push(order)
      platformBuckets.set(platformCheckoutId, bucket)
      continue
    }
    singles.push(order)
  }

  const groups: OrderHistoryGroup[] = []

  for (const [platformCheckoutId, bucketOrders] of platformBuckets.entries()) {
    const sorted = [...bucketOrders].sort((left, right) => {
      const leftIndex = left.platformCheckoutIndex ?? Number.MAX_SAFE_INTEGER
      const rightIndex = right.platformCheckoutIndex ?? Number.MAX_SAFE_INTEGER
      if (leftIndex !== rightIndex) return leftIndex - rightIndex
      return (left.createdAt ?? "").localeCompare(right.createdAt ?? "")
    })
    groups.push({
      kind: "platform",
      key: platformCheckoutId,
      platformCheckoutId,
      orders: sorted,
    })
  }

  for (const order of singles) {
    groups.push({
      kind: "single",
      key: order.orderId,
      order,
    })
  }

  groups.sort((left, right) => {
    const leftDate =
      left.kind === "platform"
        ? left.orders[0]?.createdAt ?? ""
        : left.order.createdAt ?? ""
    const rightDate =
      right.kind === "platform"
        ? right.orders[0]?.createdAt ?? ""
        : right.order.createdAt ?? ""
    return rightDate.localeCompare(leftDate)
  })

  return groups
}
