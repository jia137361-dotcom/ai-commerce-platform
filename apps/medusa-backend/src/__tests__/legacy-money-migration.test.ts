import {
  classifyLegacyCart,
  classifyLegacyCartTransaction,
  classifyLegacyPaymentCollection,
  classifyLegacyPaymentSession,
  parseLegacyMoneyMigrationMode,
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

  test.each([undefined, "", "future_provider_state"])("protects unknown provider session state %s", (status) => {
    expect(classifyLegacyPaymentSession({ status })).toBe("protect")
  })

  test.each(["processing", "requires_capture", "requires_more", "pending_authorization"])(
    "protects provider session state %s",
    (status) => {
      expect(classifyLegacyPaymentSession({ status })).toBe("protect")
    }
  )

  test("protects collections with any financial activity", () => {
    expect(classifyLegacyPaymentCollection({ status: "pending" })).toBe("convert")
    expect(classifyLegacyPaymentCollection({ status: "not_paid" })).toBe("convert")
    expect(classifyLegacyPaymentCollection({ status: "future_state" })).toBe("protect")
    expect(classifyLegacyPaymentCollection({ status: "completed" })).toBe("protect")
    expect(classifyLegacyPaymentCollection({ status: "pending", authorized_amount: 1 })).toBe("protect")
    expect(classifyLegacyPaymentCollection({ status: "pending", captured_amount: 1 })).toBe("protect")
    expect(classifyLegacyPaymentCollection({ status: "pending", refunded_amount: 1 })).toBe("protect")
  })

  test("protects the whole cart transaction when any financial record exists", () => {
    expect(classifyLegacyCartTransaction({ cart: { completed_at: null } })).toBe("convert")
    expect(classifyLegacyCartTransaction({ cart: { completed_at: new Date() } })).toBe("protect")
    expect(classifyLegacyCartTransaction({ cart: { completed_at: null }, orderCount: 1 })).toBe("protect")
    expect(classifyLegacyCartTransaction({ cart: { completed_at: null }, paymentCount: 1 })).toBe("protect")
    expect(classifyLegacyCartTransaction({ cart: { completed_at: null }, captureCount: 1 })).toBe("protect")
    expect(classifyLegacyCartTransaction({ cart: { completed_at: null }, refundCount: 1 })).toBe("protect")
    expect(classifyLegacyCartTransaction({
      cart: { completed_at: null },
      attempts: [{ status: "requires_action" }],
    })).toBe("protect")
    expect(classifyLegacyCartTransaction({
      cart: { completed_at: null },
      attempts: [{ status: "created", completed_order_id: "order_1" }],
    })).toBe("protect")
    expect(classifyLegacyCartTransaction({
      cart: { completed_at: null },
      attempts: [{ status: "payment_failed", completed_order_id: null }],
    })).toBe("convert")
    expect(classifyLegacyCartTransaction({
      cart: { completed_at: null },
      collections: [{ status: "pending" }],
      sessions: [{ status: "pending" }, { status: "authorized" }],
    })).toBe("protect")
  })

  test("defaults to dry-run and requires an explicit apply flag", () => {
    expect(parseLegacyMoneyMigrationMode([])).toBe("dry-run")
    expect(parseLegacyMoneyMigrationMode(["--apply"])).toBe("apply")
    expect(parseLegacyMoneyMigrationMode(["apply"])).toBe("apply")
    expect(() => parseLegacyMoneyMigrationMode(["--force"])).toThrow("Unknown migration argument")
  })
})
