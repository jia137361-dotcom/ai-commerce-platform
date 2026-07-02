export const CHECKOUT_COUNTRIES = [
  { name: "United States", code: "us" },
  { name: "China", code: "cn" },
  { name: "United Kingdom", code: "gb" },
  { name: "Italy", code: "it" },
  { name: "France", code: "fr" },
  { name: "Germany", code: "de" },
  { name: "Canada", code: "ca" },
  { name: "Australia", code: "au" },
  { name: "Japan", code: "jp" },
  { name: "Singapore", code: "sg" },
] as const

export const isCheckoutCountryCode = (value: string) =>
  CHECKOUT_COUNTRIES.some((country) => country.code === value.toLowerCase())

export const shippingUnavailableMessage = (error?: unknown) => {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : ""
  if (/shipping options?.*do not have a price|shipping option.*price/i.test(message)) {
    return "Shipping method unavailable for this cart/address. Choose another country or contact the store."
  }
  return message || "Shipping method unavailable for this cart/address. Choose another country or contact the store."
}
