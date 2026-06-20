import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { resolveCurrentStore } from "../../../../../lib/store-context"
import {
  getMcProductById,
  getStoreCoreService,
  normalizeProduct,
  sendError
} from "../../../../_helpers/store-core"

const readString = (value: unknown) => {
  return typeof value === "string" && value.length > 0 ? value : null
}

const readMetadata = (value: unknown) => {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {}
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { product_id: productId } = req.params
  const { store_id: currentStoreId } = resolveCurrentStore(req)
  const storeCoreService = getStoreCoreService(req)

  const product = await getMcProductById(storeCoreService, productId, currentStoreId)

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

  if (product.status === "archived") {
    return sendError(res, 400, "VALIDATION_ERROR", "Cannot publish archived product")
  }

  if (product.status === "published") {
    return res.json({
      product_id: product.id,
      store_id: product.store_id,
      status: product.status,
      product: normalizeProduct(product),
    })
  }

  const title = readString(product.title)
  if (!title) {
    return sendError(res, 400, "VALIDATION_ERROR", "title is required before publish")
  }

  const medusaVariantId = readString(product.medusa_variant_id)
  let medusaProductId = readString(product.medusa_product_id)
  let linkedMedusaVariantId: string | null = medusaVariantId
  let linkedMedusaProductId: string | null = medusaProductId

  if (medusaVariantId) {
    const productModule = req.scope.resolve(Modules.PRODUCT)
    let nativeVariant: any = null

    try {
      nativeVariant = await productModule.retrieveProductVariant(medusaVariantId, {
        relations: ["product"],
      })
    } catch {
      // Stale bridge variant from dev bootstrap — publish catalog-only instead of blocking.
      linkedMedusaVariantId = null
      linkedMedusaProductId = null
    }

    if (nativeVariant) {
      const nativeProduct = nativeVariant.product as Record<string, unknown> | undefined
      const nativeProductId =
        readString(nativeVariant.product_id) ?? readString(nativeProduct?.id)

      if (medusaProductId && nativeProductId && medusaProductId !== nativeProductId) {
        linkedMedusaVariantId = null
        linkedMedusaProductId = null
      } else {
        const variantMetadata = readMetadata(nativeVariant.metadata)
        const productMetadata = readMetadata(nativeProduct?.metadata)
        const variantStoreId = readString(variantMetadata.store_id)
        const productStoreId = readString(productMetadata.store_id)

        if (
          (variantStoreId && variantStoreId !== currentStoreId) ||
          (productStoreId && productStoreId !== currentStoreId)
        ) {
          linkedMedusaVariantId = null
          linkedMedusaProductId = null
        } else {
          linkedMedusaProductId = medusaProductId ?? nativeProductId
        }
      }
    }
  }

  const updated = await storeCoreService.updateProducts({
    selector: {
      id: productId,
      store_id: currentStoreId,
    },
    data: {
      status: "published",
      medusa_product_id: linkedMedusaProductId,
      medusa_variant_id: linkedMedusaVariantId,
    },
  })

  const updatedProduct = Array.isArray(updated) ? updated[0] : updated
  if (!updatedProduct?.id) {
    return sendError(res, 500, "VALIDATION_ERROR", "Failed to update product status")
  }

  return res.json({
    product_id: updatedProduct.id,
    store_id: updatedProduct.store_id,
    status: updatedProduct.status,
    product: normalizeProduct(updatedProduct),
  })
}
