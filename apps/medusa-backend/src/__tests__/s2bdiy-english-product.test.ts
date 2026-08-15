import { normalizeS2bdiyEnglishProduct } from "../modules/suppliers/s2bdiy/s2bdiy-product"

describe("S2BDIY English product normalization", () => {
  it("keeps English metadata, variants, print areas, and every valid image", () => {
    const result = normalizeS2bdiyEnglishProduct({
      en_name: "Wall sign",
      en_desc: "A wall sign",
      en_product_material_text: "Aluminium",
      en_product_technology_text: "UV printing",
      deliver_goods_text: "Ships in 3 days",
      colors: [{ id: 1, name: "白", en_name: "White" }],
      sizes: [{ id: 2, name: "单一", en_name: "One Size" }],
      views: [{ id: 3, name: "正面", en_name: "Front" }],
      categorys: [{ id: 4, name: "墙牌", en_name: "Wall Signs" }],
      product_show_images: [{ images: [{ src: "https://cdn/front.jpg" }, { src: "https://cdn/back.jpg" }, { src: "https://cdn/front.jpg" }] }],
      blank_design_images: [{ image_src: "https://cdn/blank.png" }],
      produce_area_text: "Europe",
      produce_country_text: "United Kingdom",
      warehouse_name: "London",
      items: [{ id: 5, code: "WS-1", price: 2.5 }],
      print_areas: [{ view_id: 3, width: 1000, height: 800 }],
    })

    expect(result.english_name).toBe("Wall sign")
    expect(result.colors).toEqual([{ id: "1", name: "White" }])
    expect(result.images).toEqual(["https://cdn/front.jpg", "https://cdn/back.jpg"])
    expect(result.blank_design_images).toEqual(["https://cdn/blank.png"])
    expect(result.variants).toHaveLength(1)
    expect(result.print_areas[0]).toMatchObject({ width: 1000, height: 800 })
  })

  it("does not fall back to Chinese display values", () => {
    const result = normalizeS2bdiyEnglishProduct({ name: "中文商品", colors: [{ id: 1, name: "白色" }] })
    expect(result.english_name).toBeNull()
    expect(result.colors).toEqual([])
  })
})
