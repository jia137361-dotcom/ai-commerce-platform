import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { requirePlatformOperator } from "../../../../lib/platform-admin/require-platform-operator"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const operator = await requirePlatformOperator(req, res)
  if (!operator) return

  const userModule = req.scope.resolve(Modules.USER) as {
    retrieveUser: (id: string) => Promise<{ email?: string | null }>
  }
  const user = await userModule.retrieveUser(operator.user_id)

  return res.json({
    user_id: operator.user_id,
    operator_id: operator.operator_id,
    role: operator.role,
    email: user.email ?? null,
  })
}
