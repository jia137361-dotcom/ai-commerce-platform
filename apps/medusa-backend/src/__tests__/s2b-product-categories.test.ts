import { ensureCurrentStoreS2bCategoryIds } from "../lib/s2b-product-categories"

describe("S2B product category isolation", () => {
  it("creates the supplier category path in the current store and returns leaf first", async () => {
    const categories: Array<Record<string, unknown>> = []
    const storeCore = {
      listSupplierProducts: jest.fn().mockResolvedValue([{
        id: "sp_1",
        raw_json: {
          categorys: [
            { id: 10, name: "服装", en_name: "Apparel" },
            { id: 11, name: "T恤", en_name: "T-Shirts" },
          ],
        },
      }]),
      listProductCategories: jest.fn().mockImplementation(async ({ store_id }: { store_id: string }) =>
        categories.filter((category) => category.store_id === store_id)
      ),
      createProductCategories: jest.fn().mockImplementation(async (data: Record<string, unknown>) => {
        const category = { id: `cat_${categories.length + 1}`, ...data }
        categories.push(category)
        return category
      }),
      updateProductCategories: jest.fn(),
    }

    const ids = await ensureCurrentStoreS2bCategoryIds(storeCore as never, "store_ciiverse", {
      supplier_id: "sup_s2bdiy",
      supplier_product_id: "sp_1",
    })

    expect(ids).toEqual(["cat_2", "cat_1"])
    expect(categories).toMatchObject([
      { store_id: "store_ciiverse", name: "Apparel", parent_id: null, supplier_category_id: "10", level: 1 },
      { store_id: "store_ciiverse", name: "T-Shirts", parent_id: "cat_1", supplier_category_id: "11", level: 2 },
    ])
  })

  it("does not auto-create categories for non-S2B products", async () => {
    const storeCore = { listSupplierProducts: jest.fn() }
    await expect(ensureCurrentStoreS2bCategoryIds(storeCore as never, "store_1", {
      supplier_id: "seller_owned",
    })).resolves.toBeNull()
    expect(storeCore.listSupplierProducts).not.toHaveBeenCalled()
  })
})
