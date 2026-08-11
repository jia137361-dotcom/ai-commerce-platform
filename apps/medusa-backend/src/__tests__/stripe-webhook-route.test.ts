import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

const mockConstructEvent = jest.fn()
const mockGetWebhookActionAndData = jest.fn()

jest.mock("stripe", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: (...args: unknown[]) => mockConstructEvent(...args),
    },
  })),
}))

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

const createReq = () => ({
  rawBody: Buffer.from(JSON.stringify({ id: "evt_bad", type: "payment_intent.succeeded" })),
  headers: { "stripe-signature": "bad_signature" },
  scope: {
    resolve: jest.fn((key: string) => {
      if (key === Modules.PAYMENT) {
        return { getWebhookActionAndData: mockGetWebhookActionAndData }
      }
      throw new Error(`Unexpected dependency: ${key}`)
    }),
  },
} as unknown as MedusaRequest)

describe("Stripe webhook route", () => {
  const originalWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const originalStripeApiKey = process.env.STRIPE_API_KEY

  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret"
    process.env.STRIPE_API_KEY = "sk_test_secret"
  })

  afterAll(() => {
    process.env.STRIPE_WEBHOOK_SECRET = originalWebhookSecret
    process.env.STRIPE_API_KEY = originalStripeApiKey
  })

  it("rejects an invalid signature before handing the payload to Medusa payment processing", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("No signatures found matching the expected signature for payload")
    })

    const { POST } = await import("../api/webhooks/stripe/route.js")
    const res = createRes()

    await POST(createReq(), res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.body).toEqual({
      error: expect.stringContaining("Webhook signature verification failed"),
    })
    expect(mockGetWebhookActionAndData).not.toHaveBeenCalled()
  })
})
