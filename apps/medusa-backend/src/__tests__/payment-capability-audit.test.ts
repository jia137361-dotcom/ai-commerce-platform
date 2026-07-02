import { readFileSync } from "node:fs"
import {
  assertPaymentCapabilityAuditEnabled,
  formatPaymentCapabilityAudit,
  summarizePaymentCapabilityAudit,
  type AuditOrder,
} from "../scripts/payment-capability-audit"

const authorizedOrder: AuditOrder = {
  id: "order_authorized",
  display_id: 75,
  payment_collections: [{
    status: "authorized",
    currency_code: "usd",
    authorized_amount: 2125,
    captured_amount: 0,
    completed_at: null,
    payments: [{
      id: "pay_authorized",
      status: "authorized",
      amount: 2125,
      captured_at: null,
      canceled_at: null,
    }],
    payment_sessions: [{ status: "authorized", provider_id: "pp_system_default" }],
  }],
}

const capturedOrder: AuditOrder = {
  id: "order_captured",
  display_id: 76,
  payment_collections: [{
    status: "completed",
    currency_code: "usd",
    captured_amount: 2250,
    completed_at: "2026-06-19T00:00:00.000Z",
    payments: [{
      id: "pay_captured",
      status: "captured",
      amount: 2250,
      currency_code: "usd",
      captured_at: "2026-06-19T00:00:00.000Z",
    }],
  }],
}

describe("payment capability audit", () => {
  it("requires the explicit audit enable flag", () => {
    expect(() => assertPaymentCapabilityAuditEnabled({})).toThrow(
      "PAYMENT_CAPABILITY_AUDIT_ENABLED"
    )
    expect(() =>
      assertPaymentCapabilityAuditEnabled({
        PAYMENT_CAPABILITY_AUDIT_ENABLED: "true",
      })
    ).not.toThrow()
  })

  it("counts authorized-not-captured orders", () => {
    const summary = summarizePaymentCapabilityAudit([authorizedOrder], [])
    expect(summary.authorizedNotCapturedOrders).toBe(1)
    expect(summary.capturedOrders).toBe(0)
    expect(summary.authorizedSamples[0]).toMatchObject({
      orderId: "order_authorized",
      authorizedAmount: 2125,
    })
  })

  it("counts captured evidence and samples", () => {
    const summary = summarizePaymentCapabilityAudit([capturedOrder], [])
    expect(summary.capturedOrders).toBe(1)
    expect(summary.completedPaymentCollections).toBe(1)
    expect(summary.paymentsWithCapturedAt).toBe(1)
    expect(summary.capturedSamples[0]).toMatchObject({
      orderId: "order_captured",
      capturedAmount: 2250,
      currencyCode: "usd",
    })
  })

  it("detects an open refund request on authorized-only payment evidence", () => {
    const summary = summarizePaymentCapabilityAudit([authorizedOrder], [{
      id: "brr_bad",
      order_id: "order_authorized",
      status: "pending",
    }])
    expect(summary.authorizedRefundRequestViolations).toEqual(["brr_bad"])
  })

  it("prints captured runtime unavailable when no captured order exists", () => {
    const summary = summarizePaymentCapabilityAudit([authorizedOrder], [])
    const lines = formatPaymentCapabilityAudit({
      providerIds: ["pp_system_default"],
      defaultProviderId: "pp_system_default",
      paymentModuleAuthorizeApiPresent: true,
      paymentModuleCaptureApiPresent: true,
      paymentModuleRefundApiPresent: true,
      summary,
    })
    expect(lines).toContain("CAPTURED_RUNTIME_AVAILABLE=false")
    expect(lines).toContain("CAPTURE_RUNTIME_SUPPORTED=false")
    expect(lines).toContain("REFUND_REQUEST_SAFETY_CHECK=PASS")
  })

  it("contains no capture or refund workflow invocation", () => {
    const source = readFileSync(
      require.resolve("../scripts/payment-capability-audit"),
      "utf8"
    )
    expect(source).not.toContain("capturePaymentWorkflow")
    expect(source).not.toContain("refundPaymentWorkflow")
    expect(source).not.toContain("createRefundWorkflow")
  })
})
