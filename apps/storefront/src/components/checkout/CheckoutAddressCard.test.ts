import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { CheckoutAddressCard } from "./CheckoutAddressCard"

describe("CheckoutAddressCard", () => {
  it("renders the selected default address as a checkout summary", () => {
    const html = renderToStaticMarkup(createElement(CheckoutAddressCard, {
      value: { country: "cn", state: "Shanghai", city: "Shanghai", address1: "1 Test Road", address2: "", postalCode: "200000", label: "Home" },
      onSave: () => undefined,
      required: true,
      saving: false,
      saved: false,
      savedAddresses: [{ id: "ca_1", label: "Home", address1: "1 Test Road", city: "Shanghai", postalCode: "200000", countryCode: "cn", isDefaultShipping: true, isDefaultBilling: false }],
      selectedAddressId: "ca_1",
      onSelectSavedAddress: () => undefined,
    }))
    expect(html).toContain("Contact &amp; Delivery")
    expect(html).toContain("Delivery address")
    expect(html).toContain("1 Test Road")
    expect(html).toContain("Default")
    expect(html).toContain("Use this address")
    expect(html).not.toContain("Save contact")
  })

  it("shows an add-address empty state when there is no default address", () => {
    const html = renderToStaticMarkup(createElement(CheckoutAddressCard, {
      value: { country: "us", state: "", city: "", address1: "", address2: "", postalCode: "", label: "Home" },
      onSave: () => undefined,
      required: true,
      saving: false,
      saved: false,
    }))
    expect(html).toContain("No default delivery address")
    expect(html).toContain("Add a new address")
    expect(html).not.toContain("Save address</button>")
  })
})
