import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import type { BuyerCustomerAddress } from "../../lib/buyer-api"
import { readBuyerPreferencesFromMetadata } from "../../lib/buyer-preferences"
import { AccountCouponsEmpty } from "../../components/account/AccountCouponsEmpty"
import { customerAddressToInput } from "./account-settings-state"

describe("buyer account settings", () => {
  it("reads account-scoped country and currency preferences", () => {
    expect(readBuyerPreferencesFromMetadata({ buyer_preferences: { country_code: "CN", currency_code: "EUR" } })).toEqual({ countryCode: "cn", currencyCode: "eur" })
    expect(readBuyerPreferencesFromMetadata()).toEqual({ countryCode: "us", currencyCode: "usd" })
  })

  it("preserves a saved address when opening it for editing", () => {
    const address: BuyerCustomerAddress = {
      id: "ca_1",
      label: "Home",
      firstName: "Buyer",
      lastName: "A",
      address1: "1 Test Road",
      city: "Shanghai",
      province: "Shanghai",
      postalCode: "200000",
      countryCode: "cn",
      phone: "10000000000",
      isDefaultShipping: true,
      isDefaultBilling: false,
    }
    expect(customerAddressToInput(address)).toEqual(address)
  })

  it("renders a genuine empty coupon wallet without invented coupons", () => {
    const html = renderToStaticMarkup(createElement(AccountCouponsEmpty))
    expect(html).toContain("No coupons available")
    expect(html).not.toContain("Use coupon")
    expect(html).not.toContain("3%")
  })
})
