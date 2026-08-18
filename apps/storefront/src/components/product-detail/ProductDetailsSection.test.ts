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
      tags: ["cotton"],
      description: '<p>Soft <strong>cotton</strong></p><script>alert("x")</script>',
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

    expect(html).toContain("Product details")
    expect(html).not.toContain("Supplier information")
    expect(html).toContain("<strong>cotton</strong>")
    expect(html).not.toContain("alert")
    expect(html.indexOf("Product details")).toBeLessThan(html.indexOf("<dl"))
    expect(html).toContain("100% cotton")
    expect(html).toContain("Direct-to-garment")
    expect(html).toContain("Ships in 3–5 business days")
    expect(html).toContain("1200 × 1600 px")
    expect(html).not.toContain("$12")
    expect(html).not.toContain("purchase")
    expect(html).not.toContain("<dt>Supported countries</dt>")
    expect(html).not.toContain("<dt>Options</dt>")
    expect(html).not.toContain("<dt>Tags</dt>")
  })

  it("renders the supplier description and detailed product information vertically", () => {
    const product: StoreProduct = {
      id: "prod_supplier_detail",
      title: "T-shirt",
      category: "T-shirts",
      price: "$29.99",
      imageUrl: "",
      description: "Seller description",
      supplierDetails: {
        supplierProductCode: "ZR53H3",
        englishName: "T-shirt",
        englishDescription: "<p>Double sided <strong>printing</strong></p>",
        englishMaterial: "Cotton",
        englishTechnology: "Heat Transfer",
        deliveryNote: "1-2 days",
        colors: [{ id: "6", name: "White" }],
        sizes: [{ id: "90", name: "XS" }],
        views: [{ id: "1", name: "Front" }, { id: "2", name: "Back" }],
        categories: [{ id: "1", name: "T-shirts" }],
        images: [],
        blankDesignImages: [],
        variants: [],
        printSpecs: [],
        basicDetails: [
          { label: "Product code", value: "ZR53H3" },
          { label: "Product number", value: "5522" },
        ],
        sizeChart: { columns: ["Size", "Chest width"], rows: [{ Size: "XS", "Chest width": "44cm" }] },
        packagingSpecs: { columns: ["Size", "Weight"], rows: [{ Size: "XS", Weight: "0.162 kg" }] },
      },
    }

    const html = renderToStaticMarkup(createElement(ProductDetailsSection, { product }))

    expect(html).toContain("Double sided")
    expect(html).toContain("Product details")
    expect(html).not.toContain("Supplier information")
    expect(html).toContain("Product code")
    expect(html).toContain("Product number")
    expect(html).toContain("Size information")
    expect(html).toContain("Packaging specifications")
    expect(html).toContain("44cm")
    expect(html).toContain("0.162 kg")
    expect(html.indexOf("Description")).toBeLessThan(html.indexOf("Basic information"))
    expect(html.indexOf("Basic information")).toBeLessThan(html.indexOf("Size information"))
    expect(html.indexOf("Size information")).toBeLessThan(html.indexOf("Packaging specifications"))
    expect(html).toContain('role="tablist"')
    expect(html).toContain("Size chart")
  })
})
