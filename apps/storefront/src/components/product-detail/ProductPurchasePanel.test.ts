import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import type { StoreProduct } from "../../lib/mock-data"
import { ProductPurchasePanel } from "./ProductPurchasePanel"

const product: StoreProduct = {
  id: "prod_multi",
  title: "Multi option product",
  category: "Apparel",
  price: "$25.00 USD",
  numericPrice: 25,
  imageUrl: "",
  isCartAddable: true,
}

describe("ProductPurchasePanel", () => {
  it("renders selectable multiple variants and the logged-out sign-in action", () => {
    const html = renderToStaticMarkup(createElement(ProductPurchasePanel, {
      product,
      variants: [
        { id: "variant_small", title: "Small", isPurchasable: true },
        { id: "variant_large", title: "Large", isPurchasable: true },
      ],
      selectedVariantId: "variant_large",
      onVariantChange: () => undefined,
      purchaseState: { canAdd: true, availabilityLabel: "Available", availabilityTone: "success" },
      quantity: 1,
      setQuantity: () => undefined,
      adding: false,
      requiresSignIn: true,
      onAddToCart: () => undefined,
    }))

    expect(html).toContain('value="variant_small"')
    expect(html).toContain('value="variant_large" selected=""')
    expect(html).toContain("Sign in to add to cart")
  })

  it("splits color and size selections for structured variants", () => {
    const html = renderToStaticMarkup(createElement(ProductPurchasePanel, {
      product,
      variants: [
        { id: "black_s", title: "Black / S", color: "Black", size: "S", isPurchasable: true },
        { id: "black_m", title: "Black / M", color: "Black", size: "M", isPurchasable: true },
        { id: "white_s", title: "White / S", color: "White", size: "S", isPurchasable: true },
      ],
      selectedVariantId: "black_m",
      onVariantChange: () => undefined,
      purchaseState: { canAdd: true, availabilityLabel: "Available", availabilityTone: "success" },
      quantity: 1,
      setQuantity: () => undefined,
      adding: false,
      onAddToCart: () => undefined,
    }))

    expect(html).toContain("Color")
    expect(html).toContain("Black")
    expect(html).toContain("White")
    expect(html).toContain("Size")
    expect(html).toContain('value="M" selected=""')
  })

  it("shows one default option without implying multiple specifications", () => {
    const html = renderToStaticMarkup(createElement(ProductPurchasePanel, {
      product,
      variants: [{ id: "variant_default", title: "Default option", isPurchasable: true }],
      selectedVariantId: "variant_default",
      onVariantChange: () => undefined,
      purchaseState: { canAdd: true, availabilityLabel: "Available", availabilityTone: "success" },
      quantity: 1,
      setQuantity: () => undefined,
      adding: false,
      onAddToCart: () => undefined,
    }))
    expect(html.match(/Default option/g)).toHaveLength(1)
  })
})
