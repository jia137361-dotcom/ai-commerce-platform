/**
 * Generic Supplier Catalog API
 *
 * GET /admin/supplier-catalog?supplier_id=sup_s2bdiy&page=1&per_page=12&category_id=182
 *
 * Routes to the correct supplier adapter based on supplier_id.
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { sendError } from "../../_helpers/store-core"
import { requireSupplierAdapter } from "../../../modules/suppliers/registry"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
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

  const page = Number(req.query.page) || 1
  const perPage = Number(req.query.per_page) || 20
  const categoryId = req.query.category_id ? Number(req.query.category_id) : undefined
  const keyword = req.query.keyword as string | undefined

  try {
    const result = await adapter.listProducts({ page, perPage, categoryId, keyword })
    return res.json(result)
  } catch (error: any) {
    return sendError(res, 502, "VALIDATION_ERROR", `Supplier catalog error: ${error.message}`)
  }
}
