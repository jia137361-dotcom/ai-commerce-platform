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
