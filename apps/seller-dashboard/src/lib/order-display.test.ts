import { describe, expect, it } from "vitest"
import { formatOrderMoney } from "./order-display"

describe("seller order money display", () => {
  it("formats backend Medusa amounts as canonical major units", () => {
    expect(formatOrderMoney(21.68, "usd")).toBe("$21.68")
  })
})
