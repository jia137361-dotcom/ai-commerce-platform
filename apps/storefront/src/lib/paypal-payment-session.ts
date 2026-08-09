export const isPayPalProviderOrderId = (value: string | undefined | null) =>
  Boolean(value?.trim() && !value.startsWith("payses_"))

export const readPayPalOrderId = (
  providerId: string | undefined,
  data: Record<string, unknown> | undefined | null
) => {
  const explicitId = data?.paypal_order_id
  if (typeof explicitId === "string" && isPayPalProviderOrderId(explicitId)) return explicitId

  const providerDataId = data?.id
  if (
    providerId?.startsWith("pp_paypal_") &&
    typeof providerDataId === "string" &&
    isPayPalProviderOrderId(providerDataId)
  ) {
    return providerDataId
  }

  return undefined
}
