import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

const runUpdateCartWorkflow = jest.fn()

jest.mock("@medusajs/medusa/core-flows", () => ({
  updateCartWorkflow: jest.fn(() => ({
    run: runUpdateCartWorkflow,
  })),
}))

import { PUT as updateCartContact } from "../api/store/carts/[id]/contact/route"

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

const createReq = ({
  body = { email: "Buyer@Example.COM ", phone: " +1 555 0100 " },
  headers = {
    "x-publishable-api-key": "pk_test",
    "x-store-id": "default_store",
  },
  cart = {
    id: "cart_1",
    email: null,
    metadata: { store_id: "default_store" },
  },
}: {
  body?: Record<string, unknown>
  headers?: Record<string, string>
  cart?: Record<string, unknown>
} = {}) => {
  const cartAfter = {
    ...cart,
    email: typeof body.email === "string" ? body.email.trim().toLowerCase() : null,
  }
  const cartModule = {
    retrieveCart: jest.fn().mockResolvedValueOnce(cart).mockResolvedValueOnce(cartAfter),
  }

  const req = {
    params: { id: "cart_1" },
    body,
    headers,
    scope: {
      resolve: jest.fn((key: string) => {
        if (key === Modules.CART) return cartModule
        throw new Error(`Unexpected dependency: ${key}`)
      }),
    },
  } as unknown as MedusaRequest

  return { req, cartModule }
}

describe("PUT /store/carts/:cart_id/contact", () => {
  beforeEach(() => {
    runUpdateCartWorkflow.mockReset()
    runUpdateCartWorkflow.mockResolvedValue({ result: {} })
  })

  it("saves normalized email and phone through updateCartWorkflow", async () => {
    const { req } = createReq()
    const res = createRes()

    await updateCartContact(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(runUpdateCartWorkflow).toHaveBeenCalledWith({
      input: {
        id: "cart_1",
        email: "buyer@example.com",
        metadata: {
          store_id: "default_store",
          contact_phone: "+1 555 0100",
        },
      },
    })
    expect(res.body).toMatchObject({
      cart_id: "cart_1",
      store_id: "default_store",
    })
  })

  it("rejects invalid email with 400", async () => {
    const { req } = createReq({ body: { email: "not-email", phone: "555" } })
    const res = createRes()

    await updateCartContact(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(runUpdateCartWorkflow).not.toHaveBeenCalled()
  })

  it("rejects store mismatch", async () => {
    const { req } = createReq({
      cart: { id: "cart_1", metadata: { store_id: "other_store" } },
    })
    const res = createRes()

    await updateCartContact(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(runUpdateCartWorkflow).not.toHaveBeenCalled()
  })

  it("rejects missing publishable API key", async () => {
    const { req } = createReq({ headers: { "x-store-id": "default_store" } })
    const res = createRes()

    await updateCartContact(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(runUpdateCartWorkflow).not.toHaveBeenCalled()
  })

  it("rejects missing store header", async () => {
    const { req } = createReq({ headers: { "x-publishable-api-key": "pk_test" } })
    const res = createRes()

    await updateCartContact(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(runUpdateCartWorkflow).not.toHaveBeenCalled()
  })
})
