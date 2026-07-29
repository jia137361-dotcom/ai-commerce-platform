import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../../lib/store-context"
import { importS2bDrafts } from "../../../../lib/s2b-product-import/service"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { store_id: storeId } = resolveCurrentStore(req)
  const body = (req.body ?? {}) as { csv?: string }
  if (!body.csv?.trim()) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "csv is required" },
    })
  }
  try {
    const result = await importS2bDrafts({ container: req.scope, storeId, csv: body.csv })
    return res.status(200).json(result)
  } catch (error) {
    return res.status(400).json({
      error: {
        code: "S2B_IMPORT_FAILED",
        message: error instanceof Error ? error.message : "Unable to import CSV",
      },
    })
  }
}
