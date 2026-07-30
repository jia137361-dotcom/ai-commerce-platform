import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { assertBuyerEmailVerified } from "../../../../../../../lib/buyer-auth-access"
import { loadCancellationContext } from "../../../../../../../lib/order-cancellation"
import {
  evaluateRefundRequestEligibility,
  serializeBuyerRefundRequest,
  validateRefundRequestText,
  type BuyerRefundRequestRecord,
} from "../../../../../../../lib/order-refund-request"
import { assertOrderBelongsToCurrentStore } from "../../../../../../../lib/order-store-context"
import { OrderStoreAccessError } from "../../../../../../../lib/order-store-error"
import { resolveCurrentStore } from "../../../../../../../lib/store-context"
import {
  BUYER_REFUND_REQUESTS_MODULE,
} from "../../../../../../../modules/buyer-refund-requests"
import type BuyerRefundRequestsModuleService from "../../../../../../../modules/buyer-refund-requests/service"

type AuthenticatedRequest = MedusaRequest & {
  auth_context?: { actor_id?: string }
}

type RefundRequestService = BuyerRefundRequestsModuleService & {
  listBuyerRefundRequests: (
    filters: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<BuyerRefundRequestRecord[]>
  createBuyerRefundRequests: (
    input: Record<string, unknown>
  ) => Promise<BuyerRefundRequestRecord>
}

const readHeader = (req: MedusaRequest, name: string) => {
  const value = req.headers[name.toLowerCase()]
  return Array.isArray(value) ? value[0] : value
}

const validateAccessHeaders = (req: MedusaRequest) => {
  if (!readHeader(req, "x-publishable-api-key")) {
    return "x-publishable-api-key is required"
  }
  if (!readHeader(req, "x-store-id")) return "X-Store-Id is required"
  return null
}

const readAuthCustomerId = (req: MedusaRequest) =>
  (req as AuthenticatedRequest).auth_context?.actor_id

const loadOwnedOrder = async (req: MedusaRequest) => {
  const authCustomerId = readAuthCustomerId(req)
  if (!authCustomerId) {
    throw Object.assign(new Error("Customer session is required."), {
      code: "ORDER_ACCESS_DENIED",
      status: 401,
    })
  }

  const orderId = req.params.id as string
  const orderModule = req.scope.resolve(Modules.ORDER)
  const order = await orderModule.retrieveOrder(orderId)
  assertOrderBelongsToCurrentStore(req, order)
  if (!order.customer_id || order.customer_id !== authCustomerId) {
    throw Object.assign(new Error("This order does not belong to the current customer."), {
      code: "ORDER_ACCESS_DENIED",
      status: 403,
    })
  }
  return { orderId, order, authCustomerId }
}

const listOrderRequests = async (
  service: RefundRequestService,
  input: { orderId: string; customerId: string; storeId: string }
) =>
  service.listBuyerRefundRequests(
    {
      order_id: input.orderId,
      customer_id: input.customerId,
      store_id: input.storeId,
    },
    { order: { created_at: "DESC" } }
  )

const errorResponse = (res: MedusaResponse, error: unknown) => {
  if (error instanceof OrderStoreAccessError) {
    return res.status(403).json({ error: { code: error.code, message: error.message } })
  }
  const status = (error as { status?: unknown }).status
  const code = (error as { code?: unknown }).code
  if (typeof status === "number" && status >= 400 && status < 500) {
    return res.status(status).json({
      error: {
        code: typeof code === "string" ? code : "REFUND_REQUEST_INVALID",
        message: error instanceof Error ? error.message : "Invalid refund request.",
      },
    })
  }
  const message = error instanceof Error ? error.message : String(error)
  if (/not found|does not exist/i.test(message)) {
    return res.status(404).json({ error: { code: "ORDER_NOT_FOUND", message: "Order was not found." } })
  }
  console.error("buyer refund request failed:", error)
  return res.status(500).json({
    error: {
      code: "ORDER_REFUND_REQUEST_ERROR",
      message: "Failed to process refund request.",
    },
  })
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const headerError = validateAccessHeaders(req)
    if (headerError) {
      return res.status(401).json({
        error: { code: "REFUND_REQUEST_HEADER_REQUIRED", message: headerError },
      })
    }
    const { orderId, authCustomerId } = await loadOwnedOrder(req)
    const storeId = resolveCurrentStore(req).store_id
    const service = req.scope.resolve(BUYER_REFUND_REQUESTS_MODULE) as RefundRequestService
    const requests = await listOrderRequests(service, {
      orderId,
      customerId: authCustomerId,
      storeId,
    })
    return res.status(200).json({
      refund_requests: requests.map(serializeBuyerRefundRequest),
    })
  } catch (error) {
    return errorResponse(res, error)
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const headerError = validateAccessHeaders(req)
    if (headerError) {
      return res.status(401).json({
        error: { code: "REFUND_REQUEST_HEADER_REQUIRED", message: headerError },
      })
    }
    const text = validateRefundRequestText(
      (req.body ?? {}) as { reason?: unknown; note?: unknown }
    )
    const { orderId, order, authCustomerId } = await loadOwnedOrder(req)
    if (!(await assertBuyerEmailVerified(req, res, authCustomerId))) return
    const storeId = resolveCurrentStore(req).store_id
    const service = req.scope.resolve(BUYER_REFUND_REQUESTS_MODULE) as RefundRequestService
    const existingRequests = await listOrderRequests(service, {
      orderId,
      customerId: authCustomerId,
      storeId,
    })
    const context = await loadCancellationContext(req, orderId, order)
    const eligibility = evaluateRefundRequestEligibility(context, {
      authCustomerId,
      requestedStoreId: storeId,
      existingRequests,
    })
    if (!eligibility.allowed) {
      return res.status(409).json({
        error: { code: eligibility.code, message: eligibility.message },
        refund_request: {
          allowed: false,
          code: eligibility.code,
          message: eligibility.message,
          open_request: existingRequests.find((row) =>
            ["pending", "approved", "processing"].includes(row.status ?? "")
          ) ? serializeBuyerRefundRequest(existingRequests.find((row) =>
            ["pending", "approved", "processing"].includes(row.status ?? "")
          )!) : null,
        },
      })
    }

    const displayId = Number(order.display_id)
    const created = await service.createBuyerRefundRequests({
      order_id: orderId,
      display_id: Number.isFinite(displayId) ? displayId : null,
      customer_id: authCustomerId,
      store_id: storeId,
      currency_code: eligibility.currencyCode,
      requested_amount: eligibility.requestedAmount,
      approved_amount: null,
      reason: text.reason,
      note: text.note,
      status: "pending",
      payment_provider_id: null,
      external_payment_id: null,
      external_refund_id: null,
      external_transaction_id: null,
      provider_status: "not_connected",
      provider_payload: null,
      metadata: { scope: "full_order" },
    })

    if (process.env.NODE_ENV !== "production") {
      console.info("[buyer-refund-request] created", {
        refund_request_id: created.id,
        order_id: orderId,
        customer_id: authCustomerId,
        store_id: storeId,
        requested_amount: eligibility.requestedAmount,
        currency_code: eligibility.currencyCode,
        status: created.status,
      })
    }

    return res.status(201).json({
      refund_request: serializeBuyerRefundRequest(created),
    })
  } catch (error) {
    return errorResponse(res, error)
  }
}
