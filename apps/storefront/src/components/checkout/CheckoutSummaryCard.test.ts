import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import type { StoreCart } from "../../lib/mock-data"
import { CheckoutSummaryCard } from "./CheckoutSummaryCard"

const cart: StoreCart = {
  id: "cart_1",
  currencyCode: "usd",
  subtotal: 21.25,
  total: 21.25,
  hasSubtotal: true,
  hasTotal: true,
  items: [
    {
      id: "line_1",
      title: "Real cart item",
      imageUrl: undefined,
      quantity: 1,
      unitPrice: 21.25,
      total: 21.25,
      hasUnitPrice: true,
      hasTotal: true,
      variantId: "variant_1",
    },
  ],
}

describe("CheckoutSummaryCard", () => {
  it("renders real cart item and totals", () => {
    const html = renderToStaticMarkup(
      createElement(CheckoutSummaryCard, {
        cart,
        canPlaceOrder: true,
        disabledReason: "",
        onPlaceOrder: () => undefined,
        placing: false,
      })
    )
    expect(html).toContain("Real cart item")
    expect(html).toContain("$21.25")
    expect(html).toContain("Place order")
    expect(html).toContain("Ciiverse coupon")
  })

  it("adds shipping into the displayed total when selected", () => {
    const html = renderToStaticMarkup(
      createElement(CheckoutSummaryCard, {
        cart,
        canPlaceOrder: true,
        disabledReason: "",
        onPlaceOrder: () => undefined,
        placing: false,
        shippingAmount: 1.46,
      })
    )
    expect(html).toContain("$1.46")
    expect(html).toContain("$22.71")
  })

  it("shows coupon and plan discounts in payable total", () => {
    const html = renderToStaticMarkup(
      createElement(CheckoutSummaryCard, {
        cart,
        canPlaceOrder: true,
        disabledReason: "",
        onPlaceOrder: () => undefined,
        placing: false,
        shippingAmount: 1.46,
        pricing: {
          merchandiseSubtotal: 21.25,
          shippingTotal: 1.46,
          couponDiscount: 1,
          planDiscount: 0,
          planDiscountPercent: 0,
          discountTotal: 1,
          payableTotal: 21.71,
          appliedCoupon: {
            buyerCouponId: "b1",
            couponId: "c1",
            code: "FLAT1",
            title: "$1 off",
            discountAmount: 1,
            minSubtotal: 0,
          },
          currencyCode: "usd",
        },
      })
    )
    expect(html).toContain("$21.71")
    expect(html).toContain("Coupon")
  })

  it("disables place order for invalid checkout state", () =>
    expect(
      renderToStaticMarkup(
        createElement(CheckoutSummaryCard, {
          cart,
          canPlaceOrder: false,
          disabledReason: "Missing price",
          onPlaceOrder: () => undefined,
          placing: false,
        })
      )
    ).toContain("disabled"))
})
