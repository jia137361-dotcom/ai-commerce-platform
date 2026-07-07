import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getS2bdiyConfig } from "../../../../../modules/suppliers/s2bdiy/config"
import { getS2bdiyAccessToken } from "../../../../../modules/suppliers/s2bdiy/s2bdiy-auth"
import { sendError } from "../../../../_helpers/store-core"
import { requirePlatformOperator } from "../../../../../lib/platform-admin/require-platform-operator"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const operator = await requirePlatformOperator(req, res)
  if (!operator) return

  const { id } = req.params
  const config = getS2bdiyConfig()
  if (!config) {
    return sendError(res, 400, "VALIDATION_ERROR", "S2BDIY not configured")
  }

  try {
    const token = await getS2bdiyAccessToken(config)
    const baseUrl = config.apiBaseUrl.replace(/\/$/, "")
    const resp = await fetch(`${baseUrl}/open/v1/basicProduct/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!resp.ok) {
      const text = await resp.text()
      return sendError(res, 502, "VALIDATION_ERROR", `S2BDIY API error: ${resp.status} ${text}`)
    }

    const body = await resp.json()
    const data = body.data ?? body

    return res.json({ data })
  } catch (error: any) {
    return sendError(res, 500, "VALIDATION_ERROR", `Failed to fetch product: ${error.message}`)
  }
}
