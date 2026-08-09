/**
 * Create a designed product on S2BDIY via quickCreate.
 *
 * POST /store/design-sessions/quick-create
 * Body: { size_id, color_id, basic_product_id, name, views: [{ view_id, objects: [{ type, material_id, design_type }] }] }
 *
 * Proxies to S2BDIY: POST /open/v1/product/quickCreate
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { sendError } from "../../../_helpers/store-core"
import { getS2bdiyConfig } from "../../../../modules/suppliers/s2bdiy/config"
import { getS2bdiyAccessToken } from "../../../../modules/suppliers/s2bdiy/s2bdiy-auth"

const S2BDIY_TIMEOUT_MS = 30_000

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const config = getS2bdiyConfig()
  if (!config) {
    return sendError(res, 503, "SUPPLIER_UNAVAILABLE", "Design service is not configured")
  }

  const body = (req.body ?? {}) as {
    size_id?: number | string
    color_id?: number | string
    basic_product_id?: number | string
    name?: string
    views?: Array<{
      view_id: number | string
      objects: Array<{
        type: string
        material_id: number | string
        design_type?: number
      }>
    }>
  }

  if (!body.basic_product_id || !body.size_id || !body.color_id) {
    return sendError(
      res,
      400,
      "MISSING_FIELDS",
      "basic_product_id, size_id, and color_id are required"
    )
  }

  try {
    const token = await getS2bdiyAccessToken(config)
    const baseUrl = config.apiBaseUrl.replace(/\/$/, "")

    const s2bBody = {
      size_id: Number(body.size_id),
      color_id: Number(body.color_id),
      product_design: {
        basic_product_id: Number(body.basic_product_id),
        name: body.name ?? "Custom Design",
        views: (body.views ?? []).map((view) => ({
          view_id: Number(view.view_id),
          objects: view.objects.map((obj) => ({
            type: obj.type ?? "image",
            material_id: Number(obj.material_id),
            design_type: obj.design_type ?? 1,
          })),
        })),
      },
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), S2BDIY_TIMEOUT_MS)

    let resp: Response
    try {
      resp = await fetch(`${baseUrl}/open/v1/product/quickCreate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(s2bBody),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }

    const result = (await resp.json()) as {
      status: string
      status_code: number
      msg?: string
      data?: { product_id: number | string; product_name?: string; product_code?: string }
    }

    if (!resp.ok || result.status !== "success" || !result.data?.product_id) {
      return sendError(res, 502, "EXTERNAL_SERVICE_ERROR", result.msg ?? `S2BDIY returned ${resp.status}`)
    }

    return res.status(201).json({
      s2b_product_id: result.data.product_id,
      product_name: result.data.product_name,
      product_code: result.data.product_code,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[quick-create] failed:", message)
    return sendError(res, 500, "EXTERNAL_SERVICE_ERROR", `Quick create failed: ${message}`)
  }
}
