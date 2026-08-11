import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../../lib/store-context"
import { previewS2bImport } from "../../../../lib/s2b-product-import/service"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { store_id: storeId } = resolveCurrentStore(req)
  const body = (req.body ?? {}) as { csv?: string }
  if (!body.csv?.trim()) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "csv is required" },
    })
  }
  const preview = await previewS2bImport({ container: req.scope, storeId, csv: body.csv })
  return res.status(200).json(preview)
}
