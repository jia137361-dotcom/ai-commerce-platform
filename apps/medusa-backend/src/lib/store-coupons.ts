/**
 * Store coupon wallet + checkout discount helpers.
 * Amounts are USD major units unless noted as minor.
 */

import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { STORE_COUPONS_MODULE } from "../modules/store-coupons"
import type StoreCouponsModuleService from "../modules/store-coupons/service"
import { ensureBuyerPlanMetadata } from "./buyer-plan"
import { readString } from "./product-cart-bridge"

export const CART_META_APPLIED_COUPON = "applied_coupon"
export const ORDER_META_COUPON_DISCOUNT = "coupon_discount_total"
export const ORDER_META_PLAN_DISCOUNT = "plan_discount_total"
export const ORDER_META_APPLIED_COUPON = "applied_coupon"

export type StoreCouponRecord = {
  id: string
  store_id: string
  code: string
  title: string
  description?: string | null
  coupon_type: string
  discount_amount: number
  min_subtotal: number
  scope: string
  product_ids?: unknown
  starts_at?: Date | string | null
  ends_at?: Date | string | null
  status: string
  is_default?: boolean
  grant_quantity?: number
  max_claims?: number | null
  claim_count?: number
  metadata?: Record<string, unknown> | null
}

const asCouponList = (value: unknown) => value as StoreCouponRecord[]
const asCoupon = (value: unknown) => unwrapOne(value as StoreCouponRecord | StoreCouponRecord[])
const asWalletList = (value: unknown) => value as BuyerCouponRecord[]
const asWallet = (value: unknown) => unwrapOne(value as BuyerCouponRecord | BuyerCouponRecord[])

const readProductIds = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(String).filter(Boolean) : []


export type BuyerCouponRecord = {
  id: string
  store_id: string
  customer_id: string
  coupon_id: string
  status: string
  quantity: number
  expires_at?: Date | string | null
  claimed_at?: Date | string
  reserved_cart_id?: string | null
  used_at?: Date | string | null
  used_order_id?: string | null
  metadata?: Record<string, unknown> | null
}

export type AppliedCouponMeta = {
  buyer_coupon_id: string
  coupon_id: string
  code: string
  title: string
  discount_amount: number
  min_subtotal: number
  coupon_type: string
}

export type CheckoutDiscountBreakdown = {
  merchandise_subtotal: number
  shipping_total: number
  coupon_discount: number
  plan_discount: number
  plan_discount_percent: number
  discount_total: number
  payable_total: number
  applied_coupon: AppliedCouponMeta | null
  currency_code: string
}

const DEFAULT_COUPONS: Array<{
  code: string
  title: string
  description: string
  discount_amount: number
  min_subtotal: number
  grant_quantity: number
}> = [
  {
    code: "CIIVERSE-FLAT1",
    title: "$1 off, no condition",
    description: "No threshold goods voucher",
    discount_amount: 1,
    min_subtotal: 0,
    grant_quantity: 5,
  },
  {
    code: "CIIVERSE-SAVE2",
    title: "$2 off when over $10",
    description: "Threshold goods voucher — $2 off when order over $10",
    discount_amount: 2,
    min_subtotal: 10,
    grant_quantity: 5,
  },
]

const unwrapOne = <T,>(value: T | T[]): T => (Array.isArray(value) ? value[0] : value)

const asNumber = (value: unknown, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return fallback
}

const asDate = (value: unknown): Date | null => {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const parsed = new Date(String(value))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const getCoupons = (container: MedusaContainer) =>
  container.resolve(STORE_COUPONS_MODULE) as StoreCouponsModuleService

export function isCouponCurrentlyValid(coupon: StoreCouponRecord, now = new Date()) {
  if (coupon.status !== "active") return false
  const starts = asDate(coupon.starts_at)
  const ends = asDate(coupon.ends_at)
  if (starts && starts.getTime() > now.getTime()) return false
  if (ends && ends.getTime() < now.getTime()) return false
  return true
}

export function formatCouponCondition(coupon: Pick<StoreCouponRecord, "discount_amount" | "min_subtotal">) {
  const off = `$${asNumber(coupon.discount_amount).toFixed(coupon.discount_amount % 1 ? 2 : 0)}`
  if (asNumber(coupon.min_subtotal) <= 0) return { amountLabel: off, conditionLabel: "No condition" }
  return {
    amountLabel: off,
    conditionLabel: `when over $${asNumber(coupon.min_subtotal).toFixed(coupon.min_subtotal % 1 ? 2 : 0)}`,
  }
}

export function computeCouponDiscount(input: {
  merchandiseSubtotal: number
  discountAmount: number
  minSubtotal: number
  productIds?: string[] | null
  scope?: string
  cartProductIds?: string[]
}) {
  const merchandise = Math.max(0, asNumber(input.merchandiseSubtotal))
  const minSubtotal = Math.max(0, asNumber(input.minSubtotal))
  const discountAmount = Math.max(0, asNumber(input.discountAmount))
  if (discountAmount <= 0 || merchandise <= 0) return 0
  if (merchandise + 1e-9 < minSubtotal) return 0

  if (input.scope === "products" && Array.isArray(input.productIds) && input.productIds.length) {
    const cartIds = new Set((input.cartProductIds ?? []).filter(Boolean))
    const hits = input.productIds.some((id) => cartIds.has(id))
    if (!hits) return 0
  }

  return Math.min(discountAmount, merchandise)
}

export function computePlanDiscount(merchandiseAfterCoupon: number, planDiscountPercent: number) {
  const base = Math.max(0, merchandiseAfterCoupon)
  const percent = Math.max(0, Math.min(100, asNumber(planDiscountPercent)))
  if (percent <= 0 || base <= 0) return 0
  return Math.round(base * (percent / 100) * 100) / 100
}

export async function ensureDefaultStoreCoupons(container: MedusaContainer, storeId: string) {
  const coupons = getCoupons(container)
  const existing = (await coupons.listStoreCoupons(
    { store_id: storeId, is_default: true },
    { take: 20 }
  ) as unknown as unknown) as StoreCouponRecord[]

  const byCode = new Map(existing.map((row) => [row.code, row]))
  const ensured: StoreCouponRecord[] = [...existing]

  for (const seed of DEFAULT_COUPONS) {
    if (byCode.has(seed.code)) continue
    const ends = new Date()
    ends.setFullYear(ends.getFullYear() + 1)
    const created = unwrapOne(
      (await coupons.createStoreCoupons({
        store_id: storeId,
        code: seed.code,
        title: seed.title,
        description: seed.description,
        coupon_type: "goods_voucher",
        discount_amount: seed.discount_amount,
        min_subtotal: seed.min_subtotal,
        scope: "all_store",
        product_ids: null,
        starts_at: new Date(),
        ends_at: ends,
        status: "active",
        is_default: true,
        grant_quantity: seed.grant_quantity,
        max_claims: null,
        claim_count: 0,
        metadata: { issuer: "ciiverse", seeded: true },
      }) as unknown as unknown) as StoreCouponRecord | StoreCouponRecord[]
    )
    ensured.push(created)
  }

  return ensured
}

export async function claimDefaultCouponsForCustomer(
  container: MedusaContainer,
  storeId: string,
  customerId: string
) {
  const coupons = getCoupons(container)
  const defaults = await ensureDefaultStoreCoupons(container, storeId)
  const activeDefaults = defaults.filter((coupon) => isCouponCurrentlyValid(coupon))
  const owned = (await coupons.listBuyerCoupons(
    { store_id: storeId, customer_id: customerId },
    { take: 200 }
  ) as unknown) as BuyerCouponRecord[]
  const ownedCouponIds = new Set(owned.map((row) => row.coupon_id))

  const claimed: BuyerCouponRecord[] = []
  for (const coupon of activeDefaults) {
    if (ownedCouponIds.has(coupon.id)) continue
    if (coupon.max_claims != null && asNumber(coupon.claim_count) >= asNumber(coupon.max_claims)) {
      continue
    }
    const row = unwrapOne(
      (await coupons.createBuyerCoupons({
      store_id: storeId,
      customer_id: customerId,
      coupon_id: coupon.id,
      status: "available",
      quantity: Math.max(1, Math.floor(asNumber(coupon.grant_quantity, 1))),
      expires_at: coupon.ends_at ?? null,
      claimed_at: new Date(),
      reserved_cart_id: null,
      used_at: null,
      used_order_id: null,
      metadata: { auto_claimed: true },
    } as never) as unknown) as BuyerCouponRecord | BuyerCouponRecord[]
    )
    claimed.push(row)
    await coupons.updateStoreCoupons({
      id: coupon.id,
      claim_count: asNumber(coupon.claim_count) + 1,
    })
  }

  return claimed
}

export function serializeCouponForBuyer(
  coupon: StoreCouponRecord,
  wallet?: BuyerCouponRecord | null,
  storeName = "ciiverse"
) {
  const labels = formatCouponCondition(coupon)
  const expires = asDate(wallet?.expires_at ?? coupon.ends_at)
  const now = Date.now()
  const msLeft = expires ? expires.getTime() - now : null
  const expiringSoon = msLeft != null && msLeft > 0 && msLeft <= 7 * 24 * 60 * 60 * 1000
  const expired =
    wallet?.status === "expired" || (msLeft != null && msLeft <= 0) || coupon.status !== "active"

  return {
    wallet_id: wallet?.id ?? null,
    coupon_id: coupon.id,
    code: coupon.code,
    title: coupon.title,
    description: coupon.description ?? null,
    coupon_type: coupon.coupon_type || "goods_voucher",
    discount_amount: asNumber(coupon.discount_amount),
    min_subtotal: asNumber(coupon.min_subtotal),
    amount_label: labels.amountLabel,
    condition_label: labels.conditionLabel,
    scope: coupon.scope || "all_store",
    product_ids: Array.isArray(coupon.product_ids) ? coupon.product_ids : [],
    scope_label: coupon.scope === "products" ? "Selected products" : "All items in this store",
    store_name: storeName,
    quantity: wallet ? Math.max(1, asNumber(wallet.quantity, 1)) : asNumber(coupon.grant_quantity, 1),
    status: expired ? "expired" : wallet?.status ?? "available",
    expires_at: expires?.toISOString() ?? null,
    expiring_soon: Boolean(expiringSoon && !expired),
    is_default: Boolean(coupon.is_default),
  }
}

export async function listBuyerWalletCoupons(
  container: MedusaContainer,
  storeId: string,
  customerId: string,
  options?: { bucket?: string; storeName?: string }
) {
  await claimDefaultCouponsForCustomer(container, storeId, customerId)
  const coupons = getCoupons(container)
  const wallet = (await coupons.listBuyerCoupons(
    { store_id: storeId, customer_id: customerId },
    { take: 200, order: { created_at: "DESC" } }
  ) as unknown) as BuyerCouponRecord[]

  const couponIds = [...new Set(wallet.map((row) => row.coupon_id))]
  const templates = couponIds.length
    ? ((await coupons.listStoreCoupons({ id: couponIds }, { take: couponIds.length }) as unknown as unknown) as StoreCouponRecord[])
    : []
  const byId = new Map(templates.map((row) => [row.id, row]))

  const storeName = options?.storeName ?? "ciiverse"
  let rows = wallet
    .map((entry) => {
      const template = byId.get(entry.coupon_id)
      if (!template) return null
      return serializeCouponForBuyer(template, entry, storeName)
    })
    .filter(Boolean) as ReturnType<typeof serializeCouponForBuyer>[]

  const bucket = (options?.bucket ?? "all").toLowerCase()
  if (bucket === "shopping") {
    rows = rows.filter((row) => row.coupon_type === "shopping" || row.coupon_type === "goods_voucher")
  } else if (bucket === "expiring") {
    rows = rows.filter((row) => row.expiring_soon && row.status === "available")
  } else if (bucket === "goods") {
    rows = rows.filter((row) => row.coupon_type === "goods_voucher")
  }

  rows = rows.filter((row) => row.status !== "used")
  return rows
}

export function readAppliedCouponFromCartMetadata(
  metadata: Record<string, unknown> | null | undefined
): AppliedCouponMeta | null {
  const raw = metadata?.[CART_META_APPLIED_COUPON]
  if (!raw || typeof raw !== "object") return null
  const row = raw as Record<string, unknown>
  const buyerCouponId = readString(row.buyer_coupon_id)
  const couponId = readString(row.coupon_id)
  if (!buyerCouponId || !couponId) return null
  return {
    buyer_coupon_id: buyerCouponId,
    coupon_id: couponId,
    code: readString(row.code) ?? "",
    title: readString(row.title) ?? "Coupon",
    discount_amount: asNumber(row.discount_amount),
    min_subtotal: asNumber(row.min_subtotal),
    coupon_type: readString(row.coupon_type) ?? "goods_voucher",
  }
}

export async function resolveCartMerchandiseMajor(
  container: MedusaContainer,
  cartId: string
): Promise<{
  merchandiseMajor: number
  shippingMajor: number
  currencyCode: string
  productIds: string[]
  metadata: Record<string, unknown>
  customerId: string | null
  storeId: string | null
}> {
  const cartModule = container.resolve(Modules.CART)
  const cart = await cartModule.retrieveCart(cartId, {
    relations: ["items", "shipping_methods"],
  })
  const items = (cart.items ?? []) as Array<{
    product_id?: string | null
    unit_price?: number | null
    quantity?: number | null
    subtotal?: number | null
    total?: number | null
    metadata?: Record<string, unknown> | null
  }>
  const merchandiseMinor = items.reduce((sum, item) => {
    const qty = Math.max(1, asNumber(item.quantity, 1))
    const line =
      asNumber(item.subtotal) ||
      asNumber(item.total) ||
      asNumber(item.unit_price) * qty
    return sum + line
  }, 0)
  const shippingMinor = ((cart.shipping_methods ?? []) as Array<{ amount?: number | null }>).reduce(
    (sum, method) => sum + asNumber(method.amount),
    0
  )
  const productIds = items
    .map((item) => readString(item.metadata?.mc_product_id) || readString(item.product_id))
    .filter(Boolean) as string[]

  const metadata =
    cart.metadata && typeof cart.metadata === "object"
      ? ({ ...(cart.metadata as Record<string, unknown>) } as Record<string, unknown>)
      : {}

  return {
    merchandiseMajor: Math.round(merchandiseMinor) / 100,
    shippingMajor: Math.round(shippingMinor) / 100,
    currencyCode: cart.currency_code ?? "usd",
    productIds,
    metadata,
    customerId: typeof cart.customer_id === "string" ? cart.customer_id : null,
    storeId: readString(metadata.store_id),
  }
}

export async function buildCheckoutDiscountBreakdown(
  container: MedusaContainer,
  cartId: string,
  options?: { customerId?: string | null }
): Promise<CheckoutDiscountBreakdown> {
  const cart = await resolveCartMerchandiseMajor(container, cartId)
  const applied = readAppliedCouponFromCartMetadata(cart.metadata)
  let couponDiscount = 0
  if (applied) {
    const coupons = getCoupons(container)
    const templates = (await coupons.listStoreCoupons(
      { id: applied.coupon_id },
      { take: 1 }
    ) as unknown as unknown) as StoreCouponRecord[]
    const template = templates[0]
    if (template && isCouponCurrentlyValid(template)) {
      couponDiscount = computeCouponDiscount({
        merchandiseSubtotal: cart.merchandiseMajor,
        discountAmount: template.discount_amount,
        minSubtotal: template.min_subtotal,
        scope: template.scope,
        productIds: Array.isArray(template.product_ids) ? template.product_ids : null,
        cartProductIds: cart.productIds,
      })
    }
  }

  let planPercent = 0
  const customerId = options?.customerId ?? cart.customerId
  if (customerId) {
    try {
      const plan = await ensureBuyerPlanMetadata(container, customerId)
      planPercent = asNumber(plan.discountPercent)
    } catch {
      planPercent = 0
    }
  }
  const planDiscount = computePlanDiscount(
    Math.max(0, cart.merchandiseMajor - couponDiscount),
    planPercent
  )
  const discountTotal = Math.round((couponDiscount + planDiscount) * 100) / 100
  const payableTotal =
    Math.round((cart.merchandiseMajor + cart.shippingMajor - discountTotal) * 100) / 100

  return {
    merchandise_subtotal: cart.merchandiseMajor,
    shipping_total: cart.shippingMajor,
    coupon_discount: couponDiscount,
    plan_discount: planDiscount,
    plan_discount_percent: planPercent,
    discount_total: discountTotal,
    payable_total: Math.max(0, payableTotal),
    applied_coupon: applied && couponDiscount > 0 ? applied : applied,
    currency_code: cart.currencyCode,
  }
}

export async function applyCouponToCart(
  container: MedusaContainer,
  input: {
    cartId: string
    storeId: string
    customerId: string
    buyerCouponId: string
  }
) {
  const coupons = getCoupons(container)
  const walletRows = (await coupons.listBuyerCoupons(
    { id: input.buyerCouponId, customer_id: input.customerId, store_id: input.storeId },
    { take: 1 }
  ) as unknown) as BuyerCouponRecord[]
  const wallet = walletRows[0]
  if (!wallet || wallet.status === "used" || wallet.status === "expired") {
    throw Object.assign(new Error("Coupon is not available"), {
      code: "COUPON_UNAVAILABLE",
      status: 400,
    })
  }

  const templates = (await coupons.listStoreCoupons(
    { id: wallet.coupon_id },
    { take: 1 }
  ) as unknown as unknown) as StoreCouponRecord[]
  const template = templates[0]
  if (!template || !isCouponCurrentlyValid(template)) {
    throw Object.assign(new Error("Coupon template is not active"), {
      code: "COUPON_INACTIVE",
      status: 400,
    })
  }

  const cart = await resolveCartMerchandiseMajor(container, input.cartId)
  const discount = computeCouponDiscount({
    merchandiseSubtotal: cart.merchandiseMajor,
    discountAmount: template.discount_amount,
    minSubtotal: template.min_subtotal,
    scope: template.scope,
    productIds: Array.isArray(template.product_ids) ? template.product_ids : null,
    cartProductIds: cart.productIds,
  })
  if (discount <= 0) {
    throw Object.assign(
      new Error(
        asNumber(template.min_subtotal) > cart.merchandiseMajor
          ? `Order must be over $${asNumber(template.min_subtotal)} to use this coupon`
          : "Coupon does not apply to this cart"
      ),
      { code: "COUPON_NOT_APPLICABLE", status: 400 }
    )
  }

  // Clear previous reservation on other wallet rows for this cart.
  const reserved = (await coupons.listBuyerCoupons(
    { customer_id: input.customerId, store_id: input.storeId, status: "reserved" },
    { take: 50 }
  ) as unknown) as BuyerCouponRecord[]
  for (const row of reserved) {
    if (row.reserved_cart_id === input.cartId && row.id !== wallet.id) {
      await coupons.updateBuyerCoupons({
        id: row.id,
        status: "available",
        reserved_cart_id: null,
      })
    }
  }

  await coupons.updateBuyerCoupons({
    id: wallet.id,
    status: "reserved",
    reserved_cart_id: input.cartId,
  })

  const applied: AppliedCouponMeta = {
    buyer_coupon_id: wallet.id,
    coupon_id: template.id,
    code: template.code,
    title: template.title,
    discount_amount: asNumber(template.discount_amount),
    min_subtotal: asNumber(template.min_subtotal),
    coupon_type: template.coupon_type || "goods_voucher",
  }

  const cartModule = container.resolve(Modules.CART)
  await cartModule.updateCarts(input.cartId, {
    metadata: {
      ...cart.metadata,
      [CART_META_APPLIED_COUPON]: applied,
    },
  })

  return buildCheckoutDiscountBreakdown(container, input.cartId, {
    customerId: input.customerId,
  })
}

export async function clearCouponFromCart(
  container: MedusaContainer,
  input: { cartId: string; customerId?: string | null; storeId: string }
) {
  const cart = await resolveCartMerchandiseMajor(container, input.cartId)
  const applied = readAppliedCouponFromCartMetadata(cart.metadata)
  const coupons = getCoupons(container)
  if (applied?.buyer_coupon_id) {
    const rows = (await coupons.listBuyerCoupons(
      { id: applied.buyer_coupon_id },
      { take: 1 }
    ) as unknown) as BuyerCouponRecord[]
    const row = rows[0]
    if (row && row.status === "reserved") {
      await coupons.updateBuyerCoupons({
        id: row.id,
        status: "available",
        reserved_cart_id: null,
      })
    }
  }

  const nextMeta = { ...cart.metadata }
  delete nextMeta[CART_META_APPLIED_COUPON]
  const cartModule = container.resolve(Modules.CART)
  await cartModule.updateCarts(input.cartId, { metadata: nextMeta })

  return buildCheckoutDiscountBreakdown(container, input.cartId, {
    customerId: input.customerId,
  })
}

export async function redeemAppliedCouponOnOrder(
  container: MedusaContainer,
  input: {
    cartId: string
    orderId: string
    customerId?: string | null
    storeId: string
  }
) {
  const breakdown = await buildCheckoutDiscountBreakdown(container, input.cartId, {
    customerId: input.customerId,
  })
  const applied = breakdown.applied_coupon
  if (applied?.buyer_coupon_id) {
    const coupons = getCoupons(container)
    const rows = (await coupons.listBuyerCoupons(
      { id: applied.buyer_coupon_id },
      { take: 1 }
    ) as unknown) as BuyerCouponRecord[]
    const row = rows[0]
    if (row) {
      const nextQty = Math.max(0, asNumber(row.quantity) - 1)
      if (nextQty <= 0) {
        await coupons.updateBuyerCoupons({
          id: row.id,
          status: "used",
          quantity: 0,
          used_at: new Date(),
          used_order_id: input.orderId,
          reserved_cart_id: null,
        })
      } else {
        await coupons.updateBuyerCoupons({
          id: row.id,
          status: "available",
          quantity: nextQty,
          reserved_cart_id: null,
          metadata: {
            ...(row.metadata && typeof row.metadata === "object" ? row.metadata : {}),
            last_used_order_id: input.orderId,
            last_used_at: new Date().toISOString(),
          },
        })
      }
    }
  }

  return breakdown
}

export async function createSellerCoupon(
  container: MedusaContainer,
  input: {
    storeId: string
    code?: string
    title: string
    description?: string
    discountAmount: number
    minSubtotal?: number
    scope?: "all_store" | "products"
    productIds?: string[]
    endsAt?: string | null
    grantQuantity?: number
    couponType?: string
  }
) {
  const coupons = getCoupons(container)
  const code =
    (input.code?.trim() ||
      `CI-${Math.random().toString(36).slice(2, 8).toUpperCase()}`).toUpperCase()
  const ends =
    input.endsAt && input.endsAt.trim()
      ? new Date(input.endsAt)
      : (() => {
          const d = new Date()
          d.setMonth(d.getMonth() + 3)
          return d
        })()

  return (unwrapOne(
    await coupons.createStoreCoupons({
    store_id: input.storeId,
    code,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    coupon_type: input.couponType?.trim() || "goods_voucher",
    discount_amount: Math.max(0.01, asNumber(input.discountAmount)),
    min_subtotal: Math.max(0, asNumber(input.minSubtotal)),
    scope: input.scope === "products" ? "products" : "all_store",
    product_ids: input.scope === "products" ? input.productIds ?? [] : null,
    starts_at: new Date(),
    ends_at: ends,
    status: "active",
    is_default: false,
    grant_quantity: Math.max(1, Math.floor(asNumber(input.grantQuantity, 1))),
    max_claims: null,
    claim_count: 0,
    metadata: { issuer: "seller", store_brand: "ciiverse" },
  } as never)
  ) as unknown) as StoreCouponRecord
}
