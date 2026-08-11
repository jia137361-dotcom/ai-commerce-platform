import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { listOrdersByPlatformCheckoutId } from "../../../../../../lib/marketplace/platform-checkout"
import { readOrderStoreId } from "../../../../../../lib/order-store-context"
import { STORE_CORE_MODULE } from "../../../../../../modules/store-core"
import type StoreCoreModuleService from "../../../../../../modules/store-core/service"
import { sendError } from "../../../../../_helpers/store-core"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const platformCheckoutId = String(req.params.id ?? "").trim()
  if (!platformCheckoutId) {
    return sendError(res, 400, "VALIDATION_ERROR", "Platform checkout id is required")
  }

  const orders = await listOrdersByPlatformCheckoutId(req.scope, platformCheckoutId)
  if (!orders.length) {
    return sendError(res, 404, "VALIDATION_ERROR", "No orders found for this platform checkout")
  }

  const storeCore = req.scope.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const storeIds = [...new Set(orders.map((order) => readOrderStoreId(order as { metadata?: Record<string, unknown> })))]
  const stores = await storeCore.listStores({ id: storeIds })
  const storeNameById = new Map(stores.map((store: { id: string; name?: string | null }) => [store.id, store.name]))

  return res.status(200).json({
    platform_checkout_id: platformCheckoutId,
    order_count: orders.length,
    orders: orders.map((order) => {
      const storeId = readOrderStoreId(order as { metadata?: Record<string, unknown> })
      return {
        order_id: String(order.id ?? ""),
        display_id: order.display_id ?? null,
        store_id: storeId,
        store_name: storeNameById.get(storeId) ?? storeId,
        total: order.total ?? null,
        currency_code: order.currency_code ?? null,
        created_at: order.created_at ?? null,
        status: order.status ?? null,
      }
    }),
  })
}
