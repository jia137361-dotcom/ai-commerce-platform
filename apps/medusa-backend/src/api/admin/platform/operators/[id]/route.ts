import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { STORE_CORE_MODULE } from "../../../../../modules/store-core"
import type StoreCoreModuleService from "../../../../../modules/store-core/service"
import {
  assertPlatformAdmin,
  requirePlatformOperator,
} from "../../../../../lib/platform-admin/require-platform-operator"

type OperatorPatchBody = {
  role?: "admin" | "viewer"
  status?: "active" | "disabled"
}

type UserRecord = {
  id: string
  email?: string | null
  first_name?: string | null
  last_name?: string | null
}

async function formatOperator(
  storeCore: StoreCoreModuleService,
  userModule: { retrieveUser: (id: string) => Promise<UserRecord> },
  operator: Awaited<ReturnType<StoreCoreModuleService["listPlatformOperators"]>>[number]
) {
  const user = await userModule.retrieveUser(operator.user_id).catch(() => null)
  const memberships = await storeCore.listStoreMembers({ user_id: operator.user_id })
  return {
    id: operator.id,
    user_id: operator.user_id,
    email: user?.email ?? null,
    name: [user?.first_name, user?.last_name].filter(Boolean).join(" ") || null,
    role: operator.role,
    status: operator.status,
    has_store_membership: memberships.length > 0,
    created_at: operator.created_at ?? null,
    updated_at: operator.updated_at ?? null,
  }
}

export const PATCH = async (req: MedusaRequest<OperatorPatchBody>, res: MedusaResponse) => {
  const currentOperator = await requirePlatformOperator(req, res)
  if (!currentOperator) return
  if (!(await assertPlatformAdmin(currentOperator, res))) return

  const operatorId = req.params.id as string
  const storeCore = req.scope.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const userModule = req.scope.resolve(Modules.USER) as { retrieveUser: (id: string) => Promise<UserRecord> }
  const operators = await storeCore.listPlatformOperators({ id: operatorId })
  const operator = operators[0]
  if (!operator) {
    return res.status(404).json({ error: { code: "OPERATOR_NOT_FOUND", message: "Platform operator not found." } })
  }

  const nextStatus = req.body?.status
  const nextRole = req.body?.role
  const patch: Partial<{ role: "admin" | "viewer"; status: "active" | "disabled" }> = {}

  if (nextRole) {
    if (nextRole !== "admin" && nextRole !== "viewer") {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid operator role." } })
    }
    patch.role = nextRole
  }
  if (nextStatus) {
    if (nextStatus !== "active" && nextStatus !== "disabled") {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid operator status." } })
    }
    patch.status = nextStatus
  }

  if (!Object.keys(patch).length) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "No operator changes were provided." } })
  }

  const activeOperators = await storeCore.listPlatformOperators({ status: "active" })
  if (operator.id === currentOperator.operator_id && patch.status === "disabled") {
    return res.status(400).json({
      error: { code: "LAST_OPERATOR_PROTECTED", message: "You cannot deactivate your own active operator session." },
    })
  }
  if (operator.status === "active" && patch.status === "disabled" && activeOperators.length <= 1) {
    return res.status(400).json({
      error: { code: "LAST_OPERATOR_PROTECTED", message: "At least one active platform operator must remain." },
    })
  }

  const activeAdmins = activeOperators.filter((item) => item.role === "admin")
  if (operator.status === "active" && operator.role === "admin") {
    const demotingLastAdmin = patch.role === "viewer" && !patch.status
    const disablingLastAdmin = patch.status === "disabled"
    if ((demotingLastAdmin || disablingLastAdmin) && activeAdmins.length <= 1) {
      return res.status(400).json({
        error: { code: "LAST_ADMIN_PROTECTED", message: "At least one active admin operator must remain." },
      })
    }
  }

  const updated = await storeCore.updatePlatformOperators(operator.id, patch)
  return res.json({ operator: await formatOperator(storeCore, userModule, updated) })
}
