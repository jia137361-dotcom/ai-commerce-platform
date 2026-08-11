import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../../../lib/store-context"
import { syncS2bDesignPreviewForMcProduct } from "../../../../../lib/s2bdiy/sync-s2b-design-preview"
import {
  getMcProductById,
  getStoreCoreService,
  normalizeProduct,
  sendError,
} from "../../../../_helpers/store-core"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const productId = req.params.product_id as string
  const { store_id: storeId } = resolveCurrentStore(req)
  const storeCoreService = getStoreCoreService(req)

  const product = await getMcProductById(storeCoreService, productId, storeId)
  if (!product) {
    return sendError(res, 404, "PRODUCT_NOT_FOUND", "Product not found")
  }

  const body = (req.body ?? {}) as {
    s2b_product_id?: string | number
    mockup_urls?: string[]
    mockup_url?: string
  }

  const mockupUrls = [
    ...(Array.isArray(body.mockup_urls) ? body.mockup_urls : []),
    ...(typeof body.mockup_url === "string" ? [body.mockup_url] : []),
  ].filter((url): url is string => typeof url === "string" && Boolean(url.trim()))

  try {
    const result = await syncS2bDesignPreviewForMcProduct(storeCoreService, {
      productId,
      storeId,
      s2bProductId: body.s2b_product_id ?? null,
      mockupUrls: mockupUrls.length ? mockupUrls : null,
    })

    const refreshed = await getMcProductById(storeCoreService, productId, storeId)

    return res.json({
      product_id: productId,
      supplier_product_id: result.supplier_product_id,
      mockup_image_url: result.mockup_image_url,
      gallery: result.gallery,
      product: refreshed ? normalizeProduct(refreshed) : null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message === "PRODUCT_NOT_FOUND") {
      return sendError(res, 404, "PRODUCT_NOT_FOUND", "Product not found")
    }
    if (message === "S2B_PRODUCT_ID_REQUIRED") {
      return sendError(
        res,
        400,
        "S2B_PRODUCT_ID_REQUIRED",
        "s2b_product_id is required to sync mockup previews from S2BDIY"
      )
    }
    if (message === "S2BDIY_MOCK_MODE_ACTIVE") {
      return sendError(
        res,
        503,
        "S2BDIY_MOCK_MODE",
        "S2BDIY mock mode is active. Pass mockup_url from the editor save event instead."
      )
    }
    if (message === "S2B_MOCKUP_NOT_FOUND") {
      return sendError(
        res,
        502,
        "S2B_MOCKUP_NOT_FOUND",
        "S2BDIY product detail did not include show_images mockups"
      )
    }
    console.error("[admin/sync-s2b-design] failed:", message)
    return sendError(res, 502, "S2B_SYNC_FAILED", "Unable to sync design preview from S2BDIY")
  }
}
