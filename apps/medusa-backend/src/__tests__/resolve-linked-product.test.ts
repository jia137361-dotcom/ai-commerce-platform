import { resolveLinkedProductForVariant } from "../lib/resolve-linked-product"

describe("resolveLinkedProductForVariant", () => {
  it("prefers published AI product over phase1 bridge when variant is shared", () => {
    const picked = resolveLinkedProductForVariant(
      [
        {
          id: "prod_phase1_default",
          store_id: "default_store",
          status: "published",
          source: "manual",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "prod_ai_new",
          store_id: "default_store",
          status: "published",
          source: "ai",
          updated_at: "2026-05-20T12:00:00.000Z",
        },
      ],
      { storeId: "default_store" }
    )

    expect(picked?.id).toBe("prod_ai_new")
  })

  it("returns undefined when no products", () => {
    expect(resolveLinkedProductForVariant([])).toBeUndefined()
  })
})
