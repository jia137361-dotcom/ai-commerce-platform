import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, PaymentActions } from "@medusajs/framework/utils"

const mockProcessPaymentRun = jest.fn()
const mockTryRegisterWebhookDedupe = jest.fn()
const mockReleaseWebhookDedupe = jest.fn()

jest.mock("@medusajs/core-flows", () => ({
  processPaymentWorkflow: jest.fn(() => ({ run: mockProcessPaymentRun })),
}))

jest.mock("../lib/webhook-dedupe", () => ({
  tryRegisterWebhookDedupe: (...args: unknown[]) => mockTryRegisterWebhookDedupe(...args),
  releaseWebhookDedupe: (...args: unknown[]) => mockReleaseWebhookDedupe(...args),
}))

import { BUYER_REFUND_REQUESTS_MODULE } from "../modules/buyer-refund-requests"
import { POST as receivePaymentWebhook } from "../api/hooks/payment/[provider]/route"

type MockRes = MedusaResponse & {
  statusCode?: number
  body?: unknown
  status: jest.Mock
  json: jest.Mock
}

const createRes = (): MockRes => {
  const res: Partial<MockRes> = {}
  res.status = jest.fn((code: number) => {
    res.statusCode = code
    return res
  }) as unknown as MockRes["status"]
  res.json = jest.fn((body: unknown) => {
    res.body = body
    return res
  }) as unknown as MockRes["json"]
  return res as MockRes
}

const createReq = (input?: {
  webhook?: { action: string; data?: { session_id?: string; amount?: number } }
  body?: Record<string, unknown>
  refundRequests?: Array<Record<string, unknown>>
}) => {
  const paymentModule = {
    getWebhookActionAndData: jest.fn(async () => input?.webhook ?? ({
      action: PaymentActions.SUCCESSFUL,
      data: { session_id: "payses_1", amount: 20 },
    })),
  }
  const refundService = {
    listBuyerRefundRequests: jest.fn(async () => input?.refundRequests ?? []),
    updateBuyerRefundRequests: jest.fn(async (value: unknown) => value),
  }
  const body = input?.body ?? { id: "WH_1", event_type: "PAYMENT.CAPTURE.COMPLETED" }
  const req = {
    params: { provider: "pp_paypal_paypal" },
    body,
    rawBody: Buffer.from(JSON.stringify(body)),
    headers: { "paypal-transmission-id": "transmission_1" },
    scope: {
      resolve: jest.fn((key: string) => {
        if (key === Modules.PAYMENT) return paymentModule
        if (key === BUYER_REFUND_REQUESTS_MODULE) return refundService
        throw new Error(`Unexpected dependency: ${key}`)
      }),
    },
  } as unknown as MedusaRequest
  return { req, paymentModule, refundService }
}

describe("canonical PayPal payment webhook", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockTryRegisterWebhookDedupe.mockResolvedValue(true)
    mockReleaseWebhookDedupe.mockResolvedValue(undefined)
    mockProcessPaymentRun.mockResolvedValue({})
  })

  it("rejects an invalid signature before reserving a dedupe key", async () => {
    const { req, paymentModule } = createReq()
    paymentModule.getWebhookActionAndData.mockRejectedValue(new Error("Invalid PayPal webhook signature"))
    const res = createRes()

    await receivePaymentWebhook(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(mockTryRegisterWebhookDedupe).not.toHaveBeenCalled()
    expect(mockProcessPaymentRun).not.toHaveBeenCalled()
  })

  it("acknowledges a replay without processing payment twice", async () => {
    mockTryRegisterWebhookDedupe.mockResolvedValue(false)
    const { req } = createReq()
    const res = createRes()

    await receivePaymentWebhook(req, res)

    expect(res.body).toEqual({ received: true, duplicate: true })
    expect(mockProcessPaymentRun).not.toHaveBeenCalled()
  })

  it("passes a verified capture to the Medusa payment workflow once", async () => {
    const { req } = createReq()
    const res = createRes()

    await receivePaymentWebhook(req, res)

    expect(mockProcessPaymentRun).toHaveBeenCalledWith({
      input: { action: PaymentActions.SUCCESSFUL, data: { session_id: "payses_1", amount: 20 } },
    })
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it("releases the dedupe reservation when Medusa processing fails", async () => {
    mockProcessPaymentRun.mockRejectedValue(new Error("temporary workflow failure"))
    const { req } = createReq()
    const res = createRes()

    await receivePaymentWebhook(req, res)

    expect(mockReleaseWebhookDedupe).toHaveBeenCalledWith(expect.anything(), "paypal:WH_1")
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it("reconciles a completed partial refund without running payment capture", async () => {
    const { req, refundService } = createReq({
      body: {
        id: "WH_REFUND_1",
        event_type: "PAYMENT.CAPTURE.REFUNDED",
        resource: { id: "PAYPAL_REFUND_1" },
      },
      refundRequests: [{
        id: "brr_1",
        approved_amount: 5,
        eligible_amount: 20,
        requested_amount: 5,
      }],
    })
    const res = createRes()

    await receivePaymentWebhook(req, res)

    expect(refundService.updateBuyerRefundRequests).toHaveBeenCalledWith(expect.objectContaining({
      id: "brr_1",
      status: "partially_refunded",
    }))
    expect(mockProcessPaymentRun).not.toHaveBeenCalled()
  })
})
