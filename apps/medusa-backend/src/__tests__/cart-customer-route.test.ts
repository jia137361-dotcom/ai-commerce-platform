import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { POST as bindCustomerToCart } from "../api/store/carts/[id]/customer/route"

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
  authCustomerId = "cus_a",
  cartCustomerId = null,
  persistedCustomerId = "cus_a",
  headers = {
    "x-publishable-api-key": "pk_test",
    "x-store-id": "default_store",
  },
  cartStoreId = "default_store",
}: {
  authCustomerId?: string | null
  cartCustomerId?: string | null
  persistedCustomerId?: string | null
  headers?: Record<string, string>
  cartStoreId?: string
} = {}) => {
  const cartBefore = {
    id: "cart_1",
    customer_id: cartCustomerId,
    metadata: { store_id: cartStoreId },
  }
  const cartAfter = {
    ...cartBefore,
    customer_id: cartCustomerId ?? persistedCustomerId,
  }
  const cartModule = {
    retrieveCart: jest.fn().mockResolvedValueOnce(cartBefore).mockResolvedValueOnce(cartAfter),
    updateCarts: jest.fn().mockResolvedValue(cartAfter),
  }
  const req = {
    params: { id: "cart_1" },
    headers,
    auth_context: authCustomerId ? { actor_id: authCustomerId } : undefined,
    scope: {
      resolve: jest.fn((key: string) => {
        if (key === Modules.CART) return cartModule
        throw new Error(`Unexpected dependency: ${key}`)
      }),
    },
  } as unknown as MedusaRequest

  return { req, cartModule }
}

describe("POST /store/carts/:cart_id/customer", () => {
  it("requires an authenticated customer session", async () => {
    const { req, cartModule } = createReq({ authCustomerId: null })
    const res = createRes()

    await bindCustomerToCart(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(cartModule.updateCarts).not.toHaveBeenCalled()
  })

  it("binds an unowned cart to the current customer", async () => {
    const { req, cartModule } = createReq()
    const res = createRes()

    await bindCustomerToCart(req, res)

    expect(cartModule.updateCarts).toHaveBeenCalledWith("cart_1", { customer_id: "cus_a" })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.body).toMatchObject({
      cart_id: "cart_1",
      store_id: "default_store",
      customer_id: "cus_a",
      cart: { customer_id: "cus_a" },
    })
  })

  it("is idempotent when the cart already belongs to the current customer", async () => {
    const { req, cartModule } = createReq({ cartCustomerId: "cus_a" })
    const res = createRes()

    await bindCustomerToCart(req, res)

    expect(cartModule.updateCarts).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.body).toMatchObject({ cart_id: "cart_1", customer_id: "cus_a" })
  })

  it("rejects a cart owned by another customer", async () => {
    const { req, cartModule } = createReq({ cartCustomerId: "cus_b" })
    const res = createRes()

    await bindCustomerToCart(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(cartModule.updateCarts).not.toHaveBeenCalled()
  })

  it("rejects store mismatch", async () => {
    const { req, cartModule } = createReq({ cartStoreId: "other_store" })
    const res = createRes()

    await bindCustomerToCart(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(cartModule.updateCarts).not.toHaveBeenCalled()
  })
})
