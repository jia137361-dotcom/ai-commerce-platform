import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

const mockListShippingOptionsRun = jest.fn()
const mockAddShippingMethodRun = jest.fn()

jest.mock("@medusajs/medusa/core-flows", () => ({
  listShippingOptionsForCartWorkflow: jest.fn(() => ({
    run: mockListShippingOptionsRun,
  })),
  addShippingMethodToCartWorkflow: jest.fn(() => ({
    run: mockAddShippingMethodRun,
  })),
}))

import { GET as getShippingOptions } from "../api/store/carts/[id]/shipping-options/route"
import { POST as selectShippingMethod } from "../api/store/carts/[id]/shipping-methods/route"

type MockRes = MedusaResponse & {
  statusCode?: number
  body?: unknown
  status: jest.Mock
  json: jest.Mock
}

const createRes = (): MockRes => {
  const res: Partial<MockRes> = {}
  res.status = jest.fn((code: number) => {
    res.statusCode = code
    return res
  }) as unknown as MockRes["status"]
  res.json = jest.fn((body: unknown) => {
    res.body = body
    return res
  }) as unknown as MockRes["json"]
  return res as MockRes
}

const baseHeaders = {
  "x-publishable-api-key": "pk_test",
  "x-store-id": "default_store",
}

const baseCart = {
  id: "cart_1",
  currency_code: "usd",
  metadata: { store_id: "default_store" },
  items: [{ id: "line_1", requires_shipping: true }],
  shipping_address: { id: "addr_1", country_code: "cn" },
  shipping_methods: [],
}

const createReq = ({
  body = {},
  headers = baseHeaders,
  cart = baseCart,
  cartAfter = { ...baseCart, shipping_methods: [{ id: "sm_1", shipping_option_id: "so_1" }] },
  listProducts = jest.fn().mockResolvedValue([]),
}: {
  body?: Record<string, unknown>
  headers?: Record<string, string>
  cart?: Record<string, unknown>
  cartAfter?: Record<string, unknown>
  listProducts?: jest.Mock
} = {}) => {
  const cartModule = {
    retrieveCart: jest
      .fn()
      .mockResolvedValueOnce(cart)
      .mockResolvedValueOnce(cartAfter)
      .mockResolvedValue(cartAfter),
    updateLineItems: jest.fn().mockResolvedValue(undefined),
    updateCarts: jest.fn().mockResolvedValue(undefined),
    updateShippingMethods: jest.fn().mockResolvedValue(undefined),
    softDeleteShippingMethods: jest.fn().mockResolvedValue(undefined),
  }
  const req = {
    params: { id: "cart_1" },
    body,
    headers,
    scope: {
      resolve: jest.fn((key: string) => {
        if (key === Modules.CART) return cartModule
        if (key === "store_core") return { listProducts }
        throw new Error(`Unexpected dependency: ${key}`)
      }),
    },
  } as unknown as MedusaRequest

  return { req, cartModule, listProducts }
}

describe("GET /store/carts/:cart_id/shipping-options", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockListShippingOptionsRun.mockResolvedValue({
      result: [
        {
          id: "so_1",
          name: "Standard",
          provider_id: "manual",
          service_zone_id: "serzo_1",
          shipping_profile_id: "sp_1",
          calculated_price: { calculated_amount: 1200 },
        },
      ],
    })
  })

  it("requires saved shipping address for shippable carts", async () => {
    const { req } = createReq({
      cart: { ...baseCart, shipping_address: null },
    })
    const res = createRes()

    await getShippingOptions(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(mockListShippingOptionsRun).not.toHaveBeenCalled()
  })

  it("returns requires_shipping_method=true for shippable carts even when no options exist", async () => {
    mockListShippingOptionsRun.mockResolvedValueOnce({ result: [] })
    const { req } = createReq()
    const res = createRes()

    await getShippingOptions(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.body).toMatchObject({
      shipping_options: [],
      requires_shipping_method: true,
    })
  })

  it("returns false for carts with no shippable items", async () => {
    mockListShippingOptionsRun.mockResolvedValueOnce({ result: [] })
    const { req } = createReq({
      cart: { ...baseCart, items: [{ id: "line_1", requires_shipping: false }], shipping_address: null },
    })
    const res = createRes()

    await getShippingOptions(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.body).toMatchObject({
      shipping_options: [],
      requires_shipping_method: false,
    })
  })
})

describe("POST /store/carts/:cart_id/shipping-methods", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAddShippingMethodRun.mockResolvedValue({ result: {} })
  })

  it("selects a valid shipping option through the Medusa workflow", async () => {
    const { req, cartModule } = createReq({
      body: { option_id: "so_1" },
      cart: {
        ...baseCart,
        shipping_methods: [{ id: "casm_old", shipping_option_id: "so_old" }],
      },
    })
    const res = createRes()

    await selectShippingMethod(req, res)

    expect(cartModule.softDeleteShippingMethods).toHaveBeenCalledWith(["casm_old"])
    expect(mockAddShippingMethodRun).toHaveBeenCalledWith({
      input: {
        cart_id: "cart_1",
        options: [{ id: "so_1" }],
      },
    })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.body).toMatchObject({
      cart: {
        shipping_methods: [{ id: "sm_1", shipping_option_id: "so_1" }],
      },
    })
  })

  it("rejects missing option id", async () => {
    const { req } = createReq({ body: {} })
    const res = createRes()

    await selectShippingMethod(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(mockAddShippingMethodRun).not.toHaveBeenCalled()
  })

  it("rejects wrong store carts", async () => {
    const { req } = createReq({
      body: { option_id: "so_1" },
      cart: { ...baseCart, metadata: { store_id: "other_store" } },
    })
    const res = createRes()

    await selectShippingMethod(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(mockAddShippingMethodRun).not.toHaveBeenCalled()
  })
})
