import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../../lib/store-context"
import {
  getStoreCoreService,
  normalizeProduct,
  sendError
} from "../../../_helpers/store-core"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const productId = (req.params.id ?? req.params.product_id) as string
  const { store_id: storeId } = resolveCurrentStore(req)
  const storeCoreService = getStoreCoreService(req)

  const products = await storeCoreService.listProducts({
    id: productId,
    store_id: storeId,
    status: "published"
  })

  const product = products[0]

  if (!product) {
    return sendError(res, 404, "PRODUCT_NOT_FOUND", "Product not found")
  }

  return res.json({
    product: normalizeProduct(product)
  })
}
