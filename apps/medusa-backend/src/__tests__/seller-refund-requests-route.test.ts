import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

const mockResolveSellerSession = jest.fn()
const mockExecuteApprovedRefund = jest.fn()

jest.mock("../lib/platform-admin/require-platform-operator", () => ({
  resolveAdminUserId: () => "user_1",
}))
jest.mock("../lib/seller-register", () => ({
  resolveSellerSession: (...args: unknown[]) => mockResolveSellerSession(...args),
}))
jest.mock("../lib/order-cancellation", () => ({
  loadCancellationContext: async (_req: unknown, _id: string, order: unknown) => ({
    order,
    paymentStateResolved: true,
    fulfillmentStateResolved: true,
    customFulfillmentOrders: [{ status: "in_production" }],
  }),
}))
jest.mock("../lib/refund-execution", () => ({
  executeApprovedRefund: (...args: unknown[]) => mockExecuteApprovedRefund(...args),
}))

import { BUYER_REFUND_REQUESTS_MODULE } from "../modules/buyer-refund-requests"
import { GET as listRefundRequests } from "../api/seller/refund-requests/route"
import { POST as decideRefundRequest } from "../api/seller/refund-requests/[id]/decision/route"

const requestRecord = {
  id: "brr_1",
  order_id: "order_1",
  store_id: "store_1",
  customer_id: "cus_1",
  status: "manual_review",
  requested_amount: 20,
  eligible_amount: 20,
  reason: "damaged",
  requested_items: [{ item_id: "line_1", quantity: 1 }],
}

const createRes = () => {
  const res: Partial<MedusaResponse & { statusCode: number; body: unknown }> = {}
  res.status = jest.fn((code: number) => { res.statusCode = code; return res as MedusaResponse }) as never
  res.json = jest.fn((body: unknown) => { res.body = body; return res as MedusaResponse }) as never
  return res as MedusaResponse & { statusCode?: number; body?: unknown }
}

const createReq = (requests = [requestRecord]) => {
  const refundService = {
    listBuyerRefundRequests: jest.fn(async () => requests),
    updateBuyerRefundRequests: jest.fn(async (input: Record<string, unknown>) => ({ ...requestRecord, ...input })),
  }
  const orderModule = {
    listOrders: jest.fn(async () => [{
      id: "order_1",
      fulfillment_status: "not_fulfilled",
      items: [{ id: "line_1", title: "T-shirt", quantity: 1 }],
    }]),
    retrieveOrder: jest.fn(async () => ({
      id: "order_1",
      metadata: { store_id: "store_1" },
      payment_collections: [],
      fulfillments: [],
    })),
  }
  const req = {
    params: { id: "brr_1" },
    query: {},
    body: {},
    scope: {
      resolve: jest.fn((key: string) => {
        if (key === BUYER_REFUND_REQUESTS_MODULE) return refundService
        if (key === Modules.ORDER) return orderModule
        throw new Error(`Unexpected dependency: ${key}`)
      }),
    },
  } as unknown as MedusaRequest
  return { req, refundService, orderModule }
}

describe("seller refund request routes", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockResolveSellerSession.mockResolvedValue({ store_id: "store_1" })
    mockExecuteApprovedRefund.mockResolvedValue({ ...requestRecord, status: "partially_refunded" })
  })

  it("scopes the list to the authenticated seller store and returns item evidence", async () => {
    const { req, refundService } = createReq()
    const res = createRes()

    await listRefundRequests(req, res)

    expect(refundService.listBuyerRefundRequests).toHaveBeenCalledWith(
      { store_id: ["store_1"] },
      expect.anything()
    )
    expect(res.body).toMatchObject({
      store_id: "store_1",
      refund_requests: [{ items: [{ item_id: "line_1", title: "T-shirt", quantity: 1 }] }],
    })
  })

  it("returns not found instead of approving another store's request", async () => {
    const { req, refundService } = createReq([])
    req.body = { action: "approve" } as never
    const res = createRes()

    await decideRefundRequest(req, res)

    expect(refundService.listBuyerRefundRequests).toHaveBeenCalledWith(
      { id: ["brr_1"], store_id: ["store_1"] },
      { take: 1 }
    )
    expect(res.statusCode).toBe(404)
    expect(mockExecuteApprovedRefund).not.toHaveBeenCalled()
  })

  it("rejects an approved amount above the eligible balance", async () => {
    const { req } = createReq()
    req.body = { action: "approve", amount: 21 } as never
    const res = createRes()

    await decideRefundRequest(req, res)

    expect(res.statusCode).toBe(400)
    expect(mockExecuteApprovedRefund).not.toHaveBeenCalled()
  })

  it("returns an existing pending result without executing a second provider refund", async () => {
    const { req } = createReq([{ ...requestRecord, status: "refund_pending" }])
    req.body = { action: "approve" } as never
    const res = createRes()

    await decideRefundRequest(req, res)

    expect(res.statusCode).toBe(200)
    expect(mockExecuteApprovedRefund).not.toHaveBeenCalled()
  })
})
