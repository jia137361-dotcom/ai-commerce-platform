import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../../lib/store-context"
import {
  getStoreCoreService,
  sendError,
  createMcProduct
} from "../../../_helpers/store-core"
import { getS2bdiyConfig } from "../../../../modules/suppliers/s2bdiy/config"
import { getProductDetail, extractMockupImageUrl } from "../../../../modules/suppliers/s2bdiy/s2bdiy-product"
import { S2bdiyClient } from "../../../../modules/suppliers/s2bdiy/s2bdiy-client"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { store_id: storeId } = resolveCurrentStore(req)

  const body = req.body as {
    s2b_product_id?: number | string
    basic_product_id?: number | string
    quantity?: number
  }

  if (!body.s2b_product_id || !body.basic_product_id) {
    return sendError(res, 400, "MISSING_FIELDS", "s2b_product_id and basic_product_id are required")
  }

  const s2bConfig = getS2bdiyConfig()
  if (!s2bConfig) {
    return sendError(res, 503, "SUPPLIER_UNAVAILABLE", "Design service is not configured")
  }

  try {
    const client = new S2bdiyClient(s2bConfig)

    const productDetail = await getProductDetail(client, body.s2b_product_id)
    const mockupUrl = extractMockupImageUrl(productDetail)
    const productName = (productDetail as Record<string, unknown>).product_name as string ?? "Custom Design"

    const storeCoreService = getStoreCoreService(req)

    const mcProduct = await createMcProduct(storeCoreService, {
      store_id: storeId,
      title: productName,
      description: `Custom design created with designer SDK`,
      status: "draft",
      source: "manual",
      basic_product_id: String(body.basic_product_id),
      mockup_image_url: mockupUrl ?? undefined,
      price: 0,
      cost: 0,
      tags: ["custom-design"],
      variants: [],
      category_ids: [],
      metadata: {
        s2b_product_id: body.s2b_product_id,
        design_source: "buyer_sdk",
      },
    })

    return res.json({
      mc_product_id: mcProduct.id,
      title: mcProduct.title,
      mockup_url: mockupUrl ?? null,
      price: mcProduct.price,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[design-sessions/complete] failed:", message)
    return sendError(res, 500, "DESIGN_COMPLETE_FAILED", "Unable to complete design session")
  }
}
