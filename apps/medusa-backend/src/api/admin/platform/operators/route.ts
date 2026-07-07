import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { STORE_CORE_MODULE } from "../../../../modules/store-core"
import type StoreCoreModuleService from "../../../../modules/store-core/service"
import {
  assertPlatformAdmin,
  requirePlatformOperator,
} from "../../../../lib/platform-admin/require-platform-operator"

type UserRecord = {
  id: string
  email?: string | null
  first_name?: string | null
  last_name?: string | null
  created_at?: string | Date | null
}

type OperatorBody = {
  email?: string
  role?: "admin" | "viewer"
}

const normalizeEmail = (email: string) => email.trim().toLowerCase()

async function operatorRow(
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
    created_at: operator.created_at ?? user?.created_at ?? null,
    updated_at: operator.updated_at ?? null,
  }
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const currentOperator = await requirePlatformOperator(req, res)
  if (!currentOperator) return

  const storeCore = req.scope.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const userModule = req.scope.resolve(Modules.USER) as { retrieveUser: (id: string) => Promise<UserRecord> }
  const operators = await storeCore.listPlatformOperators({}, { order: { created_at: "DESC" }, take: 500 })
  const rows = await Promise.all(operators.map((operator) => operatorRow(storeCore, userModule, operator)))

  return res.json({ count: rows.length, operators: rows })
}

export const POST = async (req: MedusaRequest<OperatorBody>, res: MedusaResponse) => {
  const currentOperator = await requirePlatformOperator(req, res)
  if (!currentOperator) return
  if (!(await assertPlatformAdmin(currentOperator, res))) return

  const email = normalizeEmail(req.body?.email ?? "")
  const role = req.body?.role === "admin" ? "admin" : "viewer"
  if (!email) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Email is required." } })
  }

  const userModule = req.scope.resolve(Modules.USER) as {
    listUsers: (filters: Record<string, unknown>) => Promise<UserRecord[]>
    retrieveUser: (id: string) => Promise<UserRecord>
  }
  const storeCore = req.scope.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const users = (await userModule.listUsers({ email })).filter((user) => user.email?.toLowerCase() === email)
  const user = users[0]
  if (!user?.id) {
    return res.status(404).json({
      error: {
        code: "USER_NOT_FOUND",
        message: "Create the Medusa user first, then add it as a platform operator.",
      },
    })
  }

  const memberships = await storeCore.listStoreMembers({ user_id: user.id })
  if (memberships.length) {
    return res.status(409).json({
      error: {
        code: "SELLER_ACCOUNT_NOT_ALLOWED",
        message: "Seller store accounts cannot be added as platform operators.",
      },
    })
  }

  const existing = await storeCore.listPlatformOperators({ user_id: user.id })
  const operator = existing[0]
  if (operator) {
    const updated = await storeCore.updatePlatformOperators(operator.id, { role, status: "active" })
    return res.status(200).json({ operator: await operatorRow(storeCore, userModule, updated) })
  }

  const created = await storeCore.createPlatformOperators({
    user_id: user.id,
    role,
    status: "active",
  })

  return res.status(201).json({ operator: await operatorRow(storeCore, userModule, created) })
}
