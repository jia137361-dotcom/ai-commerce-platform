export type StripeWalletAvailability = {
  applePay: boolean
  googlePay: boolean
}

type StripeWalletAvailabilityInput = {
  applePay?: boolean | { available?: boolean }
  googlePay?: boolean | { available?: boolean }
} | null | undefined

const isAvailable = (value?: boolean | { available?: boolean }) =>
  typeof value === "boolean" ? value : Boolean(value?.available)

export const normalizeStripeWalletAvailability = (
  methods?: StripeWalletAvailabilityInput
): StripeWalletAvailability => ({
  applePay: isAvailable(methods?.applePay),
  googlePay: isAvailable(methods?.googlePay),
})

export const hasSupportedStripeWallet = (methods?: StripeWalletAvailabilityInput) => {
  const availability = normalizeStripeWalletAvailability(methods)
  return availability.applePay || availability.googlePay
}

export const resolveStripeWalletContainerClass = (
  availabilityKnown: boolean,
  availability: StripeWalletAvailability
) =>
  !availabilityKnown || availability.applePay || availability.googlePay
    ? "buyer-checkout-wallets"
    : "buyer-checkout-wallets buyer-checkout-wallets-hidden"

export const resolveStripeWalletPresentationOptions = (
  isDevelopment: boolean
): StripeExpressCheckoutElementOptions => {
  const mode: "always" | "auto" = isDevelopment ? "always" : "auto"
  return {
    buttonHeight: 44,
    layout: { maxColumns: 2, maxRows: 1, overflow: "never" as const },
    paymentMethodOrder: ["apple_pay", "google_pay"],
    paymentMethods: { applePay: mode, googlePay: mode },
  }
}

const resolveBrowserFamily = (userAgent: string) => {
  if (/edg\//i.test(userAgent)) return "Edge"
  if (/firefox\//i.test(userAgent)) return "Firefox"
  if (/chrome\//i.test(userAgent) || /crios\//i.test(userAgent)) return "Chrome"
  if (/safari\//i.test(userAgent)) return "Safari"
  return userAgent ? "Other" : "Unknown"
}

export const getStripeWalletRuntimeDiagnostic = (input: {
  origin?: string
  protocol?: string
  userAgent?: string
}) => ({
  origin: input.origin || "unknown",
  protocol: input.protocol || "unknown",
  isHttps: input.protocol === "https:",
  browserFamily: resolveBrowserFamily(input.userAgent || ""),
})
import type { StripeExpressCheckoutElementOptions } from "@stripe/stripe-js"
