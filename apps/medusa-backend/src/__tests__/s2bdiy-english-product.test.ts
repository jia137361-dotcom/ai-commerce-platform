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

  it("normalizes basic details, size rows, packaging rows, and labeled official images", () => {
    const result = normalizeS2bdiyEnglishProduct({
      en_name: "Cotton tee",
      en_product_material_text: "Cotton",
      en_product_technology_text: "Screen printing",
      produce_country: "United States",
      warehouse_name: "California",
      colors: [{ id: 10, name: "Black", en_name: "Black" }],
      sizes: [{ id: 20, name: "M", en_name: "M" }],
      items: [{ id: 30, size_id: 20, weight: 162, length: 22, width: 20, height: 2 }],
      product_show_images: [{ color_id: 10, color_name: "Black", images: [{ src: "https://cdn/black.jpg" }] }],
      packaging_specs: [{ size: "M", length: "22", width: "20", height: "2", weight: "162" }],
    })

    expect(result.basic_details).toEqual(expect.arrayContaining([
      { label: "Material", value: "Cotton" },
      { label: "Technology", value: "Screen printing" },
      { label: "Production country", value: "United States" },
    ]))
    expect(result.size_chart?.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ Size: "M", Weight: "162", Length: "22" }),
    ]))
    expect(result.packaging_specs?.rows).toEqual([
      { Size: "M", Length: "22", Width: "20", Height: "2", Weight: "162" },
    ])
    expect(result.official_images).toEqual([{ url: "https://cdn/black.jpg", color_name: "Black" }])
  })

  it("maps the live basic product detail fields used by the supplier detail page", () => {
    const result = normalizeS2bdiyEnglishProduct({
      id: 5522,
      code: "ZR53H3",
      en_name: "T-shirt",
      en_desc: "<p>Double sided printing</p>",
      en_product_material_text: "Cotton",
      en_product_technology_text: "Heat Transfer",
      deliver_goods_text: "1-2 days",
      produce_country_text: "China",
      warehouse_name: "Domestic warehouse",
      sizes: [{ id: 90, name: "XS", en_name: "XS" }],
      colors: [{ id: 6, name: "白色", en_name: "White" }],
      items: [{ id: 1, size_id: 90, color_id: 6, weight: 162, length: "20.00", width: "20.00", height: "2.00" }],
      attr_values: [{ size_id: 90, size_name: "XS", attr_value: [
        { attr_name: "Suitable height", attr_value: "160cm" },
        { attr_name: "Chest width", attr_value: "44cm" },
      ] }],
      size_specifications: [{ size_id: 90, size_name: "XS", weight: "0.162", length: "20.00", width: "20.00", height: "2.00", volume: "800.00" }],
    })

    expect(result.english_description).toBe("<p>Double sided printing</p>")
    expect(result.basic_details).toEqual(expect.arrayContaining([
      { label: "Product code", value: "ZR53H3" },
      { label: "Product number", value: "5522" },
    ]))
    expect(result.size_chart?.columns).toEqual(["Size", "Suitable height", "Chest width"])
    expect(result.size_chart?.rows).toEqual([{ Size: "XS", "Suitable height": "160cm", "Chest width": "44cm" }])
    expect(result.packaging_specs?.rows).toEqual([
      { Size: "XS", Weight: "0.162 kg", Length: "20.00 cm", Width: "20.00 cm", Height: "2.00 cm", Volume: "800.00 cm³" },
    ])
  })
})
