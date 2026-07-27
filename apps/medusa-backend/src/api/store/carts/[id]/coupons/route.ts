import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCustomerId } from "../../../../../lib/customer-session"
import { resolveCurrentStore } from "../../../../../lib/store-context"
import {
  applyCouponToCart,
  buildCheckoutDiscountBreakdown,
  clearCouponFromCart,
} from "../../../../../lib/store-coupons"
import { assertCartBelongsToCurrentStore } from "../../../../../lib/assert-cart-store"
import { Modules } from "@medusajs/framework/utils"

type Body = {
  action?: "apply" | "clear" | "preview"
  buyer_coupon_id?: string
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const cartId = req.params.id as string
    const customerId = resolveCustomerId(req)
    const cartModule = req.scope.resolve(Modules.CART)
    const cart = await cartModule.retrieveCart(cartId, { relations: ["items"] })
    assertCartBelongsToCurrentStore(req, cart)
    const breakdown = await buildCheckoutDiscountBreakdown(req.scope, cartId, { customerId })
    return res.json({ cart_id: cartId, pricing: breakdown })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to preview coupon pricing"
    const status = typeof (error as { status?: number })?.status === "number" ? (error as { status: number }).status : 400
    return res.status(status).json({ error: { code: "COUPON_PREVIEW_ERROR", message } })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = resolveCustomerId(req)
  if (!customerId) {
    return res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Sign in to apply coupons" },
    })
  }

  try {
    const { store_id: storeId } = resolveCurrentStore(req)
    const cartId = req.params.id as string
    const body = (req.body || {}) as Body
    const cartModule = req.scope.resolve(Modules.CART)
    const cart = await cartModule.retrieveCart(cartId, { relations: ["items"] })
    assertCartBelongsToCurrentStore(req, cart)

    const action = body.action ?? "preview"
    if (action === "clear") {
      const pricing = await clearCouponFromCart(req.scope, { cartId, customerId, storeId })
      return res.json({ cart_id: cartId, pricing })
    }

    if (action === "apply") {
      const buyerCouponId = body.buyer_coupon_id?.trim()
      if (!buyerCouponId) {
        return res.status(400).json({
          error: { code: "VALIDATION_ERROR", message: "buyer_coupon_id is required" },
        })
      }
      const pricing = await applyCouponToCart(req.scope, {
        cartId,
        storeId,
        customerId,
        buyerCouponId,
      })
      return res.json({ cart_id: cartId, pricing })
    }

    const pricing = await buildCheckoutDiscountBreakdown(req.scope, cartId, { customerId })
    return res.json({ cart_id: cartId, pricing })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to apply coupon"
    const code = typeof (error as { code?: string })?.code === "string" ? (error as { code: string }).code : "COUPON_APPLY_ERROR"
    const status = typeof (error as { status?: number })?.status === "number" ? (error as { status: number }).status : 400
    return res.status(status).json({ error: { code, message } })
  }
}
