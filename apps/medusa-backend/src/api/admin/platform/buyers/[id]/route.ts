import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { STORE_CORE_MODULE } from "../../../../../modules/store-core"
import type StoreCoreModuleService from "../../../../../modules/store-core/service"
import { sendError } from "../../../../_helpers/store-core"
import {
  assertPlatformAdmin,
  PLATFORM_STATUS_DISABLED,
  requirePlatformOperator,
} from "../../../../../lib/platform-admin/require-platform-operator"
import { getPlatformBuyer } from "../../../../../lib/platform-admin/platform-directory"
import { recordPlatformAuditEvent } from "../../../../../lib/platform-admin/platform-utils"
import { setCustomerPlatformStatus } from "../../../../../lib/platform-admin/platform-account-status"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const operator = await requirePlatformOperator(req, res)
  if (!operator) return

  const customerId = req.params.id as string
  try {
    const buyer = await getPlatformBuyer(req.scope, customerId)
    return res.json({ buyer })
  } catch {
    return sendError(res, 404, "VALIDATION_ERROR", "Buyer not found")
  }
}

type StatusBody = { status?: string }

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const operator = await requirePlatformOperator(req, res)
  if (!operator) return
  if (!(await assertPlatformAdmin(operator, res))) return

  const customerId = req.params.id as string
  const body = (req.body ?? {}) as StatusBody
  const status = body.status === PLATFORM_STATUS_DISABLED ? PLATFORM_STATUS_DISABLED : "active"

  try {
    await setCustomerPlatformStatus(req.scope, customerId, status)
  } catch {
    return sendError(res, 404, "VALIDATION_ERROR", "Buyer not found")
  }

  const storeCore = req.scope.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  await recordPlatformAuditEvent(storeCore, {
    actorUserId: operator.user_id,
    action: status === PLATFORM_STATUS_DISABLED ? "buyer.disabled" : "buyer.enabled",
    entityType: "customer",
    entityId: customerId,
    metadata: { status },
  })

  const buyer = await getPlatformBuyer(req.scope, customerId)
  return res.json({ buyer })
}
