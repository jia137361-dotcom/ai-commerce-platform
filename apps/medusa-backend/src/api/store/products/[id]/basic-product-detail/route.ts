/**
 * Get basic product detail (sizes, colors, views) from S2BDIY for the custom editor.
 *
 * GET /store/products/:id/basic-product-detail
 *
 * Proxies to S2BDIY: GET /open/v1/basicProduct/{basicProductId}
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { sendError } from "../../../../_helpers/store-core"
import { getMcProductById } from "../../../../_helpers/store-core"
import { resolveCurrentStore } from "../../../../../lib/store-context"
import { getStoreCoreService } from "../../../../_helpers/store-core"
import { getS2bdiyConfig } from "../../../../../modules/suppliers/s2bdiy/config"
import { getS2bdiyAccessToken } from "../../../../../modules/suppliers/s2bdiy/s2bdiy-auth"

const S2BDIY_TIMEOUT_MS = 30_000

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const productId = req.params.id as string
  const { store_id: storeId } = resolveCurrentStore(req)
  const storeCoreService = getStoreCoreService(req)

  const product = await getMcProductById(storeCoreService, productId, storeId)
  if (!product) {
    return sendError(res, 404, "PRODUCT_NOT_FOUND", "Product not found")
  }

  const basicProductId =
    (typeof product.basic_product_id === "string" && product.basic_product_id.trim())
      ? product.basic_product_id.trim()
      : null

  if (!basicProductId || !/^\d+$/.test(basicProductId)) {
    return sendError(res, 400, "MISSING_FIELDS", "Product has no valid basic_product_id")
  }

  const config = getS2bdiyConfig()
  if (!config) {
    return sendError(res, 503, "SUPPLIER_UNAVAILABLE", "Design service is not configured")
  }

  try {
    const token = await getS2bdiyAccessToken(config)
    const baseUrl = config.apiBaseUrl.replace(/\/$/, "")

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), S2BDIY_TIMEOUT_MS)

    let resp: Response
    try {
      resp = await fetch(`${baseUrl}/open/v1/basicProduct/${basicProductId}`, {
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

    // Normalize sizes, colors, views
    const sizes = Array.isArray(data.sizes)
      ? (data.sizes as any[]).map((s) => ({
          id: Number(s.id),
          name: s.name ?? s.en_name ?? `Size ${s.id}`,
          en_name: s.en_name ?? s.name,
        })).filter((s) => Number.isFinite(s.id))
      : []

    const colors = Array.isArray(data.colors)
      ? (data.colors as any[]).map((c) => ({
          id: Number(c.id),
          name: c.name ?? c.en_name ?? `Color ${c.id}`,
          en_name: c.en_name ?? c.name,
        })).filter((c) => Number.isFinite(c.id))
      : []

    const views = Array.isArray(data.views)
      ? (data.views as any[]).map((v) => ({
          id: Number(v.id),
          name: v.name ?? v.en_name ?? `View ${v.id}`,
          en_name: v.en_name ?? v.name,
        })).filter((v) => Number.isFinite(v.id))
      : []

    return res.status(200).json({
      id: data.id,
      name: data.name,
      en_name: data.en_name,
      purchase_price: data.purchase_price,
      produce_country: data.produce_country,
      warehouse_name: data.warehouse_name,
      sizes,
      colors,
      views,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[basic-product-detail] failed:", message)
    return sendError(res, 500, "EXTERNAL_SERVICE_ERROR", `Failed to fetch basic product: ${message}`)
  }
}
