import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getS2bdiyConfig } from "../../../../modules/suppliers/s2bdiy/config"
import { getS2bdiyAccessToken } from "../../../../modules/suppliers/s2bdiy/s2bdiy-auth"
import { sendError } from "../../../_helpers/store-core"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const config = getS2bdiyConfig()
  if (!config) {
    return sendError(res, 400, "VALIDATION_ERROR", "S2BDIY not configured")
  }

  try {
    const token = await getS2bdiyAccessToken(config)
    const baseUrl = config.apiBaseUrl.replace(/\/$/, "")
    const resp = await fetch(`${baseUrl}/open/v1/basicProduct/categorys`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!resp.ok) {
      const text = await resp.text()
      return sendError(res, 502, "VALIDATION_ERROR", `S2BDIY categories failed HTTP ${resp.status}: ${text}`)
    }

    const body = await resp.json()
    if (body && typeof body === "object" && body.status_code !== undefined && Number(body.status_code) !== 200) {
      return sendError(res, 502, "VALIDATION_ERROR", `S2BDIY categories failed: ${body.msg ?? "business error"}`)
    }

    return res.json({ categories: Array.isArray(body.data) ? body.data : [] })
  } catch (error: any) {
    return sendError(res, 502, "VALIDATION_ERROR", `S2BDIY categories failed: ${error.message}`)
  }
}
