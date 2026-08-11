import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../../../lib/store-context"
import { getMcProductById, getStoreCoreService, normalizeProduct, sendError } from "../../../../_helpers/store-core"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const productId = req.params.product_id as string
  const storeId = resolveCurrentStore(req).store_id
  const service = getStoreCoreService(req)
  const product = await getMcProductById(service, productId, storeId)
  if (!product) return sendError(res, 404, "PRODUCT_NOT_FOUND", "Product not found")
  if (product.status === "archived") return sendError(res, 400, "VALIDATION_ERROR", "Archived products cannot be unpublished")
  const result = product.status !== "unpublished" ? await service.updateProducts({ selector: { id: productId, store_id: storeId }, data: { status: "unpublished" } }) : product
  const updated = Array.isArray(result) ? result[0] : result
  return res.json({ product_id: productId, store_id: storeId, status: "unpublished", product: normalizeProduct(updated) })
}
