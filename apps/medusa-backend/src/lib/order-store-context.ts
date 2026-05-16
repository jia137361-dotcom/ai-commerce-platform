import type { MedusaRequest } from "@medusajs/framework/http"
import { DEFAULT_STORE_ID, resolveCurrentStore } from "./store-context"
import { OrderStoreAccessError } from "./order-store-error"

export type OrderStoreMeta = {
  metadata?: Record<string, unknown> | null
}

export function readOrderStoreId(order: OrderStoreMeta): string {
  const raw = order.metadata?.store_id
  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw.trim()
  }
  return DEFAULT_STORE_ID
}

export function assertOrderBelongsToCurrentStore(req: MedusaRequest, order: OrderStoreMeta): void {
  const current = resolveCurrentStore(req).store_id
  if (readOrderStoreId(order) !== current) {
    throw new OrderStoreAccessError()
  }
}
