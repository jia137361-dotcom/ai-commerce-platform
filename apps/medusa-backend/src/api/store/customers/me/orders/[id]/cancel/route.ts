import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { cancelOrderWorkflow } from "@medusajs/core-flows"
import { resolveCurrentStore } from "../../../../../../../lib/store-context"
import {
  cancellationResponse,
  evaluateCancellationEligibility,
  hasActivePaymentAuthorization,
  loadCancellationContext,
  summarizeCancellationContext,
  validateCancelReason,
  type CancellationOrder,
} from "../../../../../../../lib/order-cancellation"
import {
  ORDER_META_PAYMENT_STATUS,
  readOrderFulfillmentStatusMeta,
} from "../../../../../../../lib/order-custom-metadata"
import { FULFILLMENT_ORDERS_MODULE } from "../../../../../../../modules/fulfillment-orders"
import type FulfillmentOrdersModuleService from "../../../../../../../modules/fulfillment-orders/service"
import { STORE_CORE_MODULE } from "../../../../../../../modules/store-core"
import type StoreCoreModuleService from "../../../../../../../modules/store-core/service"
import { getS2bdiyConfig, isS2bdiyEnabled } from "../../../../../../../modules/suppliers/s2bdiy/config"
import { S2bdiyClient } from "../../../../../../../modules/suppliers/s2bdiy/s2bdiy-client"
import { deleteS2bOrder } from "../../../../../../../modules/suppliers/s2bdiy/s2bdiy-order"

type AuthenticatedRequest = MedusaRequest & {
  auth_context?: {
    actor_id?: string
  }
}

const readHeader = (req: MedusaRequest, name: string) => {
  const value = req.headers[name.toLowerCase()]
  return Array.isArray(value) ? value[0] : value
}

const validateHeaders = (req: MedusaRequest) => {
  if (!readHeader(req, "x-publishable-api-key")) {
    return "x-publishable-api-key is required"
  }

  if (!readHeader(req, "x-store-id")) {
    return "X-Store-Id is required"
  }

  return null
}

const readAuthCustomerId = (req: MedusaRequest) =>
  (req as AuthenticatedRequest).auth_context?.actor_id

const notFound = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  return /not found|does not exist|could not be found/i.test(message)
}

const statusCodeForEligibility = (code: string) => {
  switch (code) {
    case "ORDER_ACCESS_DENIED":
      return 403
    case "ORDER_WRONG_STORE":
      return 403
    case "ORDER_NOT_FOUND":
      return 404
    default:
      return 409
  }
}

const normalizeOrderResponse = (order: CancellationOrder) => ({
  id: order.id ?? "",
  display_id: order.display_id ?? null,
  status: order.canceled_at || order.cancelled_at ? "cancelled" : order.status ?? null,
  payment_status:
    order.payment_status ??
    order.metadata?.[ORDER_META_PAYMENT_STATUS] ??
    null,
  fulfillment_status:
    order.fulfillment_status ??
    readOrderFulfillmentStatusMeta(order.metadata ?? null) ??
    null,
  cancelled_at: order.canceled_at ?? order.cancelled_at ?? null,
})

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const headerError = validateHeaders(req)
    if (headerError) {
      return res.status(401).json({
        error: { code: "CUSTOMER_ORDER_CANCEL_HEADER_REQUIRED", message: headerError },
      })
    }

    const authCustomerId = readAuthCustomerId(req)
    if (!authCustomerId) {
      return res.status(401).json({
        error: { code: "ORDER_ACCESS_DENIED", message: "Customer session is required." },
      })
    }

    const orderId = req.params.id as string
    const reason = validateCancelReason((req.body as { reason?: unknown } | undefined)?.reason)
    const storeId = resolveCurrentStore(req).store_id

    const context = await loadCancellationContext(req, orderId)
    const eligibility = evaluateCancellationEligibility(context, {
      authCustomerId,
      requestedStoreId: storeId,
    })

    if (process.env.NODE_ENV !== "production") {
      console.info("[order-cancel] eligibility", {
        ...summarizeCancellationContext(context, {
          authCustomerId,
          requestedStoreId: storeId,
        }),
        eligibility_result: cancellationResponse(eligibility),
        reason_present: Boolean(reason),
      })
    }

    if (!eligibility.allowed) {
      if (eligibility.code === "ORDER_ALREADY_CANCELLED") {
        return res.status(200).json({
          order: normalizeOrderResponse(context.order),
          cancelled: true,
          already_cancelled: true,
          cancellation: cancellationResponse(eligibility),
        })
      }

      return res.status(statusCodeForEligibility(eligibility.code)).json({
        error: {
          code: eligibility.code,
          message: eligibility.message,
        },
        cancellation: cancellationResponse(eligibility),
      })
    }

    await cancelOrderWorkflow(req.scope).run({
      input: {
        order_id: orderId,
        canceled_by: authCustomerId,
      },
    })

    const orderModule = req.scope.resolve(Modules.ORDER)
    const cancelledOrder = (await orderModule.retrieveOrder(orderId)) as CancellationOrder
    const cancelledContext = await loadCancellationContext(req, orderId, cancelledOrder)
    if (hasActivePaymentAuthorization(cancelledContext.order)) {
      throw new Error(
        "Cancel workflow completed but payment authorization is still active."
      )
    }

    const afterEligibility = evaluateCancellationEligibility(cancelledContext, {
      authCustomerId,
      requestedStoreId: storeId,
    })

    if (afterEligibility.allowed || afterEligibility.code !== "ORDER_ALREADY_CANCELLED") {
      throw new Error("Cancel workflow completed without a cancelled order state.")
    }

    if (process.env.NODE_ENV !== "production") {
      console.info("[order-cancel] workflow result", {
        ...summarizeCancellationContext(cancelledContext, {
          authCustomerId,
          requestedStoreId: storeId,
        }),
        cancel_workflow_result: "cancelled",
      })
    }

    if (isS2bdiyEnabled()) {
      try {
        const storeCore = req.scope.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
        const supplierOrders = await storeCore.listSupplierOrders({ order_id: [orderId] })
        const supplierOrder = supplierOrders.find(
          (r) => r.supplier_order_id && r.supplier_pay_status !== "paid"
        )
        if (supplierOrder?.supplier_order_id) {
          const config = getS2bdiyConfig()
          if (config) {
            const client = new S2bdiyClient(config)
            await deleteS2bOrder(client, supplierOrder.supplier_order_id)
            console.info("[order-cancel] S2BDIY order cancelled:", supplierOrder.supplier_order_id)
          }
        }
      } catch (error) {
        console.error("[order-cancel] S2BDIY cancel failed (non-blocking):", error)
      }
    }

    return res.status(200).json({
      order: normalizeOrderResponse(cancelledContext.order),
      cancelled: true,
      cancellation: cancellationResponse(afterEligibility),
    })
  } catch (error: unknown) {
    if (notFound(error)) {
      return res.status(404).json({
        error: { code: "ORDER_NOT_FOUND", message: "Order was not found." },
      })
    }

    const code = (error as { code?: unknown }).code
    const status = (error as { status?: unknown }).status
    if (typeof status === "number" && status >= 400 && status < 500) {
      return res.status(status).json({
        error: {
          code: typeof code === "string" ? code : "ORDER_CANCEL_INVALID_REQUEST",
          message: error instanceof Error ? error.message : "Invalid cancel request.",
        },
      })
    }

    console.error("buyer order cancel failed:", error)
    return res.status(500).json({
      error: {
        code: "ORDER_CANCEL_WORKFLOW_ERROR",
        message: "Failed to cancel order.",
      },
    })
  }
}
