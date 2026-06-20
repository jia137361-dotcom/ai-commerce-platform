import {
  findMedusaVariantReuseConflict,
  findPublishedVariantDuplicates,
  hasDedicatedNativeBridge,
  isSharedSkuProduct,
  productNeedsCartBridgeBackfill,
} from "../lib/product-cart-bridge"

describe("product cart bridge guards", () => {
  it("detects variant reuse by another store-core product", () => {
    const conflict = findMedusaVariantReuseConflict(
      [
        { id: "prod_current", medusa_variant_id: "variant_1" },
        { id: "prod_other", medusa_variant_id: "variant_1" },
      ],
      "prod_current"
    )

    expect(conflict?.id).toBe("prod_other")
  })

  it("allows explicit shared SKU products", () => {
    expect(isSharedSkuProduct({ metadata: { shared_sku: true } })).toBe(true)
    expect(isSharedSkuProduct({ metadata: { shared_sku: false } })).toBe(false)
  })

  it("requires native product and variant metadata to point to the mc_product", () => {
    const metadata = {
      store_id: "default_store",
      mc_product_id: "prod_custom",
      source: "store-core",
    }

    expect(
      hasDedicatedNativeBridge(
        { metadata },
        { metadata },
        "prod_custom",
        "default_store"
      )
    ).toBe(true)
    expect(
      hasDedicatedNativeBridge(
        { metadata },
        { metadata },
        "prod_other",
        "default_store"
      )
    ).toBe(false)
  })

  it("detects when published products still need a cart bridge", () => {
    expect(
      productNeedsCartBridgeBackfill({
        status: "published",
        medusa_variant_id: null,
      })
    ).toBe(true)
    expect(
      productNeedsCartBridgeBackfill({
        status: "published",
        medusa_variant_id: "variant_1",
      })
    ).toBe(false)
    expect(
      productNeedsCartBridgeBackfill({
        status: "draft",
        medusa_variant_id: null,
      })
    ).toBe(false)
  })

  it("finds duplicate published medusa variants in the same store", () => {
    const duplicates = findPublishedVariantDuplicates([
      {
        id: "prod_a",
        store_id: "default_store",
        status: "published",
        medusa_variant_id: "variant_same",
      },
      {
        id: "prod_b",
        store_id: "default_store",
        status: "published",
        medusa_variant_id: "variant_same",
      },
      {
        id: "prod_c",
        store_id: "test_store",
        status: "published",
        medusa_variant_id: "variant_same",
      },
      {
        id: "prod_draft",
        store_id: "default_store",
        status: "draft",
        medusa_variant_id: "variant_same",
      },
    ])

    expect(duplicates).toEqual([
      {
        store_id: "default_store",
        medusa_variant_id: "variant_same",
        product_ids: ["prod_a", "prod_b"],
      },
    ])
  })
})
