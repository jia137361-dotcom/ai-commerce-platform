import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { requirePlatformOperator } from "../../../../lib/platform-admin/require-platform-operator"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const operator = await requirePlatformOperator(req, res)
  if (!operator) return

  return res.json({
    is_operator: true,
    role: operator.role,
    user_id: operator.user_id,
    operator_id: operator.operator_id,
  })
}
