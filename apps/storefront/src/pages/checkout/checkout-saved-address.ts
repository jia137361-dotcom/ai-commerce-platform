import type { CheckoutAddress } from "../../components/checkout/CheckoutAddressPanel"
import type { BuyerCustomerAddress } from "../../lib/buyer-api"

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
