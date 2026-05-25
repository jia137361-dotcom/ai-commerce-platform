import { buildThirdOrderId } from "../lib/s2bdiy/s2bdiy-order"

describe("buildThirdOrderId", () => {
  it("uses order id when no retry", () => {
    expect(buildThirdOrderId("order_123", 0)).toBe("order_123")
  })

  it("appends retry suffix", () => {
    expect(buildThirdOrderId("order_123", 2)).toBe("order_123-retry-2")
  })
})
