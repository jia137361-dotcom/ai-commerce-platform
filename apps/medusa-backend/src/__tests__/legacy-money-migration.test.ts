import {
  classifyLegacyCart,
  classifyLegacyPaymentCollection,
  classifyLegacyPaymentSession,
} from "../lib/legacy-money-migration"

describe("legacy minor-unit migration protection", () => {
  test("converts only incomplete carts", () => {
    expect(classifyLegacyCart({ completed_at: null, deleted_at: null })).toBe("convert")
    expect(classifyLegacyCart({ completed_at: new Date(), deleted_at: null })).toBe("protect")
    expect(classifyLegacyCart({ completed_at: null, deleted_at: new Date() })).toBe("protect")
  })

  test.each(["authorized", "captured", "pending_authorization", "requires_more"])(
    "protects %s provider sessions",
    (status) => {
      expect(classifyLegacyPaymentSession({ status })).toBe("protect")
    }
  )

  test.each(["pending", "error", "canceled"])("converts unpaid %s sessions", (status) => {
    expect(classifyLegacyPaymentSession({ status })).toBe("convert")
  })

  test("protects collections with any financial activity", () => {
    expect(classifyLegacyPaymentCollection({ status: "pending" })).toBe("convert")
    expect(classifyLegacyPaymentCollection({ status: "completed" })).toBe("protect")
    expect(classifyLegacyPaymentCollection({ status: "pending", authorized_amount: 1 })).toBe("protect")
    expect(classifyLegacyPaymentCollection({ status: "pending", captured_amount: 1 })).toBe("protect")
    expect(classifyLegacyPaymentCollection({ status: "pending", refunded_amount: 1 })).toBe("protect")
  })
})
