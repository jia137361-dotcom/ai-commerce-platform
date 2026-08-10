import {
  enrichBuyerDesignShipFromCountries,
  resolveBuyerDesignShipFromCountry,
} from "../lib/buyer-design-ship-from"

describe("buyer-design-ship-from", () => {
  it("resolves ship-from from blank product id", async () => {
    const storeCore = {
      retrieveProduct: jest.fn(async (id: string) => {
        expect(id).toBe("prod_blank")
        return { id, ship_from_country: "CN" }
      }),
      listProducts: jest.fn(async () => []),
    }

    await expect(
      resolveBuyerDesignShipFromCountry(storeCore, {
        storeId: "default_store",
        blankProductId: "prod_blank",
      })
    ).resolves.toBe("CN")
  })

  it("falls back to published blank with same basic_product_id", async () => {
    const storeCore = {
      listProducts: jest.fn(async () => [
        {
          id: "prod_custom",
          ship_from_country: null,
          metadata: { buyer_design: true },
        },
        {
          id: "prod_blank",
          ship_from_country: "US",
          metadata: {},
        },
      ]),
    }

    await expect(
      resolveBuyerDesignShipFromCountry(storeCore, {
        storeId: "default_store",
        basicProductId: "123",
      })
    ).resolves.toBe("US")
  })

  it("enriches catalog rows missing ship-from from blank metadata", async () => {
    const storeCore = {
      retrieveProduct: jest.fn(async () => ({ id: "prod_blank", ship_from_country: "GB" })),
      listProducts: jest.fn(async () => []),
    }

    const enriched = await enrichBuyerDesignShipFromCountries(storeCore, "default_store", [
      {
        id: "prod_custom",
        ship_from_country: null,
        metadata: { buyer_design: true, blank_product_id: "prod_blank" },
      },
      {
        id: "prod_blank_listed",
        ship_from_country: "US",
        metadata: {},
      },
    ])

    expect(enriched[0].ship_from_country).toBe("GB")
    expect(enriched[1].ship_from_country).toBe("US")
  })
})
