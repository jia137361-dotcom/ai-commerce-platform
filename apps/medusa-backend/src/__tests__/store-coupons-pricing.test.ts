import {
  applyCouponToCart,
  clearCouponFromCart,
  computeCouponDiscount,
  computePlanDiscount,
  formatCouponCondition,
  redeemAppliedCouponOnOrder,
} from "../lib/store-coupons"
import { STORE_COUPONS_MODULE } from "../modules/store-coupons"
import { Modules } from "@medusajs/framework/utils"

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

  it("marks a buyer coupon row used after order redemption even when quantity remains", async () => {
    const buyerCoupon = {
      id: "bc_1",
      store_id: "store_1",
      customer_id: "cus_1",
      coupon_id: "coupon_1",
      status: "reserved",
      quantity: 5,
      reserved_cart_id: "cart_1",
      metadata: {},
    }
    const updates: Array<Record<string, unknown>> = []
    const couponService = {
      listStoreCoupons: jest.fn().mockResolvedValue([
        {
          id: "coupon_1",
          store_id: "store_1",
          code: "SAVE2",
          title: "$2 off",
          coupon_type: "goods_voucher",
          discount_amount: 2,
          min_subtotal: 10,
          scope: "all_store",
          status: "active",
        },
      ]),
      listBuyerCoupons: jest.fn().mockResolvedValue([buyerCoupon]),
      updateBuyerCoupons: jest.fn(async (data) => {
        updates.push(data)
        return data
      }),
    }
    const cartService = {
      retrieveCart: jest.fn().mockResolvedValue({
        id: "cart_1",
        currency_code: "usd",
        customer_id: "cus_1",
        metadata: {
          store_id: "store_1",
          applied_coupon: {
            buyer_coupon_id: "bc_1",
            coupon_id: "coupon_1",
            code: "SAVE2",
            title: "$2 off",
            discount_amount: 2,
            min_subtotal: 10,
            coupon_type: "goods_voucher",
          },
        },
        items: [{ product_id: "prod_1", unit_price: 2999, quantity: 1 }],
        shipping_methods: [],
      }),
    }
    const container = {
      resolve: (key: string) => {
        if (key === STORE_COUPONS_MODULE) return couponService
        if (key === Modules.CART) return cartService
        throw new Error(`Unexpected dependency: ${key}`)
      },
    }

    await redeemAppliedCouponOnOrder(container as never, {
      cartId: "cart_1",
      orderId: "order_1",
      customerId: null,
      storeId: "store_1",
    })

    expect(updates[0]).toMatchObject({
      id: "bc_1",
      status: "used",
      quantity: 0,
      used_order_id: "order_1",
      reserved_cart_id: null,
    })
    expect(updates[0].metadata).toMatchObject({ redeemed_quantity: 5 })
  })

  it("clears an applied coupon and allows the same wallet coupon to be selected again", async () => {
    const buyerCoupon = {
      id: "bc_1",
      store_id: "store_1",
      customer_id: "cus_1",
      coupon_id: "coupon_1",
      status: "reserved",
      quantity: 1,
      reserved_cart_id: "cart_1" as string | null,
    }
    const cart = {
      id: "cart_1",
      currency_code: "usd",
      customer_id: null,
      metadata: {
        store_id: "store_1",
        applied_coupon: {
          buyer_coupon_id: "bc_1",
          coupon_id: "coupon_1",
          code: "SAVE2",
          title: "$2 off",
          discount_amount: 2,
          min_subtotal: 10,
          coupon_type: "goods_voucher",
        } as Record<string, unknown> | null,
      },
      items: [{ product_id: "prod_1", unit_price: 2999, quantity: 1 }],
      shipping_methods: [],
    }
    const template = {
      id: "coupon_1",
      store_id: "store_1",
      code: "SAVE2",
      title: "$2 off",
      coupon_type: "goods_voucher",
      discount_amount: 2,
      min_subtotal: 10,
      scope: "all_store",
      status: "active",
    }
    const couponService = {
      listStoreCoupons: jest.fn().mockResolvedValue([template]),
      listBuyerCoupons: jest.fn(async (filters: Record<string, unknown>) => {
        if (filters.id && filters.id !== buyerCoupon.id) return []
        if (filters.status && filters.status !== buyerCoupon.status) return []
        return [buyerCoupon]
      }),
      updateBuyerCoupons: jest.fn(async (data: Record<string, unknown>) => {
        Object.assign(buyerCoupon, data)
        return buyerCoupon
      }),
    }
    const cartService = {
      retrieveCart: jest.fn(async () => cart),
      updateCarts: jest.fn(async (_cartId: string, data: { metadata: Record<string, unknown> }) => {
        // Match Medusa's metadata merge behavior.
        cart.metadata = { ...cart.metadata, ...data.metadata }
        return cart
      }),
    }
    const container = {
      resolve: (key: string) => {
        if (key === STORE_COUPONS_MODULE) return couponService
        if (key === Modules.CART) return cartService
        throw new Error(`Unexpected dependency: ${key}`)
      },
    }

    const cleared = await clearCouponFromCart(container as never, {
      cartId: "cart_1",
      customerId: null,
      storeId: "store_1",
    })

    expect(cleared.applied_coupon).toBeNull()
    expect(cart.metadata.applied_coupon).toBeNull()
    expect(buyerCoupon).toMatchObject({ status: "available", reserved_cart_id: null })

    const reapplied = await applyCouponToCart(container as never, {
      cartId: "cart_1",
      storeId: "store_1",
      customerId: "cus_1",
      buyerCouponId: "bc_1",
    })

    expect(reapplied.applied_coupon).toMatchObject({ buyer_coupon_id: "bc_1" })
    expect(buyerCoupon).toMatchObject({ status: "reserved", reserved_cart_id: "cart_1" })
  })
})
