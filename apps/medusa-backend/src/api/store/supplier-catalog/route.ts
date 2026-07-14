/**
 * Buyer storefront S2BDIY / supplier blank catalog.
 *
 * GET /store/supplier-catalog?page=1&per_page=24&category_id=&keyword=
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { sendError } from "../../_helpers/store-core"
import { requireSupplierAdapter } from "../../../modules/suppliers/registry"

const DEFAULT_SUPPLIER_ID = "sup_s2bdiy"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const supplierId =
    (typeof req.query.supplier_id === "string" && req.query.supplier_id.trim()) ||
    DEFAULT_SUPPLIER_ID

  let adapter
  try {
    adapter = requireSupplierAdapter(supplierId)
  } catch {
    return sendError(res, 400, "VALIDATION_ERROR", `Unknown supplier: ${supplierId}`)
  }

  const page = Number(req.query.page) || 1
  const perPage = Math.min(Number(req.query.per_page) || 24, 48)
  const categoryId = req.query.category_id ? Number(req.query.category_id) : undefined
  const keyword = typeof req.query.keyword === "string" ? req.query.keyword : undefined

  try {
    const result = await adapter.listProducts({
      page,
      perPage,
      categoryId: Number.isFinite(categoryId) ? categoryId : undefined,
      keyword,
    })
    return res.json({
      supplier_id: supplierId,
      ...result,
    })
  } catch (error: any) {
    return sendError(
      res,
      502,
      "EXTERNAL_SERVICE_ERROR",
      `Supplier catalog error: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
