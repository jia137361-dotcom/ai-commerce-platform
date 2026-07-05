import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../../../lib/store-context"
import { retryS2bProvisionForMcProduct } from "../../../../../lib/s2bdiy/retry-product-provision"
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

  if (product.store_id !== storeId) {
    return sendError(
      res,
      403,
      "PRODUCT_STORE_MISMATCH",
      "Product does not belong to current store"
    )
  }

  try {
    const result = await retryS2bProvisionForMcProduct(storeCoreService, productId, storeId)
    const refreshed = await getMcProductById(storeCoreService, productId, storeId)

    return res.json({
      product_id: productId,
      store_id: storeId,
      provisioned: result.provisioned,
      already_provisioned: result.already_provisioned,
      s2b_provision_error: result.s2b_provision_error,
      supplier_product_id: result.supplier_product_id,
      product: refreshed ? normalizeProduct(refreshed) : normalizeProduct(product),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "S2BDIY provision failed"
    return sendError(res, 400, "VALIDATION_ERROR", message)
  }
}
