import {
  isTerminalSupplierOrderStatus,
  mapS2bOrderStatus,
  mapS2bPayStatus,
} from "../modules/suppliers/s2bdiy/s2bdiy-status-mapper"

describe("s2bdiy-status-mapper", () => {
  it("maps order status codes", () => {
    expect(mapS2bOrderStatus(2)).toBe("payment_pending")
    expect(mapS2bOrderStatus(5)).toBe("in_production")
    expect(mapS2bOrderStatus(6)).toBe("shipped")
    expect(mapS2bOrderStatus(7)).toBe("cancelled")
  })

  it("maps pay status codes", () => {
    expect(mapS2bPayStatus(3)).toBe("paid")
    expect(mapS2bPayStatus(4)).toBe("pay_failed")
  })

  it("detects terminal statuses", () => {
    expect(isTerminalSupplierOrderStatus("shipped")).toBe(true)
    expect(isTerminalSupplierOrderStatus("in_production")).toBe(false)
  })
})
