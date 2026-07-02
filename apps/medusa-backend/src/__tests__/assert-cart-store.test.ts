import type { MedusaRequest } from "@medusajs/framework/http"
import {
  assertCartBelongsToCurrentStore,
  readCartStoreId,
} from "../lib/assert-cart-store"
import { CartStoreAccessError } from "../lib/cart-store-error"
import { DEFAULT_STORE_ID } from "../lib/store-context"

const reqWithHeader = (storeId: string): MedusaRequest =>
  ({
    headers: { "x-store-id": storeId },
  }) as unknown as MedusaRequest

describe("readCartStoreId", () => {
  it("returns trimmed metadata.store_id when set", () => {
    expect(readCartStoreId({ metadata: { store_id: "  shop_a  " } })).toBe("shop_a")
  })

  it("falls back to DEFAULT_STORE_ID when missing", () => {
    expect(readCartStoreId({ metadata: {} })).toBe(DEFAULT_STORE_ID)
    expect(readCartStoreId({ metadata: null })).toBe(DEFAULT_STORE_ID)
  })
})

describe("assertCartBelongsToCurrentStore", () => {
  it("does not throw when cart store matches header store", () => {
    const req = reqWithHeader("store-a")
    expect(() =>
      assertCartBelongsToCurrentStore(req, {
        metadata: { store_id: "store-a" },
      })
    ).not.toThrow()
  })

  it("throws CartStoreAccessError when cart store differs from current", () => {
    const req = reqWithHeader("store-a")
    expect(() =>
      assertCartBelongsToCurrentStore(req, {
        metadata: { store_id: "store-b" },
      })
    ).toThrow(CartStoreAccessError)
  })
})
