import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCustomerId } from "../../../../../../lib/customer-session"
import { resolveCurrentStore } from "../../../../../../lib/store-context"
import {
  isCouponCurrentlyValid,
  serializeCouponForBuyer,
  type BuyerCouponRecord,
  type StoreCouponRecord,
} from "../../../../../../lib/store-coupons"
import { STORE_COUPONS_MODULE } from "../../../../../../modules/store-coupons"
import type StoreCouponsModuleService from "../../../../../../modules/store-coupons/service"

/** Claim a seller-issued coupon into the buyer wallet by code. */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = resolveCustomerId(req)
  if (!customerId) {
    return res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Customer session is required" },
    })
  }

  try {
    const { store_id: storeId } = resolveCurrentStore(req)
    const body = (req.body || {}) as { code?: string }
    const code = body.code?.trim().toUpperCase()
    if (!code) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "code is required" },
      })
    }

    const service = req.scope.resolve(STORE_COUPONS_MODULE) as StoreCouponsModuleService
    const templates = (await service.listStoreCoupons(
      { store_id: storeId, code },
      { take: 1 }
    ) as unknown as unknown) as StoreCouponRecord[]
    const template = templates[0]
    if (!template || !isCouponCurrentlyValid(template)) {
      return res.status(404).json({
        error: { code: "COUPON_NOT_FOUND", message: "Coupon code is invalid or expired" },
      })
    }

    const owned = (await service.listBuyerCoupons(
      { store_id: storeId, customer_id: customerId, coupon_id: template.id },
      { take: 1 }
    ) as unknown) as BuyerCouponRecord[]
    if (owned[0]) {
      return res.json({
        already_claimed: true,
        coupon: serializeCouponForBuyer(template, owned[0], "ciiverse"),
      })
    }

    const created = await service.createBuyerCoupons({
      store_id: storeId,
      customer_id: customerId,
      coupon_id: template.id,
      status: "available",
      quantity: Math.max(1, Math.floor(Number(template.grant_quantity) || 1)),
      expires_at: template.ends_at ?? null,
      claimed_at: new Date(),
      reserved_cart_id: null,
      used_at: null,
      used_order_id: null,
      metadata: { claimed_by_code: true },
    } as never)
    const wallet = (Array.isArray(created) ? created[0] : created) as BuyerCouponRecord
    await service.updateStoreCoupons({
      id: template.id,
      claim_count: (Number(template.claim_count) || 0) + 1,
    })

    return res.status(201).json({
      already_claimed: false,
      coupon: serializeCouponForBuyer(template, wallet, "ciiverse"),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to claim coupon"
    return res.status(400).json({ error: { code: "COUPON_CLAIM_ERROR", message } })
  }
}
