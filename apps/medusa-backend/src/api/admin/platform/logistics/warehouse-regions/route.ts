import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { requirePlatformOperator } from "../../../../../lib/platform-admin/require-platform-operator"
import { STORE_CORE_MODULE } from "../../../../../modules/store-core"
import type StoreCoreModuleService from "../../../../../modules/store-core/service"

type LogisticsStoreCoreService = StoreCoreModuleService & {
  listWarehouseRegions: (filters?: Record<string, unknown>) => Promise<Array<Record<string, unknown>>>
}

const sortByOrderThenName = (a: Record<string, unknown>, b: Record<string, unknown>) => {
  const sortA = typeof a.sort_order === "number" ? a.sort_order : 0
  const sortB = typeof b.sort_order === "number" ? b.sort_order : 0
  if (sortA !== sortB) return sortA - sortB
  return String(a.name_en ?? "").localeCompare(String(b.name_en ?? ""))
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const operator = await requirePlatformOperator(req, res)
  if (!operator) return

  const storeCore = req.scope.resolve(STORE_CORE_MODULE) as LogisticsStoreCoreService
  const regions = await storeCore.listWarehouseRegions({})

  return res.json({
    count: regions.length,
    regions: regions.sort(sortByOrderThenName),
  })
}
