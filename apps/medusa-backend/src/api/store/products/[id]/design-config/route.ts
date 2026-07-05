import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../../../lib/store-context"
import { getStoreCoreService, sendError, getMcProductById } from "../../../../_helpers/store-core"
import { buildProductDesignConfig } from "../../../../../lib/s2bdiy/product-design-config"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const productId = req.params.id as string
  const { store_id: storeId } = resolveCurrentStore(req)

  const storeCoreService = getStoreCoreService(req)
  const product = await getMcProductById(storeCoreService, productId, storeId)

  if (!product) {
    return sendError(res, 404, "PRODUCT_NOT_FOUND", "Product not found")
  }

  try {
    const config = await buildProductDesignConfig(
      storeCoreService,
      product as Record<string, unknown>,
      { productId, storeId }
    )
    return res.json(config)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message === "DESIGNER_NOT_SUPPORTED") {
      return sendError(res, 400, "DESIGNER_NOT_SUPPORTED", "This product does not support online design")
    }
    if (message === "S2BDIY_CREDENTIALS_REQUIRED") {
      return sendError(
        res,
        503,
        "S2BDIY_CREDENTIALS_REQUIRED",
        "S2BDIY editor requires valid AppKey/AppSecret. Update apps/medusa-backend/.env and run npm run s2bdiy:verify"
      )
    }
    if (message === "S2BDIY_CREDENTIALS_INVALID") {
      return sendError(
        res,
        503,
        "S2BDIY_CREDENTIALS_INVALID",
        "S2BDIY AppKey/AppSecret rejected by supplier. Update credentials and run npm run s2bdiy:verify"
      )
    }
    if (message === "SUPPLIER_UNAVAILABLE") {
      return sendError(res, 503, "SUPPLIER_UNAVAILABLE", "Design service is not configured")
    }
    console.error("[design-config] failed to get S2BDIY token:", message)
    return sendError(res, 502, "SUPPLIER_AUTH_FAILED", "Unable to connect to design service")
  }
}
