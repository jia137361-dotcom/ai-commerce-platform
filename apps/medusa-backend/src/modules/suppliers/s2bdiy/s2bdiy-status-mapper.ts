// S2BDIY order status codes → CitiGoo supplier_order_status
export const ORDER_STATUS_MAP: Record<number, string> = {
  1: "created",
  2: "payment_pending",
  3: "reviewing",
  4: "queued",
  5: "in_production",
  6: "shipped",
  7: "cancelled",
}

// S2BDIY pay status codes → CitiGoo supplier_pay_status
export const PAY_STATUS_MAP: Record<number, string> = {
  1: "payment_pending",
  2: "paying",
  3: "paid",
  4: "pay_failed",
}

// S2BDIY logistics status codes → CitiGoo
export const LOGISTICS_STATUS_MAP: Record<number, string> = {
  1: "waiting",
  2: "in_transit",
  3: "arrived",
  4: "delivered",
  5: "overdue",
  6: "delivery_failed",
  7: "abnormal",
  8: "cancelled",
  9: "returned_destroyed",
  10: "returned_recycled",
  11: "pending_pickup",
  12: "lost",
}

export function mapOrderStatus(s2bStatus: number): string {
  return ORDER_STATUS_MAP[s2bStatus] ?? "unknown"
}

export function mapPayStatus(s2bPayStatus: number): string {
  return PAY_STATUS_MAP[s2bPayStatus] ?? "unknown"
}

export function mapLogisticsStatus(s2bLogisticsStatus: number): string {
  return LOGISTICS_STATUS_MAP[s2bLogisticsStatus] ?? "unknown"
}

// S2BDIY design_type
export const DESIGN_TYPE = {
  FIT: 1,
  STRETCH: 2,
  FILL: 3,
} as const
