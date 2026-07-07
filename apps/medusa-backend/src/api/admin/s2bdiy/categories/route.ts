import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getS2bdiyConfig } from "../../../../modules/suppliers/s2bdiy/config"
import { getS2bdiyAccessToken } from "../../../../modules/suppliers/s2bdiy/s2bdiy-auth"
import { sendError } from "../../../_helpers/store-core"
import { requirePlatformOperator } from "../../../../lib/platform-admin/require-platform-operator"

// Common S2BDIY categories (top-level and sub-level)
const S2B_CATEGORIES = [
  { id: 182, name: "服装内衣", en_name: "Clothing underwear", parent_id: null },
  { id: 353, name: "长袖T恤", en_name: "Long sleeve T-shirt", parent_id: 182 },
  { id: 247, name: "短袖T恤", en_name: "Short sleeve T-shirt", parent_id: 182 },
  { id: 356, name: "卫衣", en_name: "Hoodie", parent_id: 182 },
  { id: 354, name: "男款", en_name: "Men", parent_id: 182 },
  { id: 355, name: "女款", en_name: "Women", parent_id: 182 },
  { id: 255, name: "箱包", en_name: "Luggage and bags", parent_id: null },
  { id: 264, name: "收纳用品", en_name: "Storage supplies", parent_id: 255 },
  { id: 265, name: "束口袋", en_name: "Drawstring bag", parent_id: 255 },
  { id: 294, name: "杯具用品", en_name: "Cup supplies", parent_id: null },
  { id: 296, name: "马克杯", en_name: "Mug", parent_id: 294 },
  { id: 174, name: "家居用品", en_name: "Household items", parent_id: null },
  { id: 202, name: "数码配件", en_name: "Digital accessories", parent_id: null },
  { id: 184, name: "宠物用品", en_name: "Pet supplies", parent_id: null },
  { id: 188, name: "宠物配件", en_name: "Pet accessories", parent_id: 184 },
]

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const operator = await requirePlatformOperator(req, res)
  if (!operator) return

  const config = getS2bdiyConfig()
  if (!config) {
    return sendError(res, 400, "VALIDATION_ERROR", "S2BDIY not configured")
  }

  // Try to fetch categories from S2BDIY API first
  try {
    const token = await getS2bdiyAccessToken(config)
    const baseUrl = config.apiBaseUrl.replace(/\/$/, "")
    const resp = await fetch(`${baseUrl}/open/v1/basicProduct/categorys`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (resp.ok) {
      const body = await resp.json()
      if (body.data && Array.isArray(body.data) && body.data.length > 0) {
        return res.json({ categories: body.data })
      }
    }
  } catch {
    // Fall through to static list
  }

  // Fallback to static category list
  return res.json({ categories: S2B_CATEGORIES })
}
