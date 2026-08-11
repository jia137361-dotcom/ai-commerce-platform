import { collectReservedCheckoutCartIds } from "./cart-reservations"

describe("collectReservedCheckoutCartIds", () => {
  it("collects checkout reservation cart ids only", () => {
    const ids = collectReservedCheckoutCartIds([
      { orderId: "order_1", orderKind: "order", checkoutCartId: "cart_a", itemCount: 1, previewItems: [] },
      { orderId: "order_2", orderKind: "checkout_reservation", checkoutCartId: "cart_b", itemCount: 1, previewItems: [] },
      { orderId: "order_3", orderKind: "checkout_reservation", checkoutCartId: "  cart_c  ", itemCount: 1, previewItems: [] },
      { orderId: "order_4", orderKind: "checkout_reservation", checkoutCartId: null, itemCount: 1, previewItems: [] },
    ] as never)

    expect(ids.has("cart_a")).toBe(false)
    expect(ids.has("cart_b")).toBe(true)
    expect(ids.has("cart_c")).toBe(true)
    expect(ids.size).toBe(2)
  })

  it("keeps expired checkout reservation carts out of the normal cart until re-added", () => {
    const ids = collectReservedCheckoutCartIds([
      {
        orderId: "cpa_expired",
        orderKind: "checkout_reservation",
        checkoutCartId: "cart_expired",
        paymentAttemptStatus: "expired",
        paymentExpiresAt: "2026-07-30T11:59:00.000Z",
        itemCount: 1,
        previewItems: [],
      },
    ] as never)

    expect(ids.has("cart_expired")).toBe(true)
  })
})
