import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../lib/store-context"
import {
  createSellerCoupon,
  ensureDefaultStoreCoupons,
  formatCouponCondition,
  isCouponCurrentlyValid,
  type StoreCouponRecord,
} from "../../../lib/store-coupons"
import { STORE_COUPONS_MODULE } from "../../../modules/store-coupons"
import type StoreCouponsModuleService from "../../../modules/store-coupons/service"

const serializeAdminCoupon = (coupon: StoreCouponRecord) => {
  const labels = formatCouponCondition(coupon)
  return {
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
  }
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { store_id: storeId } = resolveCurrentStore(req)
    await ensureDefaultStoreCoupons(req.scope, storeId)
    const service = req.scope.resolve(STORE_COUPONS_MODULE) as StoreCouponsModuleService
    const coupons = (await service.listStoreCoupons(
      { store_id: storeId },
      { take: 100, order: { created_at: "DESC" } }
    ) as unknown as unknown) as StoreCouponRecord[]
    return res.json({
      store_id: storeId,
      count: coupons.length,
      coupons: coupons.map(serializeAdminCoupon),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to list coupons"
    return res.status(500).json({ error: { code: "ADMIN_COUPON_LIST_ERROR", message } })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { store_id: storeId } = resolveCurrentStore(req)
    const body = (req.body || {}) as {
      code?: string
      title?: string
      description?: string
      discount_amount?: number
      min_subtotal?: number
      scope?: "all_store" | "products"
      product_ids?: string[]
      ends_at?: string | null
      grant_quantity?: number
      coupon_type?: string
    }
    if (!body.title?.trim()) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "title is required" },
      })
    }
    if (body.discount_amount == null || !(Number(body.discount_amount) > 0)) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "discount_amount must be > 0" },
      })
    }

    const created = await createSellerCoupon(req.scope, {
      storeId,
      code: body.code,
      title: body.title,
      description: body.description,
      discountAmount: Number(body.discount_amount),
      minSubtotal: body.min_subtotal,
      scope: body.scope,
      productIds: body.product_ids,
      endsAt: body.ends_at,
      grantQuantity: body.grant_quantity,
      couponType: body.coupon_type,
    })

    return res.status(201).json({ coupon: serializeAdminCoupon(created) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create coupon"
    return res.status(400).json({ error: { code: "ADMIN_COUPON_CREATE_ERROR", message } })
  }
}
