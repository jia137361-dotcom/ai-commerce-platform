import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { CheckoutAddressCard } from "./CheckoutAddressCard"

describe("CheckoutAddressCard", () => {
  it("renders account saved addresses as selectable checkout choices", () => {
    const html = renderToStaticMarkup(createElement(CheckoutAddressCard, {
      value: { country: "cn", state: "Shanghai", city: "Shanghai", address1: "1 Test Road", address2: "", postalCode: "200000", label: "Home" },
      onChange: () => undefined,
      onSave: () => undefined,
      required: true,
      saving: false,
      saved: false,
      savedAddresses: [{ id: "ca_1", label: "Home", address1: "1 Test Road", city: "Shanghai", postalCode: "200000", countryCode: "cn", isDefaultShipping: true, isDefaultBilling: false }],
      selectedAddressId: "ca_1",
      onSelectSavedAddress: () => undefined,
    }))
    expect(html).toContain("Saved addresses")
    expect(html).toContain("Home · Default")
    expect(html).toContain("1 Test Road")
    expect(html).toContain("Manage")
  })

  it("links to the address book when the buyer has no saved address", () => {
    const html = renderToStaticMarkup(createElement(CheckoutAddressCard, {
      value: { country: "us", state: "", city: "", address1: "", address2: "", postalCode: "", label: "Home" },
      onChange: () => undefined,
      onSave: () => undefined,
      required: true,
      saving: false,
      saved: false,
    }))
    expect(html).toContain("No saved addresses yet")
    expect(html).toContain('/account/addresses')
  })
})
