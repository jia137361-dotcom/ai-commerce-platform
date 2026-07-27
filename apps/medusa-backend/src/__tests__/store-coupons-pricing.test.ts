import {
  computeCouponDiscount,
  computePlanDiscount,
  formatCouponCondition,
} from "../lib/store-coupons"

describe("store coupon pricing", () => {
  it("formats no-threshold and threshold labels", () => {
    expect(formatCouponCondition({ discount_amount: 1, min_subtotal: 0 })).toEqual({
      amountLabel: "$1",
      conditionLabel: "No condition",
    })
    expect(formatCouponCondition({ discount_amount: 2, min_subtotal: 10 })).toEqual({
      amountLabel: "$2",
      conditionLabel: "when over $10",
    })
  })

  it("applies flat $1 off with no threshold", () => {
    expect(
      computeCouponDiscount({
        merchandiseSubtotal: 29.99,
        discountAmount: 1,
        minSubtotal: 0,
      })
    ).toBe(1)
  })

  it("blocks threshold coupon below minimum", () => {
    expect(
      computeCouponDiscount({
        merchandiseSubtotal: 9.99,
        discountAmount: 2,
        minSubtotal: 10,
      })
    ).toBe(0)
  })

  it("applies threshold coupon when over minimum", () => {
    expect(
      computeCouponDiscount({
        merchandiseSubtotal: 29.99,
        discountAmount: 2,
        minSubtotal: 10,
      })
    ).toBe(2)
  })

  it("never discounts more than merchandise", () => {
    expect(
      computeCouponDiscount({
        merchandiseSubtotal: 0.5,
        discountAmount: 1,
        minSubtotal: 0,
      })
    ).toBe(0.5)
  })

  it("stacks plan percent after coupon", () => {
    const afterCoupon = 29.99 - 2
    expect(computePlanDiscount(afterCoupon, 25)).toBe(7)
  })
})
