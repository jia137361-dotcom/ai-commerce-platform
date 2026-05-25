import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { resolveCurrentStore } from "../../../../../lib/store-context"
import {
  getStoreCoreService,
  normalizeProduct,
  sendError
} from "../../../../_helpers/store-core"
import { getS2bdiyConfig } from "../../../../../lib/s2bdiy"

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

  if (getS2bdiyConfig()) {
    const s2bProductId = readString(product.s2b_designed_product_id)
    if (!s2bProductId) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "Product must have s2b_designed_product_id before publish (run S2BDIY provisioning)"
      )
    }
  }

  const medusaVariantId = readString(product.medusa_variant_id)
  let medusaProductId = readString(product.medusa_product_id)

  if (medusaVariantId) {
    const productModule = req.scope.resolve(Modules.PRODUCT)
    let nativeVariant: any = null

    try {
      nativeVariant = await productModule.retrieveProductVariant(medusaVariantId, {
        relations: ["product"]
      })
    } catch {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "medusa_variant_id must reference an existing Medusa variant"
      )
    }

    const nativeProduct = nativeVariant.product as Record<string, unknown> | undefined
    const nativeProductId = readString(nativeVariant.product_id) ?? readString(nativeProduct?.id)

    if (medusaProductId && nativeProductId && medusaProductId !== nativeProductId) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "medusa_product_id must match the product for medusa_variant_id"
      )
    }

    const variantMetadata = readMetadata(nativeVariant.metadata)
    const productMetadata = readMetadata(nativeProduct?.metadata)
    const variantStoreId = readString(variantMetadata.store_id)
    const productStoreId = readString(productMetadata.store_id)

    if (
      (variantStoreId && variantStoreId !== currentStoreId) ||
      (productStoreId && productStoreId !== currentStoreId)
    ) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "medusa_variant_id metadata.store_id must match current store"
      )
    }

    medusaProductId = medusaProductId ?? nativeProductId
  }

  const [updatedProduct] = await storeCoreService.updateProducts({
    selector: {
      id: productId,
      store_id: currentStoreId
    },
    data: {
      status: "published",
      medusa_product_id: medusaProductId
    }
  })

  return res.json({
    product_id: updatedProduct.id,
    store_id: updatedProduct.store_id,
    status: updatedProduct.status,
    product: normalizeProduct(updatedProduct)
  })
}
