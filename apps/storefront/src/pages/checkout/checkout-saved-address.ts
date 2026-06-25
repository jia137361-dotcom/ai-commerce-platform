import type { CheckoutAddress } from "../../components/checkout/CheckoutAddressPanel"
import type { BuyerCustomerAddress } from "../../lib/buyer-api"

export type CartShippingAddress = {
  first_name?: string | null
  last_name?: string | null
  address_1?: string | null
  address_2?: string | null
  city?: string | null
  province?: string | null
  postal_code?: string | null
  country_code?: string | null
}

export const savedAddressToCheckout = (saved: BuyerCustomerAddress): { address: CheckoutAddress; name: string; phone: string } => ({
  address: {
    country: saved.countryCode,
    state: saved.province ?? "",
    city: saved.city,
    address1: saved.address1,
    address2: saved.address2 ?? "",
    postalCode: saved.postalCode,
    label: saved.label ?? "Home",
  },
  name: [saved.firstName, saved.lastName].filter(Boolean).join(" "),
  phone: saved.phone ?? "",
})

export const cartShippingAddressToCheckout = (
  shippingAddress: CartShippingAddress
): { address: CheckoutAddress; name: string } | null => {
  if (!shippingAddress.address_1 || !shippingAddress.city || !shippingAddress.postal_code || !shippingAddress.country_code) {
    return null
  }

  return {
    address: {
      country: shippingAddress.country_code.toLowerCase(),
      state: shippingAddress.province ?? "",
      city: shippingAddress.city,
      address1: shippingAddress.address_1,
      address2: shippingAddress.address_2 ?? "",
      postalCode: shippingAddress.postal_code,
      label: "Home",
    },
    name: [shippingAddress.first_name, shippingAddress.last_name].filter(Boolean).join(" "),
  }
}

export const hasPersistedCartShippingAddress = (shippingAddress?: CartShippingAddress | null) =>
  Boolean(shippingAddress?.country_code && shippingAddress.address_1 && shippingAddress.city && shippingAddress.postal_code)
