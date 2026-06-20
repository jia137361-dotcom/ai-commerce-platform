import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { inspect } from "node:util"
import { resolveCurrentStore } from "../../../../../lib/store-context"
import { ensureNativeBridgeCartable } from "../../../../../lib/ensure-native-bridge-cartable"
import {
  ensureNativeProductShippingProfile,
  resolveProductRequiresShipping,
} from "../../../../../lib/product-shipping"
import { resolveNativeBridgeForPublish } from "../../../../../lib/native-product-bridge"
import {
  productNeedsCartBridgeBackfill,
  readRecord,
  readString,
} from "../../../../../lib/product-cart-bridge"
import {
  getMcProductById,
  getStoreCoreService,
  normalizeProduct,
  sendError
} from "../../../../_helpers/store-core"

function bridgeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === "string") {
    return error
  }
  const message = readString(readRecord(error).message)
  if (message) {
    return message
  }
  return inspect(error, { depth: 8, breakLength: 160 })
}

function bridgeErrorStack(error: unknown) {
  return error instanceof Error ? error.stack : undefined
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

  const existingVariantId = readString(product.medusa_variant_id)
  if (product.status === "published" && existingVariantId) {
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

  let bridge
  try {
    bridge = await resolveNativeBridgeForPublish(
      req.scope,
      product as Record<string, unknown>,
      currentStoreId
    )
    await ensureNativeBridgeCartable(req.scope, bridge)
    if (resolveProductRequiresShipping(product as Record<string, unknown>)) {
      await ensureNativeProductShippingProfile(req.scope, bridge.medusaProductId)
    }
  } catch (error: unknown) {
    console.error("product cart bridge publish failed:", {
      product_id: productId,
      store_id: currentStoreId,
      message: bridgeErrorMessage(error),
      stack: bridgeErrorStack(error),
    })
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      bridgeErrorMessage(error)
    )
  }

  const updateData: Record<string, unknown> = {
    medusa_product_id: bridge.medusaProductId,
    medusa_variant_id: bridge.medusaVariantId,
  }
  if (productNeedsCartBridgeBackfill(product) || product.status !== "published") {
    updateData.status = "published"
  }

  const updated = await storeCoreService.updateProducts({
    selector: {
      id: productId,
      store_id: currentStoreId,
    },
    data: updateData,
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
