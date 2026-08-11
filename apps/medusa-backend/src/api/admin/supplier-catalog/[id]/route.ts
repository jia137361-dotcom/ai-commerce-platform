/**
 * Generic Supplier Product Detail API
 *
 * GET /admin/supplier-catalog/:id?supplier_id=sup_s2bdiy
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { sendError } from "../../../_helpers/store-core"
import { requireSupplierAdapter } from "../../../../modules/suppliers/registry"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const supplierId = req.query.supplier_id as string | undefined
  if (!supplierId) {
    return sendError(res, 400, "VALIDATION_ERROR", "supplier_id is required")
  }

  let adapter
  try {
    adapter = requireSupplierAdapter(supplierId)
  } catch {
    return sendError(res, 400, "VALIDATION_ERROR", `Unknown supplier: ${supplierId}`)
  }

  try {
    const data = await adapter.getProductDetail(id)
    return res.json({ data })
  } catch (error: any) {
    return sendError(res, 502, "VALIDATION_ERROR", `Supplier product detail error: ${error.message}`)
  }
}
