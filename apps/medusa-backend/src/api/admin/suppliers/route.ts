/**
 * Supplier List API
 *
 * GET /admin/suppliers
 *
 * Returns all suppliers with their adapter status.
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getStoreCoreService, sendError } from "../../_helpers/store-core"
import { listRegisteredSuppliers } from "../../../modules/suppliers/registry"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const storeCoreService = getStoreCoreService(req)
    const dbSuppliers = await (storeCoreService as any).listSuppliers({})
    const registeredAdapters = listRegisteredSuppliers()
    const registeredIds = new Set(registeredAdapters.map((a) => a.supplierId))

    const suppliers = dbSuppliers.map((s: any) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      country: s.country,
      adapter_type: s.adapter_type ?? "s2bdiy",
      status: s.status,
      adapter_ready: registeredIds.has(s.id),
    }))

    return res.json({ suppliers })
  } catch (error: any) {
    return sendError(res, 500, "VALIDATION_ERROR", `Failed to list suppliers: ${error.message}`)
  }
}
