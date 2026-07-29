import {
  bulkStoreProductAction,
  parseBulkStoreProductAction,
  parseBulkStoreProductIds,
  permanentlyDeleteArchivedStoreProduct,
} from "../lib/store-product-bulk"

describe("store-product-bulk", () => {
  const makeService = () => ({
    listProducts: jest.fn(),
    updateProducts: jest.fn(),
    deleteProducts: jest.fn(),
  })

  it("parses bulk product ids", () => {
    expect(parseBulkStoreProductIds([" prod_1 ", "prod_2", "prod_1"])).toEqual(["prod_1", "prod_2"])
  })

  it("rejects empty bulk product ids", () => {
    expect(() => parseBulkStoreProductIds([])).toThrow("at least one id")
  })

  it("parses bulk actions", () => {
    expect(parseBulkStoreProductAction("archive")).toBe("archive")
    expect(parseBulkStoreProductAction("delete")).toBe("delete")
    expect(() => parseBulkStoreProductAction("publish")).toThrow('action must be "archive" or "delete"')
  })

  it("archives non-archived products", async () => {
    const service = makeService()
    service.listProducts.mockResolvedValue([
      { id: "prod_1", status: "draft" },
      { id: "prod_2", status: "archived" },
    ])
    service.updateProducts.mockResolvedValue({ id: "prod_1", status: "archived" })

    const result = await bulkStoreProductAction(service, "default_store", ["prod_1", "prod_2", "prod_3"], "archive")

    expect(result.succeeded).toBe(1)
    expect(result.skipped).toBe(1)
    expect(result.failed).toBe(1)
    expect(service.updateProducts).toHaveBeenCalledWith({
      selector: { id: "prod_1", store_id: "default_store" },
      data: { status: "archived" },
    })
  })

  it("permanently deletes draft, unpublished, and archived products", async () => {
    const service = makeService()
    service.listProducts.mockResolvedValue([
      { id: "prod_1", status: "archived" },
      { id: "prod_2", status: "draft" },
      { id: "prod_3", status: "unpublished" },
      { id: "prod_4", status: "published" },
    ])

    const result = await bulkStoreProductAction(
      service,
      "default_store",
      ["prod_1", "prod_2", "prod_3", "prod_4"],
      "delete"
    )

    expect(result.succeeded).toBe(3)
    expect(result.failed).toBe(1)
    expect(service.deleteProducts).toHaveBeenCalledWith("prod_1")
    expect(service.deleteProducts).toHaveBeenCalledWith("prod_2")
    expect(service.deleteProducts).toHaveBeenCalledWith("prod_3")
  })

  it("permanently deletes a draft product", async () => {
    const service = makeService()
    service.listProducts.mockResolvedValue([{ id: "prod_1", status: "draft" }])

    const result = await permanentlyDeleteArchivedStoreProduct(service, "default_store", "prod_1")
    expect(result).toEqual({ ok: true, product_id: "prod_1" })
    expect(service.deleteProducts).toHaveBeenCalledWith("prod_1")
  })

  it("permanently deletes an unpublished product", async () => {
    const service = makeService()
    service.listProducts.mockResolvedValue([{ id: "prod_1", status: "unpublished" }])

    const result = await permanentlyDeleteArchivedStoreProduct(service, "default_store", "prod_1")
    expect(result).toEqual({ ok: true, product_id: "prod_1" })
    expect(service.deleteProducts).toHaveBeenCalledWith("prod_1")
  })

  it("rejects permanent delete for published products", async () => {
    const service = makeService()
    service.listProducts.mockResolvedValue([{ id: "prod_1", status: "published" }])

    const result = await permanentlyDeleteArchivedStoreProduct(service, "default_store", "prod_1")
    expect(result).toEqual({ ok: false, code: "NOT_DELETABLE", status: "published" })
  })
})
