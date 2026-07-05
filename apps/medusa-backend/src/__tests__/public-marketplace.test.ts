import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { listMarketplaceProducts, listPublicStores, getPublicStoreBySlug } from "../lib/marketplace/public-marketplace"
import { STORE_CORE_MODULE } from "../modules/store-core"

const createStoreCoreMock = (overrides?: {
  stores?: Array<Record<string, unknown>>
  products?: Array<Record<string, unknown>>
  settings?: Array<Record<string, unknown>>
}) => ({
  listStores: jest.fn(async () => overrides?.stores ?? []),
  listProducts: jest.fn(async () => overrides?.products ?? []),
  listStoreSettings: jest.fn(async () => overrides?.settings ?? []),
  listProductReviews: jest.fn(async () => []),
})

const createContainer = (storeCore: ReturnType<typeof createStoreCoreMock>) =>
  ({
    resolve: (key: string) => {
      if (key === STORE_CORE_MODULE) return storeCore
      if (key === ContainerRegistrationKeys.QUERY) {
        return {
          graph: jest.fn(async () => ({ data: [] })),
        }
      }
      throw new Error(`Unexpected resolve key: ${key}`)
    },
  }) as unknown as MedusaContainer

describe("public marketplace", () => {
  it("lists only active stores with product counts", async () => {
    const container = createContainer(
      createStoreCoreMock({
        stores: [
          { id: "default_store", name: "Default", slug: "default-store", status: "active" },
          { id: "shop_b", name: "Shop B", slug: "shop-b", status: "suspended" },
        ],
        products: [
          { id: "p1", store_id: "default_store" },
          { id: "p2", store_id: "default_store" },
        ],
        settings: [{ store_id: "default_store", brand_name: "Citigoo Official" }],
      })
    )

    const result = await listPublicStores(container, { limit: 10 })
    expect(result.count).toBe(1)
    expect(result.stores[0]).toMatchObject({
      store_id: "default_store",
      slug: "default-store",
      brand_name: "Citigoo Official",
      product_count: 2,
    })
  })

  it("resolves store by slug", async () => {
    const container = createContainer(
      createStoreCoreMock({
        stores: [{ id: "store_1", name: "My Shop", slug: "my-shop", status: "active" }],
        products: [{ id: "p1", store_id: "store_1" }],
        settings: [{ store_id: "store_1", brand_name: "My Brand" }],
      })
    )

    const store = await getPublicStoreBySlug(container, "my-shop")
    expect(store).toMatchObject({
      store_id: "store_1",
      slug: "my-shop",
      brand_name: "My Brand",
      product_count: 1,
    })
  })

  it("lists published products across active stores", async () => {
    const container = createContainer(
      createStoreCoreMock({
        stores: [
          { id: "default_store", name: "Default", slug: "default-store", status: "active" },
          { id: "shop_b", name: "Shop B", slug: "shop-b", status: "active" },
        ],
        products: [
          {
            id: "p1",
            store_id: "default_store",
            title: "Alpha Tee",
            status: "published",
            medusa_variant_id: "var_1",
          },
          {
            id: "p2",
            store_id: "shop_b",
            title: "Beta Hoodie",
            status: "published",
            medusa_variant_id: "var_2",
          },
        ],
      })
    )

    const result = await listMarketplaceProducts(container, { limit: 10 })
    expect(result.count).toBe(2)
    expect(new Set(result.products.map((product) => product.store_slug))).toEqual(
      new Set(["default-store", "shop-b"])
    )
  })
})
