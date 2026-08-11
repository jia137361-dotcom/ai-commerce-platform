import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import type { StoreProduct } from "../../lib/mock-data"
import { ProductDetailsSection } from "./ProductDetailsSection"

describe("ProductDetailsSection", () => {
  it("renders normalized supplier details without exposing purchase cost", () => {
    const product: StoreProduct = {
      id: "prod_supplier",
      title: "Supplier product",
      category: "Apparel",
      price: "$29.99",
      imageUrl: "",
      supplierDetails: {
        purchasePrice: 12,
        englishMaterial: "100% cotton",
        englishTechnology: "Direct-to-garment",
        deliveryNote: "Ships in 3–5 business days",
        produceCountry: "United States",
        warehouse: "Los Angeles",
        colors: [{ id: "black", name: "Black" }],
        sizes: [{ id: "large", name: "Large" }],
        views: [{ id: "front", name: "Front" }],
        categories: [],
        images: [],
        blankDesignImages: [],
        variants: [],
        printSpecs: [{ print_file_width: 1200, print_file_height: 1600 }],
      },
    }

    const html = renderToStaticMarkup(createElement(ProductDetailsSection, { product }))

    expect(html).toContain("100% cotton")
    expect(html).toContain("Direct-to-garment")
    expect(html).toContain("Ships in 3–5 business days")
    expect(html).toContain("1200 × 1600 px")
    expect(html).not.toContain("$12")
    expect(html).not.toContain("purchase")
  })
})
