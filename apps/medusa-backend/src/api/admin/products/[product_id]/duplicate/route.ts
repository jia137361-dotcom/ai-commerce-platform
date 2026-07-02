import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../../../lib/store-context"
import { duplicateProductPayload } from "../../../../../lib/admin-products"
import {
  createMcProduct,
  getMcProductById,
  getStoreCoreService,
  normalizeProduct,
  sendError,
} from "../../../../_helpers/store-core"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const productId = req.params.product_id as string
  const { store_id: storeId } = resolveCurrentStore(req)
  const storeCoreService = getStoreCoreService(req)

  const source = await getMcProductById(storeCoreService, productId, storeId)

  if (!source) {
    return sendError(res, 404, "PRODUCT_NOT_FOUND", "Product not found")
  }

  if (source.store_id !== storeId) {
    return sendError(res, 403, "PRODUCT_STORE_MISMATCH", "Product does not belong to current store")
  }

  const payload = duplicateProductPayload(source as Record<string, unknown>, storeId)
  const product = await createMcProduct(storeCoreService, payload)

  return res.status(201).json({
    product_id: product.id,
    store_id: product.store_id,
    status: product.status,
    product: normalizeProduct(product),
  })
}
