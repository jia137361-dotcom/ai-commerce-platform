import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../../lib/store-context"
import {
  formatCouponCondition,
  isCouponCurrentlyValid,
  type StoreCouponRecord,
} from "../../../../lib/store-coupons"
import { STORE_COUPONS_MODULE } from "../../../../modules/store-coupons"
import type StoreCouponsModuleService from "../../../../modules/store-coupons/service"

export const PATCH = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { store_id: storeId } = resolveCurrentStore(req)
    const couponId = req.params.id as string
    const body = (req.body || {}) as {
      title?: string
      description?: string | null
      discount_amount?: number
      min_subtotal?: number
      scope?: "all_store" | "products"
      product_ids?: string[]
      ends_at?: string | null
      grant_quantity?: number
      status?: "active" | "archived"
      coupon_type?: string
    }

    const service = req.scope.resolve(STORE_COUPONS_MODULE) as StoreCouponsModuleService
    const existing = (await service.listStoreCoupons(
      { id: couponId, store_id: storeId },
      { take: 1 }
    ) as unknown as unknown) as StoreCouponRecord[]
    const current = existing[0]
    if (!current) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Coupon not found" } })
    }

    const updated = (await service.updateStoreCoupons({
      id: couponId,
      ...(body.title != null ? { title: body.title.trim() } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.discount_amount != null ? { discount_amount: Number(body.discount_amount) } : {}),
      ...(body.min_subtotal != null ? { min_subtotal: Number(body.min_subtotal) } : {}),
      ...(body.scope ? { scope: body.scope } : {}),
      ...(body.product_ids ? { product_ids: body.product_ids } : {}),
      ...(body.ends_at !== undefined
        ? { ends_at: body.ends_at ? new Date(body.ends_at) : null }
        : {}),
      ...(body.grant_quantity != null ? { grant_quantity: Math.max(1, Math.floor(body.grant_quantity)) } : {}),
      ...(body.status ? { status: body.status } : {}),
      ...(body.coupon_type ? { coupon_type: body.coupon_type } : {}),
    } as never) as unknown) as StoreCouponRecord | StoreCouponRecord[]
    const coupon = Array.isArray(updated) ? updated[0] : updated
    const labels = formatCouponCondition(coupon)
    return res.json({
      coupon: {
        id: coupon.id,
        store_id: coupon.store_id,
        code: coupon.code,
        title: coupon.title,
        description: coupon.description ?? null,
        coupon_type: coupon.coupon_type,
        discount_amount: coupon.discount_amount,
        min_subtotal: coupon.min_subtotal,
        amount_label: labels.amountLabel,
        condition_label: labels.conditionLabel,
        scope: coupon.scope,
        product_ids: Array.isArray(coupon.product_ids) ? coupon.product_ids : [],
        starts_at: coupon.starts_at ?? null,
        ends_at: coupon.ends_at ?? null,
        status: coupon.status,
        is_default: Boolean(coupon.is_default),
        grant_quantity: coupon.grant_quantity ?? 1,
        claim_count: coupon.claim_count ?? 0,
        active: isCouponCurrentlyValid(coupon),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update coupon"
    return res.status(400).json({ error: { code: "ADMIN_COUPON_UPDATE_ERROR", message } })
  }
}
