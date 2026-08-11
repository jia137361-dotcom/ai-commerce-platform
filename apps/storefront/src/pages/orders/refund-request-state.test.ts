import { buildRefundSelection, canBuyerCancelRefund, canBuyerProvideRefundInformation, refundStatusLabel } from "./refund-request-state"

const items = [
  { id: "line_1", title: "T-shirt", quantity: 2, subtotal: 30 },
  { id: "line_2", title: "Mug", quantity: 1, subtotal: 12 },
]

describe("buyer refund request state", () => {
  it("uses the captured order total estimate when every item is selected", () => {
    expect(buildRefundSelection(items, { line_1: 2, line_2: 1 }, 47)).toEqual({
      items: [{ item_id: "line_1", quantity: 2 }, { item_id: "line_2", quantity: 1 }],
      fullOrder: true,
      estimatedAmount: 47,
    })
  })

  it("prorates a partial item selection without trusting a typed amount", () => {
    expect(buildRefundSelection(items, { line_1: 1, line_2: 0 }, 47)).toEqual({
      items: [{ item_id: "line_1", quantity: 1 }],
      fullOrder: false,
      estimatedAmount: 15,
    })
  })

  it("does not present provider pending as refunded", () => {
    expect(refundStatusLabel({ status: "refund_pending" })).toBe("Refund pending")
    expect(refundStatusLabel({ status: "partially_refunded" })).toBe("Partially refunded")
  })

  it("locks buyer actions once provider refund processing starts", () => {
    expect(canBuyerCancelRefund("manual_review")).toBe(true)
    expect(canBuyerCancelRefund("refund_processing")).toBe(false)
    expect(canBuyerProvideRefundInformation("awaiting_information")).toBe(true)
    expect(canBuyerProvideRefundInformation("manual_review")).toBe(false)
  })
})
