/**
 * Get designed product detail (mockup URLs, variants) from S2BDIY.
 *
 * GET /store/design-sessions/product-detail/:s2bProductId
 *
 * Proxies to S2BDIY: GET /open/v1/product/{id}
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { sendError } from "../../../_helpers/store-core"
import { getS2bdiyConfig } from "../../../../modules/suppliers/s2bdiy/config"
import { getS2bdiyAccessToken } from "../../../../modules/suppliers/s2bdiy/s2bdiy-auth"

const S2BDIY_TIMEOUT_MS = 30_000

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const config = getS2bdiyConfig()
  if (!config) {
    return sendError(res, 503, "SUPPLIER_UNAVAILABLE", "Design service is not configured")
  }

  const s2bProductId = req.params.s2bProductId as string
  if (!s2bProductId || !/^\d+$/.test(s2bProductId)) {
    return sendError(res, 400, "MISSING_FIELDS", "Valid s2bProductId is required")
  }

  try {
    const token = await getS2bdiyAccessToken(config)
    const baseUrl = config.apiBaseUrl.replace(/\/$/, "")

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), S2BDIY_TIMEOUT_MS)

    let resp: Response
    try {
      resp = await fetch(`${baseUrl}/open/v1/product/${s2bProductId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }

    const result = (await resp.json()) as {
      status: string
      status_code: number
      msg?: string
      data?: Record<string, unknown>
    }

    if (!resp.ok || result.status !== "success" || !result.data) {
      return sendError(res, 502, "EXTERNAL_SERVICE_ERROR", result.msg ?? `S2BDIY returned ${resp.status}`)
    }

    const data = result.data

    // Extract mockup URLs from show_images
    const mockupUrls: string[] = []
    if (Array.isArray(data.show_images)) {
      for (const view of data.show_images) {
        if (view && typeof view === "object" && Array.isArray((view as any).images)) {
          for (const img of (view as any).images) {
            if (img && img.src) mockupUrls.push(img.src)
          }
        }
      }
    }

    return res.status(200).json({
      product_id: data.id,
      product_name: data.product_name ?? data.name ?? data.en_name,
      product_code: data.code,
      status: data.status,
      mockup_urls: mockupUrls,
      variants: Array.isArray(data.variants)
        ? data.variants.map((v: any) => ({
            id: v.id,
            size_id: v.size_id,
            color_id: v.color_id,
            size_name: v.size_name,
            color_name: v.color_name,
            weight: v.weight,
            length: v.length,
            width: v.width,
            height: v.height,
          }))
        : [],
      raw: data,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[product-detail] failed:", message)
    return sendError(res, 500, "EXTERNAL_SERVICE_ERROR", `Get product detail failed: ${message}`)
  }
}
