import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { CheckoutShippingCard } from "./CheckoutShippingCard"

describe("CheckoutShippingCard", () => {
  it("disables a shipping option without a price and explains the unavailable state", () => {
    const html = renderToStaticMarkup(createElement(CheckoutShippingCard, {
      required: true,
      addressSaved: true,
      loading: false,
      options: [{ id: "so_1", name: "Standard", currencyCode: "usd", available: false, unavailableReason: "Price is unavailable for this cart/address." }],
      selectedId: "",
      methodSaved: false,
      onSelect: () => undefined,
    }))
    expect(html).toContain("Unavailable")
    expect(html).toContain("Price is unavailable")
    expect(html).toContain("disabled=\"\"")
  })
})
