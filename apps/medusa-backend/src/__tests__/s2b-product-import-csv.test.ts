import { parseCsv, rowsToCsv, S2B_IMPORT_CSV_COLUMNS } from "../lib/s2b-product-import/csv"
import { importS2bDrafts, previewS2bImport } from "../lib/s2b-product-import/service"
import { isStorefrontProductVisible } from "../lib/storefront-product-visibility"
import { STORE_CORE_MODULE } from "../modules/store-core"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const colors = ["Black", "White"]
const sizes = ["S", "M", "L"]

const makeRows = (wanted = colors.flatMap((color) => sizes.map((size) => [color, size] as const))) =>
  wanted.map(([color, size], index) => ({
    source: "s2bdiy",
    source_product_id: "1001",
    source_variant_id: `200${index + 1}`,
    supplier_sku: `TS-${color.toUpperCase()}-${size}`,
    seller_title: "Seller T-shirt",
    seller_description: "Seller edited description",
    category_level_1: "Apparel",
    category_level_2: "T-Shirts",
    product_type: "T-shirt",
    design: "Blank",
    color,
    size,
    weight: "80",
    cost: "6.50",
    selling_price: "24.99",
    currency: "usd",
    warehouse_region: "China",
    sellable_country_codes: "US|AU",
    image_urls: `https://example.com/${color}-${size}.png`,
    publish_action: "draft",
  }))

function createFakeContainer() {
  const products: Array<Record<string, unknown>> = []
  const categories: Array<Record<string, unknown>> = []
  const supplierProduct = {
    id: "sp_1001",
    supplier_id: "sup_s2bdiy",
    basic_product_id: "1001",
    basic_product_en_name: "T-shirt",
    category: "Apparel",
    base_cost: 6.5,
    currency: "usd",
    product_show_master_image: "https://example.com/master.png",
  }
  const supplierVariants = makeRows().map((row) => ({
    id: `sv_${row.source_variant_id}`,
    supplier_product_id: "sp_1001",
    supplier_variant_id: row.source_variant_id,
    sku: row.supplier_sku,
    color_name: row.color,
    size_name: row.size,
    weight: row.weight,
    cost: row.cost,
    stock_status: "in_stock",
  }))
  const storeCore = {
    listSupplierProducts: jest.fn(async (filter) =>
      filter.basic_product_id === "1001" && filter.supplier_id === "sup_s2bdiy" ? [supplierProduct] : []
    ),
    listSupplierProductVariants: jest.fn(async (filter) =>
      filter.supplier_product_id === "sp_1001" ? supplierVariants : []
    ),
    listProductCategories: jest.fn(async () => categories),
    createProductCategories: jest.fn(async (data) => {
      const row = { id: `cat_${categories.length + 1}`, ...data }
      categories.push(row)
      return row
    }),
    listProducts: jest.fn(async (filter = {}) => products.filter((product) => {
      const entries = Object.entries(filter as Record<string, unknown>)
      return entries.every(([key, value]) => {
        if (Array.isArray(value)) return value.includes(product[key] as never)
        return product[key] === value
      })
    })),
    createProducts: jest.fn(async (rows) => rows.map((data: Record<string, unknown>) => {
      const row = { id: `prod_${products.length + 1}`, ...data }
      products.push(row)
      return row
    })),
    updateProducts: jest.fn(async ({ selector, data }) => {
      const product = products.find((row) =>
        Object.entries(selector as Record<string, unknown>).every(([key, value]) => row[key] === value)
      )
      if (!product) return []
      Object.assign(product, data)
      return [product]
    }),
  }
  const query = {
    graph: jest.fn(async () => ({
      data: [
        { id: "reg_us", name: "United States", currency_code: "usd", countries: [{ iso_2: "us" }] },
        { id: "reg_intl", name: "International", currency_code: "usd", countries: [{ iso_2: "au" }] },
      ],
    })),
  }
  return {
    products,
    categories,
    storeCore,
    container: {
      resolve: (key: string) => {
        if (key === STORE_CORE_MODULE) return storeCore
        if (key === ContainerRegistrationKeys.QUERY) return query
        throw new Error(`Unexpected dependency: ${key}`)
      },
    },
  }
}

describe("s2b product import csv", () => {
  it("round-trips required one-row-per-variant columns", () => {
    const csv = rowsToCsv([
      {
        source: "s2bdiy",
        source_product_id: "1001",
        source_variant_id: "2001",
        supplier_sku: "CAT-TS-BLK-M",
        seller_title: "Cat, Meme Tee",
        seller_description: "Soft shirt\nwith print",
        category_level_1: "Apparel",
        category_level_2: "T-Shirts",
        product_type: "T-shirt",
        design: "Cat Meme",
        color: "Black",
        size: "M",
        weight: "80",
        cost: "6.5",
        selling_price: "24.99",
        currency: "usd",
        warehouse_region: "CN",
        sellable_country_codes: "US|AU|CA",
        image_urls: "https://example.com/a.png|https://example.com/b.png",
        publish_action: "draft",
      },
    ])

    const rows = parseCsv(csv)
    expect(csv.split("\n")[0]).toBe(S2B_IMPORT_CSV_COLUMNS.join(","))
    expect(rows).toHaveLength(1)
    expect(rows[0].seller_title).toBe("Cat, Meme Tee")
    expect(rows[0].seller_description).toBe("Soft shirt\nwith print")
    expect(rows[0].supplier_sku).toBe("CAT-TS-BLK-M")
  })

  it("previews rows without writing drafts and flags duplicate SKUs", async () => {
    const fake = createFakeContainer()
    const rows = makeRows().slice(0, 2)
    rows[1].supplier_sku = rows[0].supplier_sku

    const preview = await previewS2bImport({
      container: fake.container as never,
      storeId: "store_1",
      csv: rowsToCsv(rows),
    })

    expect(preview.total_rows).toBe(2)
    expect(preview.invalid_rows).toBe(1)
    expect(preview.rows[1].errors).toContain("duplicate supplier_sku in CSV: TS-BLACK-S")
    expect(fake.storeCore.createProducts).not.toHaveBeenCalled()
    expect(fake.storeCore.updateProducts).not.toHaveBeenCalled()
  })

  it("imports six SKU rows as one draft product with category region and warehouse metadata", async () => {
    const fake = createFakeContainer()

    const result = await importS2bDrafts({
      container: fake.container as never,
      storeId: "store_1",
      csv: rowsToCsv(makeRows()),
    })

    expect(result.imported_product_ids).toHaveLength(1)
    expect(fake.products).toHaveLength(1)
    expect(fake.products[0].status).toBe("draft")
    expect(fake.products[0].variants).toHaveLength(6)
    expect(fake.products[0].category_ids).toHaveLength(2)
    expect(fake.products[0].ship_from_country).toBe("CN")
    expect(fake.products[0].metadata).toMatchObject({
      category_level_1: "Apparel",
      category_level_2: "T-Shirts",
      product_type: "T-shirt",
      warehouse_region: "China",
      sellable_country_codes: ["US", "AU"],
      supported_region_ids: ["reg_us", "reg_intl"],
      source_product_id: "1001",
    })
    expect(isStorefrontProductVisible(fake.products[0])).toBe(false)
  })

  it("keeps existing variants on partial re-import and avoids duplicate products", async () => {
    const fake = createFakeContainer()
    const firstFive = makeRows().slice(0, 5)
    const lastSku = makeRows().slice(5)

    await importS2bDrafts({
      container: fake.container as never,
      storeId: "store_1",
      csv: rowsToCsv(firstFive),
    })
    await importS2bDrafts({
      container: fake.container as never,
      storeId: "store_1",
      csv: rowsToCsv(firstFive),
    })
    expect(fake.products).toHaveLength(1)
    expect(fake.products[0].variants).toHaveLength(5)

    await importS2bDrafts({
      container: fake.container as never,
      storeId: "store_1",
      csv: rowsToCsv(lastSku),
    })

    const skus = (fake.products[0].variants as Array<Record<string, unknown>>).map((row) => row.supplier_sku)
    expect(fake.products).toHaveLength(1)
    expect(skus).toHaveLength(6)
    expect(new Set(skus).size).toBe(6)
  })

  it("does not overwrite seller title description or price on published product re-import", async () => {
    const fake = createFakeContainer()
    await importS2bDrafts({
      container: fake.container as never,
      storeId: "store_1",
      csv: rowsToCsv(makeRows().slice(0, 1)),
    })

    Object.assign(fake.products[0], {
      status: "published",
      title: "Seller final title",
      description: "Seller final description",
      price: 31.5,
      variants: [{ ...((fake.products[0].variants as Array<Record<string, unknown>>)[0]), price: 31.5 }],
      metadata: { ...(fake.products[0].metadata as Record<string, unknown>), import_status: "published" },
    })
    const changed = makeRows().slice(0, 1)
    changed[0].seller_title = "CSV overwrite attempt"
    changed[0].seller_description = "CSV overwrite description"
    changed[0].selling_price = "9.99"

    await importS2bDrafts({
      container: fake.container as never,
      storeId: "store_1",
      csv: rowsToCsv(changed),
    })

    expect(fake.products[0]).toMatchObject({
      status: "published",
      title: "Seller final title",
      description: "Seller final description",
      price: 31.5,
    })
    expect((fake.products[0].variants as Array<Record<string, unknown>>)[0].price).toBe(31.5)
    expect(isStorefrontProductVisible(fake.products[0])).toBe(true)
  })
})
