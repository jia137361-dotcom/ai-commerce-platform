import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { STORE_CORE_MODULE } from "../../modules/store-core"
import type StoreCoreModuleService from "../../modules/store-core/service"
import { sendError } from "../../api/_helpers/store-core"

export async function assertStoreActiveForRequest(
  req: MedusaRequest,
  res: MedusaResponse,
  storeId: string
): Promise<boolean> {
  const storeCore = req.scope.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const stores = await storeCore.listStores({ id: storeId })
  const store = stores[0]
  if (!store) {
    sendError(res, 404, "VALIDATION_ERROR", "Store not found")
    return false
  }
  if (store.status === "suspended") {
    sendError(res, 403, "FORBIDDEN", "This store is suspended by platform operations")
    return false
  }
  if (store.status === "archived") {
    sendError(res, 403, "FORBIDDEN", "This store is archived")
    return false
  }
  return true
}
