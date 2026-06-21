import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

const mockCreateStockLocationsRun = jest.fn()
const mockLinkSalesChannelsRun = jest.fn()
const mockCreateLocationFulfillmentSetRun = jest.fn()
const mockCreateServiceZonesRun = jest.fn()
const mockCreateShippingOptionsRun = jest.fn()
const mockUpdateShippingOptionsRun = jest.fn()
const mockCreateShippingProfilesRun = jest.fn()

jest.mock("@medusajs/core-flows", () => ({
  createStockLocationsWorkflow: jest.fn(() => ({
    run: mockCreateStockLocationsRun,
  })),
  linkSalesChannelsToStockLocationWorkflow: jest.fn(() => ({
    run: mockLinkSalesChannelsRun,
  })),
  createLocationFulfillmentSetWorkflow: jest.fn(() => ({
    run: mockCreateLocationFulfillmentSetRun,
  })),
  createServiceZonesWorkflow: jest.fn(() => ({
    run: mockCreateServiceZonesRun,
  })),
  createShippingOptionsWorkflow: jest.fn(() => ({
    run: mockCreateShippingOptionsRun,
  })),
  updateShippingOptionsWorkflow: jest.fn(() => ({
    run: mockUpdateShippingOptionsRun,
  })),
  createShippingProfilesWorkflow: jest.fn(() => ({
    run: mockCreateShippingProfilesRun,
  })),
}))

jest.mock("../lib/resolve-default-sales-channel", () => ({
  resolveDefaultSalesChannelId: jest.fn(async () => "sc_default"),
}))

import batch11ShippingSmokeSetup, {
  ensureSmokeVariantShippingProfile,
  resolveSmokeVariantShippingProfile,
} from "../scripts/batch11-shipping-smoke-setup"

type GraphCall = {
  entity: string
  fields: string[]
  filters?: Record<string, unknown>
}

const graphResult = (data: Array<Record<string, unknown>>) => ({ data })

const makeQuery = (
  handler: (input: GraphCall) => Array<Record<string, unknown>>
) => ({
  graph: jest.fn(async (input: GraphCall) => graphResult(handler(input))),
})

const existingResourceHandler = (input: GraphCall) => {
  if (input.entity === "product_variant") {
    return [
      {
        id: "variant_smoke",
        product: {
          id: "prod_smoke",
          shipping_profile: { id: "sp_real" },
        },
      },
    ]
  }
  if (input.entity === "stock_location") {
    return [{ id: "sloc_smoke", name: "Batch 11 Smoke Warehouse" }]
  }
  if (input.entity === "sales_channel_location") {
    return [
      {
        id: "scloc_smoke",
        stock_location_id: "sloc_smoke",
        sales_channel_id: "sc_default",
      },
    ]
  }
  if (input.entity === "location_fulfillment_provider") {
    return [
      {
        id: "lfp_smoke",
        stock_location_id: "sloc_smoke",
        fulfillment_provider_id: "manual_manual",
      },
    ]
  }
  if (input.entity === "fulfillment_set") {
    return [
      {
        id: "fuset_smoke",
        name: "Batch 11 Smoke Fulfillment",
        type: "shipping",
      },
    ]
  }
  if (input.entity === "service_zone") {
    return [
      {
        id: "serzo_smoke",
        name: "Batch 11 Smoke China",
        fulfillment_set_id: "fuset_smoke",
      },
    ]
  }
  if (input.entity === "shipping_profile") {
    return [
      {
        id: "sp_default",
        name: "Default Shipping Profile",
        type: "default",
      },
    ]
  }
  return []
}

const makeContainer = ({
  query,
  existingShippingOptions = [],
}: {
  query: ReturnType<typeof makeQuery>
  existingShippingOptions?: Array<Record<string, unknown>>
}) => {
  const remoteLink = { create: jest.fn(async () => undefined) }
  const fulfillmentModule = {
    listShippingOptions: jest.fn(async () => existingShippingOptions),
  }
  const container = {
    resolve: jest.fn((key: string) => {
      if (key === ContainerRegistrationKeys.QUERY) return query
      if (key === ContainerRegistrationKeys.LINK) return remoteLink
      if (key === Modules.FULFILLMENT) return fulfillmentModule
      if (key === Modules.PRODUCT) {
        throw new Error("Product Module should not be used by smoke setup")
      }
      throw new Error(`Unexpected dependency: ${key}`)
    }),
  }

  return { container, remoteLink, fulfillmentModule }
}

describe("Batch 11 shipping smoke setup", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateStockLocationsRun.mockResolvedValue({
      result: [{ id: "sloc_created" }],
    })
    mockCreateLocationFulfillmentSetRun.mockResolvedValue({
      result: [{ id: "fuset_created" }],
    })
    mockCreateServiceZonesRun.mockResolvedValue({
      result: [{ id: "serzo_created" }],
    })
    mockCreateShippingOptionsRun.mockResolvedValue({
      result: [{ id: "so_created", name: "Batch 11 Smoke Standard CN" }],
    })
    mockUpdateShippingOptionsRun.mockResolvedValue({
      result: [{ id: "so_existing" }],
    })
    mockCreateShippingProfilesRun.mockResolvedValue({
      result: [{ id: "sp_created", name: "Batch 11 Smoke Shipping Profile" }],
    })
  })

  it("resolves the smoke variant shipping profile from query graph", async () => {
    const query = makeQuery((input) => {
      if (input.entity === "product_variant") {
        return [
          {
            id: "variant_smoke",
            product: {
              id: "prod_smoke",
              shipping_profile: { id: "sp_real" },
            },
          },
        ]
      }
      return []
    })

    await expect(
      resolveSmokeVariantShippingProfile(query, "variant_smoke")
    ).resolves.toEqual({
      smoke_variant_id: "variant_smoke",
      product_id: "prod_smoke",
      resolved_shipping_profile_id: "sp_real",
      shipping_profile_resolution_source: "query_graph",
      product_profile_link_status: "existing",
      verified_product_shipping_profile_id: "sp_real",
    })
  })

  it("resolves the profile through the product shipping profile link when graph nesting is unavailable", async () => {
    const query = makeQuery((input) => {
      if (input.entity === "product_variant") {
        return [{ id: "variant_smoke", product_id: "prod_smoke" }]
      }
      if (input.entity === "product_shipping_profile") {
        return [
          {
            id: "psp_smoke",
            product_id: "prod_smoke",
            shipping_profile_id: "sp_real",
          },
        ]
      }
      return []
    })

    await expect(
      resolveSmokeVariantShippingProfile(query, "variant_smoke")
    ).resolves.toMatchObject({
      product_id: "prod_smoke",
      resolved_shipping_profile_id: "sp_real",
      shipping_profile_resolution_source: "remote_link",
      product_profile_link_status: "existing",
      verified_product_shipping_profile_id: "sp_real",
    })
  })

  it("throws when the smoke variant profile cannot be resolved", async () => {
    const query = makeQuery((input) => {
      if (input.entity === "product_variant") {
        return [{ id: "variant_smoke", product_id: "prod_smoke" }]
      }
      return []
    })

    await expect(
      resolveSmokeVariantShippingProfile(query, "variant_smoke")
    ).rejects.toThrow("Unable to resolve shipping profile")
  })

  it("creates a product shipping profile link when the smoke product has no link", async () => {
    let linkCreated = false
    const query = makeQuery((input) => {
      if (input.entity === "product_variant") {
        return [{ id: "variant_smoke", product_id: "prod_smoke" }]
      }
      if (input.entity === "shipping_profile") {
        return [{ id: "sp_default", name: "Default Shipping Profile", type: "default" }]
      }
      if (input.entity === "product_shipping_profile" && linkCreated) {
        return [
          {
            id: "psp_created",
            product_id: "prod_smoke",
            shipping_profile_id: "sp_default",
          },
        ]
      }
      return []
    })
    const remoteLink = {
      create: jest.fn(async () => {
        linkCreated = true
      }),
    }

    await expect(
      ensureSmokeVariantShippingProfile({
        container: {} as any,
        query,
        remoteLink,
        fulfillmentModule: { listShippingProfiles: jest.fn() },
        variantId: "variant_smoke",
      })
    ).resolves.toEqual({
      smoke_variant_id: "variant_smoke",
      product_id: "prod_smoke",
      resolved_shipping_profile_id: "sp_default",
      shipping_profile_resolution_source: "existing_default_profile",
      product_profile_link_status: "created",
      verified_product_shipping_profile_id: "sp_default",
    })
    expect(remoteLink.create).toHaveBeenCalledWith([
      {
        [Modules.PRODUCT]: { product_id: "prod_smoke" },
        [Modules.FULFILLMENT]: { shipping_profile_id: "sp_default" },
      },
    ])
  })

  it("reuses an existing product shipping profile link", async () => {
    const query = makeQuery((input) => {
      if (input.entity === "product_variant") {
        return [{ id: "variant_smoke", product_id: "prod_smoke" }]
      }
      if (input.entity === "product_shipping_profile") {
        return [
          {
            id: "psp_existing",
            product_id: "prod_smoke",
            shipping_profile_id: "sp_real",
          },
        ]
      }
      return []
    })
    const remoteLink = { create: jest.fn() }

    await expect(
      ensureSmokeVariantShippingProfile({
        container: {} as any,
        query,
        remoteLink,
        fulfillmentModule: { listShippingProfiles: jest.fn() },
        variantId: "variant_smoke",
      })
    ).resolves.toMatchObject({
      resolved_shipping_profile_id: "sp_real",
      product_profile_link_status: "existing",
    })
    expect(remoteLink.create).not.toHaveBeenCalled()
  })

  it("creates a smoke shipping profile when no default profile exists", async () => {
    let linkCreated = false
    const query = makeQuery((input) => {
      if (input.entity === "product_variant") {
        return [{ id: "variant_smoke", product_id: "prod_smoke" }]
      }
      if (input.entity === "product_shipping_profile" && linkCreated) {
        return [
          {
            id: "psp_created",
            product_id: "prod_smoke",
            shipping_profile_id: "sp_created",
          },
        ]
      }
      return []
    })
    const remoteLink = {
      create: jest.fn(async () => {
        linkCreated = true
      }),
    }

    await expect(
      ensureSmokeVariantShippingProfile({
        container: {} as any,
        query,
        remoteLink,
        fulfillmentModule: { listShippingProfiles: jest.fn(async () => []) },
        variantId: "variant_smoke",
      })
    ).resolves.toMatchObject({
      resolved_shipping_profile_id: "sp_created",
      shipping_profile_resolution_source: "created_smoke_profile",
      product_profile_link_status: "created",
    })
    expect(mockCreateShippingProfilesRun).toHaveBeenCalledWith({
      input: {
        data: [
          {
            name: "Batch 11 Smoke Shipping Profile",
            type: "default",
          },
        ],
      },
    })
  })

  it("stops when product profile link verification fails", async () => {
    const query = makeQuery((input) => {
      if (input.entity === "product_variant") {
        return [{ id: "variant_smoke", product_id: "prod_smoke" }]
      }
      if (input.entity === "shipping_profile") {
        return [{ id: "sp_default", type: "default" }]
      }
      return []
    })
    const remoteLink = { create: jest.fn(async () => undefined) }

    await expect(
      ensureSmokeVariantShippingProfile({
        container: {} as any,
        query,
        remoteLink,
        fulfillmentModule: { listShippingProfiles: jest.fn() },
        variantId: "variant_smoke",
      })
    ).rejects.toThrow("Unable to verify product shipping profile link")
  })

  it("does not resolve to an unverified hardcoded fallback profile", async () => {
    const query = makeQuery((input) => {
      if (input.entity === "product_variant") {
        return [{ id: "variant_smoke", product_id: "prod_smoke" }]
      }
      if (input.entity === "product_shipping_profile") {
        return [
          {
            id: "psp_other",
            product_id: "prod_other",
            shipping_profile_id: "sp_01KRECG8CHQFZQBKJRFGYX493M",
          },
        ]
      }
      return []
    })

    await expect(
      resolveSmokeVariantShippingProfile(query, "variant_smoke")
    ).rejects.toThrow("Unable to resolve shipping profile")
  })

  it("reuses an existing shipping option only when it matches the resolved profile", async () => {
    const query = makeQuery(existingResourceHandler)
    const { container, fulfillmentModule } = makeContainer({
      query,
      existingShippingOptions: [
        {
          id: "so_existing",
          shipping_profile_id: "sp_real",
        },
      ],
    })
    const consoleSpy = jest.spyOn(console, "log").mockImplementation()

    await batch11ShippingSmokeSetup({ container } as any)

    expect(container.resolve).not.toHaveBeenCalledWith(Modules.PRODUCT)
    expect(fulfillmentModule.listShippingOptions).toHaveBeenCalledWith({
      service_zone_id: "serzo_smoke",
      shipping_profile_id: "sp_real",
    })
    expect(mockCreateShippingOptionsRun).not.toHaveBeenCalled()
    expect(mockUpdateShippingOptionsRun).toHaveBeenCalledWith({
      input: [
        {
          id: "so_existing",
          price_type: "flat",
          prices: [
            { amount: 500, currency_code: "usd" },
            { amount: 500, currency_code: "eur" },
          ],
        },
      ],
    })
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('"resolved_shipping_profile_id": "sp_real"')
    )

    consoleSpy.mockRestore()
  })

  it("creates a new shipping option with the resolved profile", async () => {
    const query = makeQuery(existingResourceHandler)
    const { container } = makeContainer({ query, existingShippingOptions: [] })
    const consoleSpy = jest.spyOn(console, "log").mockImplementation()

    await batch11ShippingSmokeSetup({ container } as any)

    expect(mockCreateShippingOptionsRun).toHaveBeenCalledWith(
      expect.objectContaining({
        input: [
          expect.objectContaining({
            service_zone_id: "serzo_smoke",
            shipping_profile_id: "sp_real",
          }),
        ],
      })
    )
    expect(mockUpdateShippingOptionsRun).toHaveBeenCalledWith({
      input: [
        {
          id: "so_created",
          price_type: "flat",
          prices: [
            { amount: 500, currency_code: "usd" },
            { amount: 500, currency_code: "eur" },
          ],
        },
      ],
    })

    consoleSpy.mockRestore()
  })

  it("creates a shipping option with the verified profile after creating a missing product link", async () => {
    let linkCreated = false
    const query = makeQuery((input) => {
      if (input.entity === "product_variant") {
        return [{ id: "variant_smoke", product_id: "prod_smoke" }]
      }
      if (input.entity === "product_shipping_profile" && linkCreated) {
        return [
          {
            id: "psp_created",
            product_id: "prod_smoke",
            shipping_profile_id: "sp_default",
          },
        ]
      }
      const existing = existingResourceHandler(input)
      if (existing.length) return existing
      return []
    })
    const { container, remoteLink } = makeContainer({
      query,
      existingShippingOptions: [],
    })
    remoteLink.create.mockImplementation(async () => {
      linkCreated = true
    })
    const consoleSpy = jest.spyOn(console, "log").mockImplementation()

    await batch11ShippingSmokeSetup({ container } as any)

    expect(mockCreateShippingOptionsRun).toHaveBeenCalledWith(
      expect.objectContaining({
        input: [
          expect.objectContaining({
            shipping_profile_id: "sp_default",
          }),
        ],
      })
    )
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('"product_profile_link_status": "created"')
    )

    consoleSpy.mockRestore()
  })

  it("is idempotent when all smoke resources already exist", async () => {
    const query = makeQuery(existingResourceHandler)
    const { container, remoteLink } = makeContainer({
      query,
      existingShippingOptions: [{ id: "so_existing" }],
    })
    const consoleSpy = jest.spyOn(console, "log").mockImplementation()

    await batch11ShippingSmokeSetup({ container } as any)
    await batch11ShippingSmokeSetup({ container } as any)

    expect(mockCreateStockLocationsRun).not.toHaveBeenCalled()
    expect(mockLinkSalesChannelsRun).not.toHaveBeenCalled()
    expect(remoteLink.create).not.toHaveBeenCalled()
    expect(mockCreateLocationFulfillmentSetRun).not.toHaveBeenCalled()
    expect(mockCreateServiceZonesRun).not.toHaveBeenCalled()
    expect(mockCreateShippingOptionsRun).not.toHaveBeenCalled()
    expect(mockUpdateShippingOptionsRun).toHaveBeenCalledTimes(2)

    consoleSpy.mockRestore()
  })
})
