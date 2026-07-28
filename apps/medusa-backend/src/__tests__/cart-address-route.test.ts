import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

const runUpdateCartWorkflow = jest.fn()

jest.mock("@medusajs/medusa/core-flows", () => ({
  updateCartWorkflow: jest.fn(() => ({
    run: runUpdateCartWorkflow,
  })),
}))

import { PUT as updateCartAddress } from "../api/store/carts/[id]/address/route"

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

const body = {
  email: "Buyer@Example.COM ",
  phone: " +86 13800000000 ",
  shipping_address: {
    first_name: "Buyer",
    last_name: "Demo",
    address_1: "Nanjing Road 1",
    address_2: "Suite 2",
    city: "Shanghai",
    province: "Shanghai",
    postal_code: "200000",
    country_code: "CN",
  },
}

const baseCart = {
  id: "cart_1",
  email: null,
  sales_channel_id: "sc_1",
  region_id: "reg_1",
  metadata: { store_id: "default_store" },
  region: {
    id: "reg_1",
    countries: [{ iso_2: "cn" }, { iso_2: "us" }],
  },
}

const createReq = ({
  requestBody = body,
  headers = {
    "x-publishable-api-key": "pk_test",
    "x-store-id": "default_store",
  },
  cart = baseCart,
}: {
  requestBody?: Record<string, unknown>
  headers?: Record<string, string>
  cart?: Record<string, unknown>
} = {}) => {
  const cartAfter = {
    ...cart,
    email: typeof requestBody.email === "string" ? requestBody.email.trim().toLowerCase() : null,
    shipping_address: requestBody.shipping_address,
  }
  const cartModule = {
    retrieveCart: jest.fn().mockResolvedValueOnce(cart).mockResolvedValueOnce(cartAfter),
    updateCarts: jest.fn(async () => cartAfter),
  }
  const regionModule = {
    retrieveRegion: jest.fn(async () => ({ id: "reg_1", countries: [{ iso_2: "cn" }] })),
  }

  const req = {
    params: { id: "cart_1" },
    body: requestBody,
    headers,
    scope: {
      resolve: jest.fn((key: string) => {
        if (key === Modules.CART) return cartModule
        if (key === Modules.REGION) return regionModule
        throw new Error(`Unexpected dependency: ${key}`)
      }),
    },
  } as unknown as MedusaRequest

  return { req, cartModule, regionModule }
}

describe("PUT /store/carts/:cart_id/address", () => {
  beforeEach(() => {
    runUpdateCartWorkflow.mockReset()
    runUpdateCartWorkflow.mockResolvedValue({ result: {} })
  })

  it("updates address through updateCartWorkflow", async () => {
    const { req, cartModule } = createReq()
    const res = createRes()

    await updateCartAddress(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(cartModule.retrieveCart).toHaveBeenNthCalledWith(1, "cart_1", {
      relations: ["items", "shipping_address", "billing_address"],
    })
    expect(runUpdateCartWorkflow).toHaveBeenCalledWith({
      input: {
        id: "cart_1",
        email: "buyer@example.com",
        shipping_address: expect.objectContaining({
          country_code: "cn",
          phone: "+86 13800000000",
        }),
      },
    })
    expect(cartModule.updateCarts).not.toHaveBeenCalled()
  })

  it("rejects country outside cart region", async () => {
    const { req, cartModule } = createReq({
      requestBody: {
        ...body,
        shipping_address: { ...body.shipping_address, country_code: "jp" },
      },
    })
    const res = createRes()

    await updateCartAddress(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(runUpdateCartWorkflow).not.toHaveBeenCalled()
    expect(cartModule.updateCarts).not.toHaveBeenCalled()
  })

  it("falls back to cart module update on calculated_amount workflow error", async () => {
    runUpdateCartWorkflow.mockRejectedValueOnce(
      new Error("Cannot read properties of undefined (reading 'calculated_amount')")
    )
    const { req, cartModule } = createReq()
    const res = createRes()

    await updateCartAddress(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(cartModule.updateCarts).toHaveBeenCalledWith("cart_1", {
      email: "buyer@example.com",
      shipping_address: expect.objectContaining({ country_code: "cn" }),
    })
    const fallbackCall = (
      cartModule.updateCarts.mock.calls as unknown as Array<[string, {
        shipping_address: Record<string, unknown>
        billing_address?: unknown
      }]>
    )[0]
    expect(fallbackCall).toBeDefined()
    const fallbackPayload = fallbackCall[1]
    expect(fallbackPayload).not.toHaveProperty("billing_address")
    expect(fallbackPayload.shipping_address).toMatchObject({
      first_name: "Buyer",
      last_name: "Demo",
      address_1: "Nanjing Road 1",
      address_2: "Suite 2",
      city: "Shanghai",
      province: "Shanghai",
      postal_code: "200000",
      country_code: "cn",
      phone: "+86 13800000000",
    })
    expect(fallbackPayload.shipping_address).not.toBe(body.shipping_address)
  })

  it("returns 500 and does not fallback for non-pricing workflow errors", async () => {
    runUpdateCartWorkflow.mockRejectedValueOnce(new Error("Unexpected workflow failure"))
    const { req, cartModule } = createReq()
    const res = createRes()

    await updateCartAddress(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(cartModule.updateCarts).not.toHaveBeenCalled()
  })

  it("returns 500 for address relation kind errors instead of retrying an unsafe fallback", async () => {
    runUpdateCartWorkflow.mockRejectedValueOnce(
      new Error("Cannot read properties of undefined (reading 'kind')")
    )
    const { req, cartModule } = createReq()
    const res = createRes()

    await updateCartAddress(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(cartModule.updateCarts).not.toHaveBeenCalled()
  })

  it("rejects store mismatch", async () => {
    const { req } = createReq({
      cart: { ...baseCart, metadata: { store_id: "other_store" } },
    })
    const res = createRes()

    await updateCartAddress(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(runUpdateCartWorkflow).not.toHaveBeenCalled()
  })

  it("rejects missing publishable API key", async () => {
    const { req } = createReq({ headers: { "x-store-id": "default_store" } })
    const res = createRes()

    await updateCartAddress(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(runUpdateCartWorkflow).not.toHaveBeenCalled()
  })

  it("rejects missing store header", async () => {
    const { req } = createReq({ headers: { "x-publishable-api-key": "pk_test" } })
    const res = createRes()

    await updateCartAddress(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(runUpdateCartWorkflow).not.toHaveBeenCalled()
  })
})
