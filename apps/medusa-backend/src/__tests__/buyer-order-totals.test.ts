import {
  buyerOrderTotalsToMajor,
  enrichOrderWithSummaryTotals,
  minorMoneyToMajor,
  readOrderMoney,
  resolveBuyerOrderTotals,
} from "../lib/buyer-order-totals"

describe("buyer-order-totals", () => {
  it("reads totals from order summary.totals", () => {
    expect(
      resolveBuyerOrderTotals({
        summary: {
          totals: {
            subtotal: 2499,
            shipping_total: 500,
            total: 2999,
            current_order_total: 2999,
          },
        },
      })
    ).toEqual({
      subtotal: 2499,
      shippingTotal: 500,
      discountTotal: 0,
      taxTotal: 0,
      total: 2999,
    })
  })

  it("prefers line item subtotal over unreliable graph order root totals", () => {
    expect(
      resolveBuyerOrderTotals({
        subtotal: 500,
        shipping_total: 500,
        total: 500,
        items: [{ unit_price: 2499, quantity: 1 }],
        summary: { totals: { current_order_total: 2999 } },
      })
    ).toEqual({
      subtotal: 2499,
      shippingTotal: 500,
      discountTotal: 0,
      taxTotal: 0,
      total: 2999,
    })
  })

  it("computes total as subtotal + shipping - discount + tax", () => {
    expect(
      resolveBuyerOrderTotals({
        items: [{ unit_price: 2000, quantity: 1 }],
        shipping_total: 500,
        discount_total: 200,
        tax_total: 100,
      })
    ).toEqual({
      subtotal: 2000,
      shippingTotal: 500,
      discountTotal: 200,
      taxTotal: 100,
      total: 2400,
    })
  })

  it("falls back to line items when order totals are missing", () => {
    expect(
      resolveBuyerOrderTotals({
        items: [
          { unit_price: 2499, quantity: 1 },
          { subtotal: 1000, quantity: 2 },
        ],
      })
    ).toEqual({
      subtotal: 3499,
      shippingTotal: null,
      discountTotal: 0,
      taxTotal: 0,
      total: 3499,
    })
  })

  it("reads nested money objects", () => {
    expect(readOrderMoney({ numeric: 2125 })).toBe(2125)
    expect(readOrderMoney({ value: "500" })).toBe(500)
  })

  it("converts minor units to major units for storefront responses", () => {
    expect(
      buyerOrderTotalsToMajor({
        subtotal: 2499,
        shippingTotal: 500,
        discountTotal: 0,
        taxTotal: 0,
        total: 2999,
      })
    ).toEqual({
      subtotal: 24.99,
      shippingTotal: 5,
      discountTotal: 0,
      taxTotal: 0,
      total: 29.99,
    })
    expect(minorMoneyToMajor(500)).toBe(5)
  })

  it("ignores zero graph line subtotals when unit price is present", () => {
    expect(
      resolveBuyerOrderTotals({
        subtotal: 500,
        shipping_total: 500,
        total: 500,
        items: [{ unit_price: 2499, quantity: 1, subtotal: 0, total: 0 }],
        summary: { totals: { current_order_total: 2999, shipping_total: 500 } },
      })
    ).toEqual({
      subtotal: 2499,
      shippingTotal: 500,
      discountTotal: 0,
      taxTotal: 0,
      total: 2999,
    })
  })

  it("enriches retrieveOrder output with graph summary fields", async () => {
    const graph = jest.fn(async () => ({
      data: [
        {
          subtotal: 500,
          shipping_total: 500,
          total: 500,
          summary: { totals: { current_order_total: 2999, shipping_total: 500 } },
          items: [{ id: "item_1", unit_price: 2499, quantity: 1, subtotal: 0, total: 0 }],
        },
      ],
    }))
    const enriched = await enrichOrderWithSummaryTotals(
      { scope: { resolve: () => ({ graph }) } },
      "order_1",
      {
        id: "order_1",
        items: [{ id: "item_1", unit_price: 2499, quantity: 1 }],
      }
    )
    expect(resolveBuyerOrderTotals(enriched)).toEqual({
      subtotal: 2499,
      shippingTotal: 500,
      discountTotal: 0,
      taxTotal: 0,
      total: 2999,
    })
  })
})
