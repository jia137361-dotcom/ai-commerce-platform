import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { STORE_CORE_MODULE } from "../../../../../modules/store-core"
import type StoreCoreModuleService from "../../../../../modules/store-core/service"
import { sendError } from "../../../../_helpers/store-core"
import {
  assertPlatformAdmin,
  requirePlatformOperator,
} from "../../../../../lib/platform-admin/require-platform-operator"
import { getPlatformStore } from "../../../../../lib/platform-admin/platform-stores-orders"
import { recordPlatformAuditEvent } from "../../../../../lib/platform-admin/platform-utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const operator = await requirePlatformOperator(req, res)
  if (!operator) return

  const storeId = req.params.id as string
  const store = await getPlatformStore(req.scope, storeId)
  if (!store) {
    return sendError(res, 404, "VALIDATION_ERROR", "Store not found")
  }
  return res.json({ store })
}

type StatusBody = { status?: string }

const ALLOWED = new Set(["active", "suspended"])

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const operator = await requirePlatformOperator(req, res)
  if (!operator) return
  if (!(await assertPlatformAdmin(operator, res))) return

  const storeId = req.params.id as string
  const body = (req.body ?? {}) as StatusBody
  const status = typeof body.status === "string" && ALLOWED.has(body.status) ? body.status : null
  if (!status) {
    return sendError(res, 400, "VALIDATION_ERROR", "status must be active or suspended")
  }

  const storeCore = req.scope.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const stores = await storeCore.listStores({ id: storeId })
  if (!stores[0]) {
    return sendError(res, 404, "VALIDATION_ERROR", "Store not found")
  }

  await (storeCore as { updateStores: (input: Record<string, unknown>) => Promise<unknown> }).updateStores({
    selector: { id: storeId },
    data: { status },
  })

  await recordPlatformAuditEvent(storeCore, {
    actorUserId: operator.user_id,
    action: status === "suspended" ? "store.suspended" : "store.activated",
    entityType: "store",
    entityId: storeId,
    storeId,
    metadata: { status },
  })

  const store = await getPlatformStore(req.scope, storeId)
  return res.json({ store })
}
