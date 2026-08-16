export type PlatformPayPalBusinessStatus = {
  configured: boolean
  environment: "sandbox" | null
  merchant_id: string | null
  dashboard_url: string | null
}

const SANDBOX_DASHBOARD_URL = "https://www.sandbox.paypal.com/myaccount/summary"

export const maskPayPalMerchantId = (merchantId?: string | null) => {
  const value = merchantId?.trim()
  if (!value) return null
  if (value.length <= 8) return value
  return `${value.slice(0, 4)}...${value.slice(-4)}`
}

export const resolvePlatformPayPalBusinessStatus = (): PlatformPayPalBusinessStatus => {
  const configured = Boolean(
    process.env.PAYPAL_CLIENT_ID?.trim() &&
    process.env.PAYPAL_CLIENT_SECRET?.trim() &&
    process.env.PAYPAL_ENVIRONMENT === "sandbox"
  )

  return {
    configured,
    environment: configured ? "sandbox" : null,
    merchant_id: maskPayPalMerchantId(process.env.PAYPAL_MERCHANT_ID),
    dashboard_url: configured ? SANDBOX_DASHBOARD_URL : null,
  }
}
