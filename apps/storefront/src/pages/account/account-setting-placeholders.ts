export type AccountSettingPlaceholder = {
  slug: string
  title: string
  description: string
  availableNow: string
  unavailable: string
}

export const accountSettingPlaceholders: AccountSettingPlaceholder[] = [
  {
    slug: "security",
    title: "Account & Security",
    description: "Review the current buyer-session boundary without implying production security controls.",
    availableNow: "Email/password sign-in, buyer session refresh, sign out, and buyer-only client-state cleanup.",
    unavailable: "Password reset or change, email verification, MFA, session management, and account deletion.",
  },
  {
    slug: "addresses",
    title: "Delivery addresses",
    description: "Saved-address management is not connected to the current buyer profile API.",
    availableNow: "A delivery address can be entered and edited inside the current checkout flow.",
    unavailable: "Address book, default address, address labels, and reusable saved-address selection.",
  },
  {
    slug: "country-region",
    title: "Country & region",
    description: "Country and region preferences need a production locale, tax, shipping, and catalog contract.",
    availableNow: "Checkout accepts a shipping country code for the current order.",
    unavailable: "Account-level region switching and region-specific catalog or fulfillment behavior.",
  },
  {
    slug: "coupons",
    title: "Coupons",
    description: "The design is retained as a future account surface; coupon APIs are not implemented.",
    availableNow: "No buyer coupon wallet or checkout coupon application is available.",
    unavailable: "Coupon discovery, eligibility, redemption, balance, and order discount calculation.",
  },
  {
    slug: "currency",
    title: "Currency",
    description: "Currency selection cannot be enabled safely without pricing and checkout support.",
    availableNow: "Prices use the currency returned by the current backend/cart data.",
    unavailable: "Buyer-selected currency, conversion, regional price lists, and multi-currency checkout.",
  },
  {
    slug: "following",
    title: "Following",
    description: "The store page has a follow control, but a complete account-level following list is not connected.",
    availableNow: "The current store follow state can be toggled where supported by the store page.",
    unavailable: "Following list, recommendations, sorting, notifications, and cross-store management.",
  },
]

export const findAccountSettingPlaceholder = (path: string) =>
  accountSettingPlaceholders.find((setting) => path === `/account/${setting.slug}` || path.startsWith(`/account/${setting.slug}?`))
