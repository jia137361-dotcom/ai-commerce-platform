import { collectCategoryTreeIds, productMatchesCategory } from "./store-category-filter"

const categories = [
  { id: "all", name: "All" },
  { id: "apparel", name: "Apparel" },
  { id: "tshirts", name: "T-Shirts", parentId: "apparel" },
]

describe("store category filtering", () => {
  it("includes descendants when a parent category is selected", () => {
    expect([...collectCategoryTreeIds(categories, "apparel")]).toEqual(["apparel", "tshirts"])
    expect(productMatchesCategory({ id: "p1", title: "Tee", category: "T-Shirts", price: "$10", imageUrl: "", categoryIds: ["tshirts"] }, categories, "apparel")).toBe(true)
  })

  it("does not include unrelated products", () => {
    expect(productMatchesCategory({ id: "p2", title: "Mug", category: "Mugs", price: "$10", imageUrl: "", categoryIds: ["mugs"] }, categories, "apparel")).toBe(false)
  })
})
