import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../lib/store-context"
import createCartWorkflow from "../../../workflows/create-cart"
import { CartStoreAccessError } from "../../../lib/cart-store-error"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { store_id: storeId } = resolveCurrentStore(req)

    const body = (req.body || {}) as {
      customer_email?: string
      currency_code?: string
      region_id?: string
    }

    const { result } = await createCartWorkflow(req.scope).run({
      input: {
        store_id: storeId,
        customer_email: body.customer_email,
        currency_code: body.currency_code,
        region_id: body.region_id,
      },
    })

    const cart = result.cart
    const meta = cart.metadata as Record<string, unknown> | null | undefined
    const resolvedStoreId =
      typeof meta?.store_id === "string" ? meta.store_id : storeId

    res.status(200).json({
      cart_id: cart.id,
      store_id: resolvedStoreId,
      ...cart,
    })
  } catch (error: unknown) {
    if (error instanceof CartStoreAccessError) {
      return res.status(403).json({
        error: { code: error.code, message: error.message },
      })
    }
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("创建购物车失败:", error)
    res.status(400).json({ error: message })
  }
}
