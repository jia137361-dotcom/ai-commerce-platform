import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

const mockProcessMonthlyBuyerWithdrawals = jest.fn()

jest.mock("../lib/buyer-wallet", () => ({
  processMonthlyBuyerWithdrawals: (...args: unknown[]) => mockProcessMonthlyBuyerWithdrawals(...args),
}))

jest.mock("../lib/store-context", () => ({
  resolveCurrentStore: () => ({ store_id: "store_1" }),
}))

import { POST } from "../api/admin/wallet/withdrawals/settle/route"

type MockResponse = MedusaResponse & {
  statusCode?: number
  body?: unknown
  status: jest.Mock
  json: jest.Mock
}

const createResponse = (): MockResponse => {
  const response: Partial<MockResponse> = {}
  response.status = jest.fn((code: number) => {
    response.statusCode = code
    return response
  }) as unknown as MockResponse["status"]
  response.json = jest.fn((body: unknown) => {
    response.body = body
    return response
  }) as unknown as MockResponse["json"]
  return response as MockResponse
}

const createRequest = () => ({ scope: {} }) as unknown as MedusaRequest

describe("development wallet settlement route", () => {
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    process.env.NODE_ENV = "development"
    mockProcessMonthlyBuyerWithdrawals.mockReset()
    mockProcessMonthlyBuyerWithdrawals.mockResolvedValue({
      processed: 1,
      skipped: null,
      withdrawals: [{ id: "bww_1", status: "paid" }],
    })
  })

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv
  })

  it("forces the current store settlement in development", async () => {
    const response = createResponse()

    await POST(createRequest(), response)

    expect(mockProcessMonthlyBuyerWithdrawals).toHaveBeenCalledWith(
      expect.anything(),
      { force: true, storeId: "store_1" }
    )
    expect(response.body).toEqual(expect.objectContaining({
      forced: true,
      processed: 1,
    }))
  })

  it("does not expose forced settlement in production", async () => {
    process.env.NODE_ENV = "production"
    const response = createResponse()

    await POST(createRequest(), response)

    expect(response.statusCode).toBe(403)
    expect(mockProcessMonthlyBuyerWithdrawals).not.toHaveBeenCalled()
  })
})
