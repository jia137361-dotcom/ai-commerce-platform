import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getStoreCoreService, requireText, sendError } from "../../../_helpers/store-core"
import { syncBasicProduct } from "../../../../modules/suppliers/services/supplier-sync-service"
import { resolveCurrentStore } from "../../../../lib/store-context"

type SyncBasicProductBody = {
  basic_product_id: number
  supplier_id: string
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = (req.body ?? {}) as SyncBasicProductBody
  const basicProductId = body.basic_product_id

  if (!basicProductId || !Number.isFinite(Number(basicProductId))) {
    return sendError(res, 400, "VALIDATION_ERROR", "basic_product_id must be a number")
  }

  const supplierId = requireText(body.supplier_id)
  if (!supplierId) {
    return sendError(res, 400, "VALIDATION_ERROR", "supplier_id is required")
  }

  const storeCoreService = getStoreCoreService(req)
  const { store_id: storeId } = resolveCurrentStore(req)

  try {
    const result = await syncBasicProduct(Number(basicProductId), supplierId, {
      storeCoreService,
      storeId,
    })

    return res.status(201).json({
      message: "Supplier product synced successfully",
      ...result,
    })
  } catch (error: any) {
    return sendError(
      res,
      500,
      "VALIDATION_ERROR",
      `Sync failed: ${error.message}`
    )
  }
}
