export const formatCustomerLabel = (
  email?: string | null,
  shipping?: Record<string, unknown> | null
) => {
  const name = [shipping?.first_name, shipping?.last_name]
    .filter((part) => typeof part === "string" && part.trim())
    .join(" ")
  if (name && email) return `${name} · ${email}`
  return name || email || "—"
}

export const formatPaymentLabel = (
  paymentStatus?: string | null,
  paymentMethodLabel?: string | null
) => {
  const status = paymentStatus?.replace(/_/g, " ").trim()
  if (paymentMethodLabel && status) return `${paymentMethodLabel} · ${status}`
  return paymentMethodLabel || status || "—"
}

export const formatSupplierLabel = (
  supplierId?: string | null,
  supplierOrderId?: string | null
) => {
  if (supplierId && supplierId !== "mock") return supplierId
  if (supplierOrderId) return `mock · ${supplierOrderId}`
  return "PrintPro (pending push)"
}

/** Backend payment, refund, and payout values are stored in minor units. */
export const formatMinorMoney = (amount: number | null | undefined, currencyCode?: string | null) => {
  const currency = currencyCode?.trim().toUpperCase() || "USD"
  const minor = typeof amount === "number" && Number.isFinite(amount) ? amount : 0
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minor / 100)
}
