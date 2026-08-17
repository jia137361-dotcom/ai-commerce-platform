import {
  enrichOrderWithSummaryTotals,
  readOrderMoney,
  resolveBuyerOrderTotals,
  resolveBuyerOrderTotalsForStorefront,
} from "../lib/buyer-order-totals"

describe("buyer-order-totals", () => {
  it("reads totals from order summary.totals", () => {
    expect(
      resolveBuyerOrderTotals({
        summary: {
          totals: {
            subtotal: 24.99,
            shipping_total: 5,
            total: 29.99,
            current_order_total: 29.99,
          },
        },
      })
    ).toEqual({
      subtotal: 24.99,
      shippingTotal: 5,
      discountTotal: 0,
      taxTotal: 0,
      total: 29.99,
    })
  })

  it("prefers line item subtotal over unreliable graph order root totals", () => {
    expect(
      resolveBuyerOrderTotals({
        subtotal: 5,
        shipping_total: 5,
        total: 5,
        items: [{ unit_price: 24.99, quantity: 1 }],
        summary: { totals: { current_order_total: 29.99 } },
      })
    ).toEqual({
      subtotal: 24.99,
      shippingTotal: 5,
      discountTotal: 0,
      taxTotal: 0,
      total: 29.99,
    })
  })

  it("computes total as subtotal + shipping - discount + tax", () => {
    expect(
      resolveBuyerOrderTotals({
        items: [{ unit_price: 20, quantity: 1 }],
        shipping_total: 5,
        discount_total: 2,
        tax_total: 1,
      })
    ).toEqual({
      subtotal: 20,
      shippingTotal: 5,
      discountTotal: 2,
      taxTotal: 1,
      total: 24,
    })
  })

  it("falls back to line items when order totals are missing", () => {
    expect(
      resolveBuyerOrderTotals({
        currency_code: "usd",
        items: [
          { unit_price: 24.99, quantity: 1 },
          { subtotal: 10, quantity: 2 },
        ],
      })
    ).toEqual({
      subtotal: 34.99,
      shippingTotal: null,
      discountTotal: 0,
      taxTotal: 0,
      total: 34.99,
    })
  })

  it("reads nested money objects", () => {
    expect(readOrderMoney({ numeric: 21.25 })).toBe(21.25)
    expect(readOrderMoney({ value: "5" })).toBe(5)
  })

  it("returns canonical major units unchanged for storefront responses", () => {
    expect(
      resolveBuyerOrderTotalsForStorefront({
        subtotal: 24.99,
        shipping_total: 5,
        discountTotal: 0,
        taxTotal: 0,
        total: 29.99,
      })
    ).toEqual({
      subtotal: 24.99,
      shippingTotal: 5,
      discountTotal: 0,
      taxTotal: 0,
      total: 29.99,
    })
  })

  it("ignores zero graph line subtotals when unit price is present", () => {
    expect(
      resolveBuyerOrderTotals({
        subtotal: 5,
        shipping_total: 5,
        total: 5,
        items: [{ unit_price: 24.99, quantity: 1, subtotal: 0, total: 0 }],
        summary: { totals: { current_order_total: 29.99, shipping_total: 5 } },
      })
    ).toEqual({
      subtotal: 24.99,
      shippingTotal: 5,
      discountTotal: 0,
      taxTotal: 0,
      total: 29.99,
    })
  })

  it("enriches retrieveOrder output with graph summary fields", async () => {
    const graph = jest.fn(async () => ({
      data: [
        {
          subtotal: 5,
          shipping_total: 5,
          total: 5,
          summary: { totals: { current_order_total: 29.99, shipping_total: 5 } },
          items: [{ id: "item_1", unit_price: 24.99, quantity: 1, subtotal: 0, total: 0 }],
        },
      ],
    }))
    const enriched = await enrichOrderWithSummaryTotals(
      { scope: { resolve: () => ({ graph }) } },
      "order_1",
      {
        id: "order_1",
        items: [{ id: "item_1", unit_price: 24.99, quantity: 1 }],
      }
    )
    expect(resolveBuyerOrderTotals(enriched)).toEqual({
      subtotal: 24.99,
      shippingTotal: 5,
      discountTotal: 0,
      taxTotal: 0,
      total: 29.99,
    })
  })
})
