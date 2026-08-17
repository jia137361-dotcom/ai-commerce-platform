import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import * as coreFlows from "@medusajs/core-flows"
import { buildCheckoutDiscountBreakdown } from "./store-coupons"
import { moneyEquals, normalizeMajor } from "./money"

export const CHECKOUT_DISCOUNT_ADJUSTMENT_CODE = "citigoo-checkout-discount"

// Medusa 2.17 exposes this workflow at runtime, but omits it from the package's
// resolved top-level declaration barrel.
const refreshPaymentCollectionForCartWorkflow = (coreFlows as typeof coreFlows & {
  refreshPaymentCollectionForCartWorkflow: (container: MedusaContainer) => {
    run: (input: { input: { cart_id: string } }) => Promise<unknown>
  }
}).refreshPaymentCollectionForCartWorkflow

type CheckoutLine = {
  id?: string | null
  unit_price?: number | string | null
  quantity?: number | string | null
  is_discountable?: boolean | null
  adjustments?: Array<{
    id?: string | null
    item_id?: string | null
    code?: string | null
  }> | null
}

export type CheckoutPricingSnapshot = {
  merchandiseTotal: number
  shippingTotal: number
  discountTotal: number
  payableTotal: number
  currencyCode: string
}

const lineMerchandiseTotal = (line: CheckoutLine, currencyCode: string) => {
  const unitPrice = Number(line.unit_price ?? 0)
  const quantity = Math.max(1, Number(line.quantity ?? 1))
  return normalizeMajor(unitPrice * quantity, currencyCode)
}

export const buildCheckoutDiscountAdjustments = (
  lines: CheckoutLine[],
  discountTotal: number,
  currencyCode: string
) => {
  let remaining = normalizeMajor(discountTotal, currencyCode)
  const adjustments: Array<{
    item_id: string
    code: string
    amount: number
    description: string
  }> = []

  for (const line of lines) {
    if (remaining <= 0 || !line.id || line.is_discountable === false) continue
    const lineTotal = lineMerchandiseTotal(line, currencyCode)
    const amount = normalizeMajor(Math.min(remaining, lineTotal), currencyCode)
    if (amount <= 0) continue
    adjustments.push({
      item_id: line.id,
      code: CHECKOUT_DISCOUNT_ADJUSTMENT_CODE,
      amount,
      description: "Checkout coupon and membership discount",
    })
    remaining = normalizeMajor(remaining - amount, currencyCode)
  }

  if (remaining > 0) {
    throw new Error("Checkout discount exceeds discountable merchandise total")
  }
  return adjustments
}

export async function syncCartCheckoutPricing(
  container: MedusaContainer,
  cartId: string,
  customerId?: string | null
): Promise<CheckoutPricingSnapshot> {
  const cartModule = container.resolve(Modules.CART) as {
    retrieveCart: (id: string, config: Record<string, unknown>) => Promise<{
      currency_code?: string | null
      items?: CheckoutLine[] | null
    }>
    setLineItemAdjustments: (cartId: string, data: Array<Record<string, unknown>>) => Promise<unknown>
  }
  const cart = await cartModule.retrieveCart(cartId, {
    relations: ["items", "items.adjustments", "shipping_methods"],
  })
  const currencyCode = cart.currency_code ?? "usd"
  const breakdown = await buildCheckoutDiscountBreakdown(container, cartId, { customerId })
  const items = cart.items ?? []
  const preservedAdjustments = items.flatMap((line) =>
    (line.adjustments ?? [])
      .filter((adjustment) => adjustment.code !== CHECKOUT_DISCOUNT_ADJUSTMENT_CODE)
      .flatMap((adjustment) =>
        adjustment.id && line.id
          ? [{ id: adjustment.id, item_id: line.id }]
          : []
      )
  )
  const checkoutAdjustments = buildCheckoutDiscountAdjustments(
    items,
    breakdown.discount_total,
    currencyCode
  )

  await cartModule.setLineItemAdjustments(cartId, [
    ...preservedAdjustments,
    ...checkoutAdjustments,
  ])
  await refreshPaymentCollectionForCartWorkflow(container).run({
    input: { cart_id: cartId },
  })

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = (await query.graph({
    entity: "cart",
    fields: ["id", "currency_code", "subtotal", "shipping_total", "discount_total", "total"],
    filters: { id: cartId },
  })) as {
    data: Array<{
      currency_code?: string | null
      subtotal?: number | string | null
      shipping_total?: number | string | null
      discount_total?: number | string | null
      total?: number | string | null
    }>
  }
  const row = data[0]
  if (!row) throw new Error("Cart pricing snapshot is unavailable")
  const snapshot: CheckoutPricingSnapshot = {
    merchandiseTotal: normalizeMajor(row.subtotal ?? breakdown.merchandise_subtotal, currencyCode),
    shippingTotal: normalizeMajor(row.shipping_total ?? breakdown.shipping_total, currencyCode),
    discountTotal: normalizeMajor(row.discount_total ?? breakdown.discount_total, currencyCode),
    payableTotal: normalizeMajor(row.total ?? breakdown.payable_total, currencyCode),
    currencyCode: row.currency_code ?? currencyCode,
  }
  if (!moneyEquals(snapshot.payableTotal, breakdown.payable_total, snapshot.currencyCode)) {
    throw new Error("Medusa cart total does not match checkout payable total")
  }
  return snapshot
}
