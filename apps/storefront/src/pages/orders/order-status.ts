import type { StatusTone } from "../../components/ui/StatusBadge"

const normalizeStatus = (status?: string | null) => status?.trim().toLowerCase() ?? ""

export const humanizeOrderStatus = (status?: string | null) => {
  const value = normalizeStatus(status)
  if (!value) return "Not available"
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export const paymentStatusPresentation = (status?: string | null): {
  label: string
  description?: string
  tone: StatusTone
} => {
  const value = normalizeStatus(status)

  if (value === "authorized") {
    return {
      label: "Payment authorized, not captured",
      description: "Funds have not been captured.",
      tone: "warning",
    }
  }
  if (["captured", "completed"].includes(value)) {
    return { label: "Payment captured", tone: "success" }
  }
  if (value === "refunded") {
    return { label: "Refund confirmed", tone: "success" }
  }
  if (value === "paid") {
    return {
      label: "Payment recorded as paid",
      description: "Capture is not confirmed by this status alone.",
      tone: "warning",
    }
  }
  if (["canceled", "cancelled", "failed"].includes(value)) {
    return { label: humanizeOrderStatus(value), tone: "danger" }
  }
  if (["pending", "requires_action", "processing"].includes(value)) {
    return { label: humanizeOrderStatus(value), tone: "warning" }
  }
  return { label: humanizeOrderStatus(value), tone: "neutral" }
}

export const isCancelledOrderStatus = (status?: string | null) =>
  ["canceled", "cancelled"].includes(normalizeStatus(status))
