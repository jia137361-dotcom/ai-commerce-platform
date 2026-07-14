import { buyerOwnsDesign } from "../api/store/my-designs/route"

describe("buyerOwnsDesign", () => {
  it("returns account designs only for the matching customer", () => {
    expect(
      buyerOwnsDesign({ customer_id: "cus_a", guest_key: "guest_old" }, "cus_a", "guest_old")
    ).toBe(true)
    expect(
      buyerOwnsDesign({ customer_id: "cus_a", guest_key: "guest_old" }, "cus_b", "guest_old")
    ).toBe(false)
  })

  it("does not let logged-out guests see designs already owned by a customer", () => {
    expect(
      buyerOwnsDesign({ customer_id: "cus_a", guest_key: "guest_1" }, null, "guest_1")
    ).toBe(false)
  })

  it("lets guests see only their unowned drafts", () => {
    expect(buyerOwnsDesign({ guest_key: "guest_1" }, null, "guest_1")).toBe(true)
    expect(buyerOwnsDesign({ guest_key: "guest_1" }, null, "guest_2")).toBe(false)
    expect(buyerOwnsDesign({ customer_id: null, guest_key: "guest_1" }, null, "guest_1")).toBe(true)
  })

  it("lets a signed-in buyer claim guest-only drafts from the same browser", () => {
    expect(buyerOwnsDesign({ guest_key: "guest_1" }, "cus_a", "guest_1")).toBe(true)
    expect(
      buyerOwnsDesign({ customer_id: "cus_b", guest_key: "guest_1" }, "cus_a", "guest_1")
    ).toBe(false)
  })
})
