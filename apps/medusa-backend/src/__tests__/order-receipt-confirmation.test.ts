import { RECEIPT_CONFIRMATION_WINDOW_MS, isReceiptConfirmed, shouldAutoConfirmReceipt } from "../lib/order-receipt-confirmation"

describe("order receipt confirmation", () => {
  it("requires seven days after delivered evidence for automatic confirmation", () => {
    const now = Date.parse("2026-06-22T12:00:00.000Z")
    const order = { status: "pending", metadata: { mock_delivered_at: new Date(now - RECEIPT_CONFIRMATION_WINDOW_MS).toISOString() } }
    expect(shouldAutoConfirmReceipt(order, now - 1)).toBe(false)
    expect(shouldAutoConfirmReceipt(order, now)).toBe(true)
  })

  it("recognizes buyer-confirmed completion", () => {
    expect(isReceiptConfirmed({ status: "completed", metadata: {} })).toBe(true)
    expect(shouldAutoConfirmReceipt({ status: "completed", metadata: { mock_delivered_at: "2020-01-01T00:00:00Z" } })).toBe(false)
  })
})
