import type { CancellationContext, CancellationOrder } from "./order-cancellation"
import { readOrderFulfillmentStatusMeta } from "./order-custom-metadata"

export type ProductionStatus =
  | "not_submitted"
  | "submitted"
  | "accepted"
  | "in_production"
  | "production_complete"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "unknown"

export type RefundPolicyDecision = "auto_approve" | "manual_review" | "return" | "claim"

const normalize = (value: unknown) => typeof value === "string" ? value.trim().toLowerCase() : ""

export const resolveProductionStatus = (context: CancellationContext): ProductionStatus => {
  const order = context.order as CancellationOrder & { production_status?: string | null }
  const custom = normalize(context.customFulfillmentOrders[0]?.status)
  const nativeFulfillment = normalize(
    order.fulfillments?.find((entry) => entry?.id)?.status ??
    order.fulfillment_status ??
    readOrderFulfillmentStatusMeta(order.metadata ?? null)
  )
  const unverifiedMetadata = normalize(order.production_status ?? order.metadata?.production_status)
  const value = custom || nativeFulfillment
  if (["none", "not_submitted", "not_fulfilled", "unfulfilled", "waiting", "pending_capture"].includes(value)) return "not_submitted"
  if (["pushed", "submitted", "sent", "queued"].includes(value)) return "submitted"
  if (["accepted", "reviewing", "confirmed"].includes(value)) return "accepted"
  if (["in_production", "production", "making"].includes(value)) return "in_production"
  if (["production_complete", "completed", "fulfilled"].includes(value)) return "production_complete"
  if (["shipped", "partially_shipped"].includes(value)) return "shipped"
  if (["delivered", "partially_delivered"].includes(value)) return "delivered"
  if (["cancelled", "canceled"].includes(value)) return "cancelled"
  if (!value && unverifiedMetadata) return "unknown"
  if (!value && context.fulfillmentStateResolved && context.customFulfillmentOrders.length === 0) return "not_submitted"
  return "unknown"
}

export const evaluateRefundPolicy = (input: {
  context: CancellationContext
  paymentCaptured: boolean
  supplierCancellationConfirmed?: boolean
  reason?: string | null
}): { decision: RefundPolicyDecision; productionStatus: ProductionStatus; policyResult: string } => {
  const productionStatus = resolveProductionStatus(input.context)
  if (!input.paymentCaptured) return { decision: "manual_review", productionStatus, policyResult: "payment_not_captured" }
  if (productionStatus === "not_submitted" || productionStatus === "cancelled") {
    return { decision: "auto_approve", productionStatus, policyResult: "production_not_started" }
  }
  if (productionStatus === "submitted" && input.supplierCancellationConfirmed === true) {
    return { decision: "auto_approve", productionStatus, policyResult: "supplier_cancellation_confirmed" }
  }
  if (productionStatus === "shipped") return { decision: "return", productionStatus, policyResult: "shipment_started" }
  if (productionStatus === "delivered") {
    const reason = normalize(input.reason)
    return { decision: reason.includes("damaged") || reason.includes("wrong") || reason.includes("defect") ? "claim" : "return", productionStatus, policyResult: "delivery_completed" }
  }
  return { decision: "manual_review", productionStatus, policyResult: productionStatus === "unknown" ? "production_status_unknown" : "production_in_progress" }
}
