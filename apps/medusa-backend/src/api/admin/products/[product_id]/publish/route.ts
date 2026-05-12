import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../../../lib/store-context"
import {
  getStoreCoreService,
  normalizeProduct,
  sendError
} from "../../../../_helpers/store-core"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { product_id: productId } = req.params
  const { store_id: currentStoreId } = resolveCurrentStore(req)
  const storeCoreService = getStoreCoreService(req)

  const products = await storeCoreService.listProducts({ id: productId })
  const product = products[0]

  if (!product) {
    return sendError(res, 404, "PRODUCT_NOT_FOUND", "Product not found")
  }

  if (product.store_id !== currentStoreId) {
    return sendError(
      res,
      403,
      "PRODUCT_STORE_MISMATCH",
      "Product does not belong to current store"
    )
  }

  const [updatedProduct] = await storeCoreService.updateProducts({
    selector: {
      id: productId,
      store_id: currentStoreId
    },
    data: {
      status: "published"
    }
  })

  return res.json({
    product_id: updatedProduct.id,
    store_id: updatedProduct.store_id,
    status: updatedProduct.status,
    product: normalizeProduct(updatedProduct)
  })
}

