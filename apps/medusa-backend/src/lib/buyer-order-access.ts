import type { MedusaRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { readOrderStoreId } from "./order-store-context"
import { resolveCurrentStore } from "./store-context"

export type BuyerOwnedOrder = {
  id?: string
  display_id?: string | number | null
  customer_id?: string | null
  email?: string | null
  metadata?: Record<string, unknown> | null
  items?: Array<Record<string, unknown>> | null
}

const diagnosticEnabled = () =>
  process.env.NODE_ENV === "development" && process.env.PAY_REFUND_ROUTE_DIAGNOSTICS === "true"

const logDiagnostic = (stage: string, input: Record<string, unknown>) => {
  if (!diagnosticEnabled()) return
  console.info("[buyer-refund-diagnostic]", JSON.stringify({ stage, ...input }))
}

const orderNotFound = () => Object.assign(new Error("Order was not found."), {
  code: "ORDER_NOT_FOUND",
  status: 404,
})

/**
 * Resolves a buyer order with the same customer-first, metadata-store-scoped
 * semantics used by the buyer order list. Do not replace this with an
 * unscoped retrieveOrder call: that loses the query-graph visibility path.
 */
export const resolveAuthenticatedBuyerOrder = async (
  req: MedusaRequest,
  input: { orderId: string; customerId: string; diagnosticId?: string }
): Promise<BuyerOwnedOrder> => {
  logDiagnostic("shared_resolver_entry", {
    correlation_id: input.diagnosticId ?? null,
    request_order_id: input.orderId,
    authenticated_customer_id: input.customerId,
    received_store_id: resolveCurrentStore(req).store_id,
  })
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as {
    graph: (input: Record<string, unknown>) => Promise<{ data?: BuyerOwnedOrder[] }>
  }
  const { data } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "customer_id",
      "email",
      "metadata",
      "items.id",
      "items.quantity",
      "items.subtotal",
      "items.discount_total",
      "items.tax_total",
      "items.total",
    ],
    filters: {
      id: input.orderId,
      customer_id: input.customerId,
    },
    options: { throwIfKeyNotFound: false },
  } as never)

  const order = data?.[0]
  logDiagnostic("shared_resolver_result", {
    correlation_id: input.diagnosticId ?? null,
    request_order_id: input.orderId,
    authenticated_customer_id: input.customerId,
    received_store_id: resolveCurrentStore(req).store_id,
    query_result_count: data?.length ?? 0,
    resolved_order_id: order?.id ?? null,
    resolved_order_customer_id: order?.customer_id ?? null,
    resolved_order_store_id: order ? readOrderStoreId(order) : null,
  })
  if (!order || order.id !== input.orderId) throw orderNotFound()

  const customerMatches = order.customer_id === input.customerId
  logDiagnostic("defensive_customer_assertion", {
    correlation_id: input.diagnosticId ?? null,
    request_order_id: input.orderId,
    authenticated_customer_id: input.customerId,
    resolved_order_id: order.id ?? null,
    resolved_order_customer_id: order.customer_id ?? null,
    matched: customerMatches,
  })
  if (!customerMatches) throw orderNotFound()

  const resolvedStoreId = readOrderStoreId(order)
  const receivedStoreId = resolveCurrentStore(req).store_id
  const storeMatches = resolvedStoreId === receivedStoreId
  logDiagnostic("metadata_store_assertion", {
    correlation_id: input.diagnosticId ?? null,
    request_order_id: input.orderId,
    received_store_id: receivedStoreId,
    resolved_order_id: order.id ?? null,
    resolved_order_store_id: resolvedStoreId,
    matched: storeMatches,
  })
  if (!storeMatches) throw orderNotFound()

  return order
}
