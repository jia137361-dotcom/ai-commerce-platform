export type SupplierOrderStatus = "not_pushed" | "created" | "payment_pending" | "paid" | "reviewing" | "queued" | "in_production" | "shipped" | "cancelled" | "failed"
export type SupplierPayStatus = "payment_pending" | "paying" | "paid" | "pay_failed"

export const ORDER_STATUS_MAP: Record<number, string> = { 1: "created", 2: "payment_pending", 3: "reviewing", 4: "queued", 5: "in_production", 6: "shipped", 7: "cancelled" }
export const PAY_STATUS_MAP: Record<number, string> = { 1: "payment_pending", 2: "paying", 3: "paid", 4: "pay_failed" }
export const LOGISTICS_STATUS_MAP: Record<number, string> = { 1: "waiting", 2: "in_transit", 3: "arrived", 4: "delivered", 5: "overdue", 6: "delivery_failed", 7: "abnormal", 8: "cancelled", 9: "returned_destroyed", 10: "returned_recycled", 11: "pending_pickup", 12: "lost" }
export const DESIGN_TYPE = { FIT: 1, STRETCH: 2, FILL: 3 } as const

export function mapOrderStatus(s2bStatus: number): string { return ORDER_STATUS_MAP[s2bStatus] ?? "unknown" }
export function mapPayStatus(s2bPayStatus: number): string { return PAY_STATUS_MAP[s2bPayStatus] ?? "unknown" }
export function mapLogisticsStatus(s2bLogisticsStatus: number): string { return LOGISTICS_STATUS_MAP[s2bLogisticsStatus] ?? "unknown" }

export function mapS2bOrderStatus(status: number | string | null | undefined): SupplierOrderStatus {
  const n = typeof status === "string" ? Number(status) : status
  switch (n) { case 1: return "reviewing"; case 2: return "payment_pending"; case 3: return "reviewing"; case 4: return "queued"; case 5: return "in_production"; case 6: return "shipped"; case 7: return "cancelled"; default: return "created" }
}
export function mapS2bPayStatus(payStatus: number | string | null | undefined): SupplierPayStatus {
  const n = typeof payStatus === "string" ? Number(payStatus) : payStatus
  switch (n) { case 1: return "payment_pending"; case 2: return "paying"; case 3: return "paid"; case 4: return "pay_failed"; default: return "payment_pending" }
}
export function isTerminalSupplierOrderStatus(status: SupplierOrderStatus): boolean { return status === "shipped" || status === "cancelled" || status === "failed" }
