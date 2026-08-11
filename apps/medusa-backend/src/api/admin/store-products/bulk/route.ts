import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../../lib/store-context"
import {
  bulkStoreProductAction,
  parseBulkStoreProductAction,
  parseBulkStoreProductIds,
} from "../../../../lib/store-product-bulk"
import { getStoreCoreService, sendError } from "../../../_helpers/store-core"

/** POST /admin/store-products/bulk — archive or permanently delete multiple products */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { store_id: storeId } = resolveCurrentStore(req)
  const body = (req.body ?? {}) as Record<string, unknown>

  let productIds: string[]
  let action: ReturnType<typeof parseBulkStoreProductAction>
  try {
    productIds = parseBulkStoreProductIds(body.product_ids)
    action = parseBulkStoreProductAction(body.action)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Invalid bulk request"
    return sendError(res, 400, "VALIDATION_ERROR", message)
  }

  const storeCoreService = getStoreCoreService(req)
  const result = await bulkStoreProductAction(storeCoreService, storeId, productIds, action)

  return res.json({
    store_id: storeId,
    ...result,
  })
}
