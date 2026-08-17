const mockBuildCheckoutDiscountBreakdown = jest.fn()
const mockRefreshPaymentCollectionRun = jest.fn()

jest.mock("../lib/store-coupons", () => ({
  buildCheckoutDiscountBreakdown: (...args: unknown[]) => mockBuildCheckoutDiscountBreakdown(...args),
}))

jest.mock("@medusajs/core-flows", () => ({
  refreshPaymentCollectionForCartWorkflow: jest.fn(() => ({
    run: mockRefreshPaymentCollectionRun,
  })),
}))

import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  CHECKOUT_DISCOUNT_ADJUSTMENT_CODE,
  buildCheckoutDiscountAdjustments,
  syncCartCheckoutPricing,
} from "../lib/sync-cart-checkout-pricing"

describe("checkout pricing synchronization", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRefreshPaymentCollectionRun.mockResolvedValue({ result: undefined })
  })

  it("distributes a major-unit discount without exceeding merchandise lines", () => {
    expect(buildCheckoutDiscountAdjustments([
      { id: "line_1", unit_price: 100, quantity: 1, is_discountable: true },
      { id: "line_2", unit_price: 133.92, quantity: 1, is_discountable: true },
    ], 58.48, "hkd")).toEqual([
      expect.objectContaining({ item_id: "line_1", amount: 58.48, code: CHECKOUT_DISCOUNT_ADJUSTMENT_CODE }),
    ])
  })

  it("writes one canonical adjustment then refreshes the payment collection", async () => {
    const setLineItemAdjustments = jest.fn().mockResolvedValue([])
    const cartModule = {
      retrieveCart: jest.fn().mockResolvedValue({
        id: "cart_1",
        currency_code: "hkd",
        items: [{
          id: "line_1",
          unit_price: 233.92,
          quantity: 1,
          is_discountable: true,
          adjustments: [{ id: "old_discount", item_id: "line_1", code: CHECKOUT_DISCOUNT_ADJUSTMENT_CODE, amount: 1 }],
        }],
      }),
      setLineItemAdjustments,
    }
    const query = {
      graph: jest.fn().mockResolvedValue({
        data: [{ id: "cart_1", currency_code: "hkd", subtotal: 233.92, shipping_total: 5, discount_total: 58.48, total: 180.44 }],
      }),
    }
    const container = {
      resolve: (key: string) => {
        if (key === Modules.CART) return cartModule
        if (key === ContainerRegistrationKeys.QUERY) return query
        throw new Error(`Unexpected dependency: ${key}`)
      },
    }
    mockBuildCheckoutDiscountBreakdown.mockResolvedValue({
      merchandise_subtotal: 233.92,
      shipping_total: 5,
      coupon_discount: 0,
      plan_discount: 58.48,
      plan_discount_percent: 25,
      discount_total: 58.48,
      payable_total: 180.44,
      applied_coupon: null,
      currency_code: "hkd",
    })

    const snapshot = await syncCartCheckoutPricing(container as never, "cart_1", "cus_1")

    expect(setLineItemAdjustments).toHaveBeenCalledWith("cart_1", [
      expect.objectContaining({ item_id: "line_1", amount: 58.48, code: CHECKOUT_DISCOUNT_ADJUSTMENT_CODE }),
    ])
    expect(mockRefreshPaymentCollectionRun).toHaveBeenCalledWith({ input: { cart_id: "cart_1" } })
    expect(snapshot).toEqual({
      merchandiseTotal: 233.92,
      shippingTotal: 5,
      discountTotal: 58.48,
      payableTotal: 180.44,
      currencyCode: "hkd",
    })
  })
})
