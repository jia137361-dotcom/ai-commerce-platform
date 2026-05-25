import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getStoreCoreService, sendError } from "../../../../_helpers/store-core"
import { syncBasicProductFromS2bdiy } from "../../../../../lib/s2bdiy/sync-basic-product"
import { getS2bdiyConfig } from "../../../../../lib/s2bdiy"

type Body = {
  basic_product_id?: string | number
  platform_product_id?: string
  supplier_product_row_id?: string
}

export const POST = async (req: MedusaRequest<Body>, res: MedusaResponse) => {
  if (!getS2bdiyConfig()) {
    return sendError(res, 400, "VALIDATION_ERROR", "S2BDIY is not configured in environment")
  }

  const body = req.body ?? {}
  const basicProductId =
    body.basic_product_id ?? process.env.S2BDIY_TEST_BASIC_PRODUCT_ID
  const platformProductId = body.platform_product_id ?? "pp_tshirt"

  if (!basicProductId) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "basic_product_id is required (body or S2BDIY_TEST_BASIC_PRODUCT_ID)"
    )
  }

  try {
    const storeCore = getStoreCoreService(req)
    const result = await syncBasicProductFromS2bdiy(storeCore, {
      basicProductId,
      platformProductId,
      supplierProductRowId: body.supplier_product_row_id,
    })
    return res.status(200).json({
      basic_product_id: String(basicProductId),
      platform_product_id: platformProductId,
      ...result,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "sync failed"
    return sendError(res, 502, "PAYMENT_FAILED", message)
  }
}
