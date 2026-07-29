import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getS2bdiyConfig } from "../../../../modules/suppliers/s2bdiy/config"
import { getS2bdiyAccessToken } from "../../../../modules/suppliers/s2bdiy/s2bdiy-auth"
import { sendError } from "../../../_helpers/store-core"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const config = getS2bdiyConfig()
  if (!config) {
    return sendError(res, 400, "VALIDATION_ERROR", "S2BDIY not configured")
  }

  const page = Number(req.query.page) || 1
  const perPage = Number(req.query.per_page) || 20
  const categoryId = req.query.category_id ? Number(req.query.category_id) : undefined
  const keyword = req.query.keyword as string | undefined

  try {
    const token = await getS2bdiyAccessToken(config)
    const baseUrl = config.apiBaseUrl.replace(/\/$/, "")

    // Build query params
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    })
    if (categoryId) params.set("category_id", String(categoryId))
    if (keyword) params.set("keyword", keyword)

    const resp = await fetch(`${baseUrl}/open/v1/basicProduct?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!resp.ok) {
      const text = await resp.text()
      return sendError(res, 502, "VALIDATION_ERROR", `S2BDIY API error: ${resp.status} ${text}`)
    }

    const body = await resp.json()
    if (body && typeof body === "object" && body.status_code !== undefined && Number(body.status_code) !== 200) {
      return sendError(res, 502, "VALIDATION_ERROR", `S2BDIY API error: ${body.msg ?? "business error"}`)
    }
    const data = body.data ?? body

    return res.json({
      data: data.data ?? data,
      total: data.total ?? 0,
      page: data.current_page ?? page,
      per_page: data.per_page ?? perPage,
      last_page: data.last_page ?? 1,
    })
  } catch (error: any) {
    return sendError(res, 500, "VALIDATION_ERROR", `Failed to fetch catalog: ${error.message}`)
  }
}
