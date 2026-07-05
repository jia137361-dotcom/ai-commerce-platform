import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { STORE_CORE_MODULE } from "../../../../../modules/store-core"
import type StoreCoreModuleService from "../../../../../modules/store-core/service"
import { sendError } from "../../../../_helpers/store-core"
import {
  assertPlatformAdmin,
  PLATFORM_STATUS_DISABLED,
  requirePlatformOperator,
} from "../../../../../lib/platform-admin/require-platform-operator"
import { getPlatformSeller } from "../../../../../lib/platform-admin/platform-directory"
import { recordPlatformAuditEvent } from "../../../../../lib/platform-admin/platform-utils"
import { setUserPlatformStatus } from "../../../../../lib/platform-admin/platform-account-status"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const operator = await requirePlatformOperator(req, res)
  if (!operator) return

  const userId = req.params.id as string
  try {
    const seller = await getPlatformSeller(req.scope, userId)
    return res.json({ seller })
  } catch {
    return sendError(res, 404, "VALIDATION_ERROR", "Seller not found")
  }
}

type StatusBody = { status?: string }

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const operator = await requirePlatformOperator(req, res)
  if (!operator) return
  if (!(await assertPlatformAdmin(operator, res))) return

  const userId = req.params.id as string
  const body = (req.body ?? {}) as StatusBody
  const status = body.status === PLATFORM_STATUS_DISABLED ? PLATFORM_STATUS_DISABLED : "active"

  try {
    await setUserPlatformStatus(req.scope, userId, status)
  } catch {
    return sendError(res, 404, "VALIDATION_ERROR", "Seller not found")
  }

  const storeCore = req.scope.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  await recordPlatformAuditEvent(storeCore, {
    actorUserId: operator.user_id,
    action: status === PLATFORM_STATUS_DISABLED ? "seller.disabled" : "seller.enabled",
    entityType: "user",
    entityId: userId,
    metadata: { status },
  })

  const seller = await getPlatformSeller(req.scope, userId)
  return res.json({ seller })
}
