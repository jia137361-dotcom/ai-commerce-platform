import {
  applyProductStatusFilter,
  buildProductListFilters,
  duplicateProductPayload,
  filterProductsByTitle,
  isProductFailed,
  paginateList,
  parseAdminProductListQuery,
  pickProductUpdateData,
} from "../lib/admin-products"
import { getMcProductById } from "../api/_helpers/store-core"

describe("parseAdminProductListQuery", () => {
  it("defaults limit offset and status all", () => {
    expect(parseAdminProductListQuery({})).toEqual({
      status: "all",
      limit: 20,
      offset: 0,
      q: undefined,
    })
  })

  it("parses status and caps limit at 100", () => {
    expect(parseAdminProductListQuery({ status: "draft", limit: "200", offset: "5" })).toEqual({
      status: "draft",
      limit: 100,
      offset: 5,
      q: undefined,
    })
  })

  it("accepts failed tab status", () => {
    expect(parseAdminProductListQuery({ status: "failed" }).status).toBe("failed")
  })

  it("rejects invalid status", () => {
    expect(() => parseAdminProductListQuery({ status: "broken" })).toThrow(/status must be/)
  })
})

describe("filterProductsByTitle", () => {
  it("filters case-insensitively", () => {
    const products = [{ title: "Cool T-Shirt" }, { title: "Mug" }]
    expect(filterProductsByTitle(products, "t-shirt")).toHaveLength(1)
  })
})

describe("paginateList", () => {
  it("slices and returns total count", () => {
    const { items, count } = paginateList([1, 2, 3, 4, 5], 1, 2)
    expect(items).toEqual([2, 3])
    expect(count).toBe(5)
  })
})

describe("buildProductListFilters", () => {
  it("filters by store only", () => {
    expect(buildProductListFilters("default_store", "all")).toEqual({ store_id: "default_store" })
    expect(buildProductListFilters("default_store", "draft")).toEqual({ store_id: "default_store" })
  })
})

describe("applyProductStatusFilter", () => {
  const rows = [
    { status: "draft", source: "manual" },
    { status: "published", source: "ai" },
    { status: "draft", source: "ai", metadata: { s2b_provision_error: "timeout" } },
  ]

  it("returns all rows for all", () => {
    expect(applyProductStatusFilter(rows, "all")).toHaveLength(3)
  })

  it("filters draft and published", () => {
    expect(applyProductStatusFilter(rows, "draft")).toHaveLength(2)
    expect(applyProductStatusFilter(rows, "published")).toHaveLength(1)
  })

  it("filters failed AI products", () => {
    expect(applyProductStatusFilter(rows, "failed")).toHaveLength(1)
  })
})

describe("isProductFailed", () => {
  it("detects generation_failed metadata", () => {
    expect(isProductFailed({ source: "ai", metadata: { generation_failed: true } })).toBe(true)
  })

  it("detects s2b_provision_error", () => {
    expect(
      isProductFailed({ source: "ai", metadata: { s2b_provision_error: "timeout" } })
    ).toBe(true)
  })
})

describe("pickProductUpdateData", () => {
  it("allows cost on draft only", () => {
    const draft = pickProductUpdateData({ title: "A", cost: 5 }, "draft")
    expect(draft).toEqual({ title: "A", cost: 5 })

    const published = pickProductUpdateData({ title: "A", cost: 5 }, "published")
    expect(published).toEqual({ title: "A" })
  })
})

describe("getMcProductById", () => {
  it("uses retrieveProduct when available", async () => {
    const row = { id: "prod_x", store_id: "default_store", title: "Shirt" }
    const product = await getMcProductById(
      {
        retrieveProduct: jest.fn().mockResolvedValue(row),
        listProducts: jest.fn(),
      } as never,
      "prod_x",
      "default_store"
    )
    expect(product).toEqual(row)
  })

  it("falls back to store listing when id filter returns nothing", async () => {
    const row = { id: "prod_x", store_id: "default_store", title: "Shirt" }
    const listProducts = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([row])

    const product = await getMcProductById({ listProducts } as never, "prod_x", "default_store")
    expect(product).toEqual(row)
    expect(listProducts).toHaveBeenNthCalledWith(1, { id: "prod_x", store_id: "default_store" })
    expect(listProducts).toHaveBeenNthCalledWith(2, { id: ["prod_x"], store_id: "default_store" })
    expect(listProducts).toHaveBeenNthCalledWith(3, { store_id: "default_store" })
  })
})

describe("duplicateProductPayload", () => {
  it("creates draft copy with new title", () => {
    const payload = duplicateProductPayload(
      {
        id: "prod_old",
        store_id: "default_store",
        title: "Shirt",
        status: "published",
        metadata: { seo: {} },
      },
      "default_store"
    )
    expect(payload.title).toBe("Shirt (Copy)")
    expect(payload.status).toBe("draft")
    expect(payload.medusa_product_id).toBeNull()
    expect((payload.metadata as Record<string, unknown>).duplicated_from).toBe("prod_old")
  })
})
