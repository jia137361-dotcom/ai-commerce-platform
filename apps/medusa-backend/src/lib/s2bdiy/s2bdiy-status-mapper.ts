export type SupplierOrderStatus =
  | "not_pushed"
  | "created"
  | "payment_pending"
  | "paid"
  | "reviewing"
  | "queued"
  | "in_production"
  | "shipped"
  | "cancelled"
  | "failed"

export type SupplierPayStatus =
  | "payment_pending"
  | "paying"
  | "paid"
  | "pay_failed"

export function mapS2bOrderStatus(status: number | string | null | undefined): SupplierOrderStatus {
  const n = typeof status === "string" ? Number(status) : status
  switch (n) {
    case 1:
      return "reviewing"
    case 2:
      return "payment_pending"
    case 3:
      return "reviewing"
    case 4:
      return "queued"
    case 5:
      return "in_production"
    case 6:
      return "shipped"
    case 7:
      return "cancelled"
    default:
      return "created"
  }
}

export function mapS2bPayStatus(payStatus: number | string | null | undefined): SupplierPayStatus {
  const n = typeof payStatus === "string" ? Number(payStatus) : payStatus
  switch (n) {
    case 1:
      return "payment_pending"
    case 2:
      return "paying"
    case 3:
      return "paid"
    case 4:
      return "pay_failed"
    default:
      return "payment_pending"
  }
}

export function isTerminalSupplierOrderStatus(status: SupplierOrderStatus): boolean {
  return status === "shipped" || status === "cancelled" || status === "failed"
}
