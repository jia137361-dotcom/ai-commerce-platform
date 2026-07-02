import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../lib/store-context"
import { pickProductUpdateData } from "../../../lib/admin-products"
import {
  mergeRequiresShippingIntoMetadata,
  resolveProductRequiresShipping,
  ensureNativeProductShippingProfile,
} from "../../../lib/product-shipping"
import {
  attachSupportedRegionsToProduct,
  mergeSupportedRegionIdsIntoMetadata,
  validateSupportedRegionIds,
} from "../../../lib/product-regions"
import { permanentlyDeleteStoreProduct } from "../../../lib/store-product-bulk"
import {
  getMcProductById,
  getStoreCoreService,
  normalizeProduct,
  parseOptionalNumber,
  sendError,
} from "../../_helpers/store-core"

export const loadStoreProduct = async (
  storeCoreService: ReturnType<typeof getStoreCoreService>,
  productId: string,
  storeId: string
) => {
  const product = await getMcProductById(storeCoreService, productId, storeId)
  if (!product) {
    return null
  }
  if (product.store_id !== storeId) {
    return "mismatch" as const
  }
  return product
}

export const getStoreProductByIdHandler = async (req: MedusaRequest, res: MedusaResponse) => {
  const productId = req.params.product_id as string
  const { store_id: storeId } = resolveCurrentStore(req)
  const storeCoreService = getStoreCoreService(req)

  const product = await loadStoreProduct(storeCoreService, productId, storeId)
  if (!product) {
    return sendError(res, 404, "PRODUCT_NOT_FOUND", "Product not found")
  }
  if (product === "mismatch") {
    return sendError(res, 403, "PRODUCT_STORE_MISMATCH", "Product does not belong to current store")
  }

  const productWithRegions = await attachSupportedRegionsToProduct(req.scope, product)

  return res.json({
    product_id: product.id,
    store_id: product.store_id,
    product: {
      ...normalizeProduct(productWithRegions),
      supported_regions: productWithRegions.supported_regions,
    },
  })
}

export const putStoreProductByIdHandler = async (req: MedusaRequest, res: MedusaResponse) => {
  const productId = req.params.product_id as string
  const { store_id: storeId } = resolveCurrentStore(req)
  const storeCoreService = getStoreCoreService(req)
  const body = (req.body ?? {}) as Record<string, unknown>

  const product = await loadStoreProduct(storeCoreService, productId, storeId)
  if (!product) {
    return sendError(res, 404, "PRODUCT_NOT_FOUND", "Product not found")
  }
  if (product === "mismatch") {
    return sendError(res, 403, "PRODUCT_STORE_MISMATCH", "Product does not belong to current store")
  }

  if (product.status === "archived") {
    const requestedStatus =
      typeof body.status === "string" ? body.status.trim().toLowerCase() : ""
    if (requestedStatus === "draft") {
      const restored = await storeCoreService.updateProducts({
        selector: { id: productId, store_id: storeId },
        data: { status: "draft" },
      })
      const restoredProduct = Array.isArray(restored) ? restored[0] : restored
      if (!restoredProduct?.id) {
        return sendError(res, 500, "VALIDATION_ERROR", "Failed to restore product")
      }
      return res.json({
        product_id: restoredProduct.id,
        store_id: restoredProduct.store_id,
        status: restoredProduct.status,
        product: normalizeProduct(restoredProduct),
      })
    }
    return sendError(res, 400, "VALIDATION_ERROR", "Cannot update archived product")
  }

  const data = pickProductUpdateData(body, product.status as string)

  if ("price" in data) {
    const price = parseOptionalNumber(data.price)
    if (price === undefined) {
      return sendError(res, 400, "VALIDATION_ERROR", "price must be a number")
    }
    data.price = price
  }

  if ("cost" in data) {
    const cost = parseOptionalNumber(data.cost)
    if (cost === undefined) {
      return sendError(res, 400, "VALIDATION_ERROR", "cost must be a number")
    }
    data.cost = cost
  }

  if (Array.isArray(data.category_ids) && data.category_ids.length) {
    const categories = await storeCoreService.listProductCategories({
      id: data.category_ids as string[],
      store_id: storeId,
    })
    if (categories.length !== (data.category_ids as string[]).length) {
      return sendError(res, 400, "VALIDATION_ERROR", "category_ids must belong to current store")
    }
  }

  const existingMeta =
    typeof product.metadata === "object" && product.metadata
      ? (product.metadata as Record<string, unknown>)
      : {}
  const incomingMeta =
    typeof data.metadata === "object" && data.metadata
      ? (data.metadata as Record<string, unknown>)
      : {}
  let mergedMeta = { ...existingMeta, ...incomingMeta }

  const requestedRegionIds = Array.isArray(body.supported_region_ids)
    ? body.supported_region_ids
    : Array.isArray(incomingMeta.supported_region_ids)
      ? incomingMeta.supported_region_ids
      : null

  if (Array.isArray(requestedRegionIds)) {
    const regionIds = requestedRegionIds.filter(
      (id): id is string => typeof id === "string" && id.trim().length > 0
    )
    const regionError = await validateSupportedRegionIds(req.scope, regionIds)
    if (regionError) {
      return sendError(res, 400, "VALIDATION_ERROR", regionError)
    }
    mergedMeta = mergeSupportedRegionIdsIntoMetadata(mergedMeta, regionIds)
  }

  if (typeof body.requires_shipping === "boolean") {
    mergedMeta = mergeRequiresShippingIntoMetadata(mergedMeta, body.requires_shipping)
  }

  if ("metadata" in data || Array.isArray(requestedRegionIds) || typeof body.requires_shipping === "boolean") {
    data.metadata = mergedMeta
  }

  if (Object.keys(data).length === 0) {
    return sendError(res, 400, "VALIDATION_ERROR", "No updatable fields provided")
  }

  const updated = await storeCoreService.updateProducts({
    selector: { id: productId, store_id: storeId },
    data,
  })
  const updatedProduct = Array.isArray(updated) ? updated[0] : updated
  if (!updatedProduct?.id) {
    return sendError(res, 500, "VALIDATION_ERROR", "Failed to update product")
  }

  const medusaVariantId =
    typeof updatedProduct.medusa_variant_id === "string" ? updatedProduct.medusa_variant_id : null
  const medusaProductId =
    typeof updatedProduct.medusa_product_id === "string" ? updatedProduct.medusa_product_id : null
  if (
    medusaProductId &&
    resolveProductRequiresShipping(updatedProduct as Record<string, unknown>)
  ) {
    await ensureNativeProductShippingProfile(req.scope, medusaProductId)
  }

  return res.json({
    product_id: updatedProduct.id,
    store_id: updatedProduct.store_id,
    status: updatedProduct.status,
    product: normalizeProduct(updatedProduct),
  })
}

export const deleteStoreProductByIdHandler = async (req: MedusaRequest, res: MedusaResponse) => {
  const productId = req.params.product_id as string
  const { store_id: storeId } = resolveCurrentStore(req)
  const storeCoreService = getStoreCoreService(req)

  const product = await loadStoreProduct(storeCoreService, productId, storeId)
  if (!product) {
    return sendError(res, 404, "PRODUCT_NOT_FOUND", "Product not found")
  }
  if (product === "mismatch") {
    return sendError(res, 403, "PRODUCT_STORE_MISMATCH", "Product does not belong to current store")
  }

  const permanent = req.query.permanent === "true"

  if (permanent) {
    const deleted = await permanentlyDeleteStoreProduct(storeCoreService, storeId, productId)
    if (!deleted.ok) {
      if (deleted.code === "PRODUCT_NOT_FOUND") {
        return sendError(res, 404, "PRODUCT_NOT_FOUND", "Product not found")
      }
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "Only draft or archived products can be permanently deleted"
      )
    }
    return res.json({
      product_id: deleted.product_id,
      store_id: storeId,
      status: "deleted",
      deleted: true,
    })
  }

  if (product.status === "archived") {
    return res.json({
      product_id: product.id,
      store_id: product.store_id,
      status: product.status,
      product: normalizeProduct(product),
      already_archived: true,
    })
  }

  const updated = await storeCoreService.updateProducts({
    selector: { id: productId, store_id: storeId },
    data: { status: "archived" },
  })
  const updatedProduct = Array.isArray(updated) ? updated[0] : updated
  if (!updatedProduct?.id) {
    return sendError(res, 500, "VALIDATION_ERROR", "Failed to archive product")
  }

  return res.json({
    product_id: updatedProduct.id,
    store_id: updatedProduct.store_id,
    status: updatedProduct.status,
    product: normalizeProduct(updatedProduct),
  })
}
