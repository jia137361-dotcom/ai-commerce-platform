import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { randomBytes } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { resolveCurrentStore } from "../../../../../lib/store-context"
import {
  resolveStoreMediaBaseUrl,
  validateStoreImageUpload,
} from "../../../../../lib/store-settings-media"
import {
  getMcProductById,
  getStoreCoreService,
  normalizeProduct,
  sendError,
} from "../../../../_helpers/store-core"

type ProductImageUploadBody = {
  file_base64?: string
  content_type?: string
}

const readImageUrls = (metadata: Record<string, unknown>) =>
  Array.isArray(metadata.image_urls)
    ? metadata.image_urls.filter(
        (value): value is string => typeof value === "string" && Boolean(value.trim())
      )
    : []

const productImageUploadDir = (cwd: string = process.cwd()) => `${cwd}/static/product-images`

const productImagePublicUrl = (fileName: string, baseUrl?: string) =>
  `${(baseUrl ?? "http://127.0.0.1:9000").replace(/\/+$/, "")}/static/product-images/${fileName}`

export const POST = async (
  req: MedusaRequest<ProductImageUploadBody>,
  res: MedusaResponse
) => {
  const productId = req.params.product_id as string
  const { store_id: storeId } = resolveCurrentStore(req)
  const storeCoreService = getStoreCoreService(req)

  const product = await getMcProductById(storeCoreService, productId, storeId)
  if (!product) {
    return sendError(res, 404, "PRODUCT_NOT_FOUND", "Product not found")
  }
  if (product.store_id !== storeId) {
    return sendError(res, 403, "PRODUCT_STORE_MISMATCH", "Product does not belong to current store")
  }
  if (product.status === "archived") {
    return sendError(res, 400, "VALIDATION_ERROR", "Cannot upload images for archived product")
  }

  const body = req.body ?? {}
  const fileBase64 = typeof body.file_base64 === "string" ? body.file_base64.trim() : ""
  const contentType = typeof body.content_type === "string" ? body.content_type.trim().toLowerCase() : ""
  const validation = validateStoreImageUpload("gallery", fileBase64, contentType)
  if (!validation.ok) {
    return sendError(res, 400, "VALIDATION_ERROR", (validation as any).message ?? "Invalid image")
  }

  const ext = contentType.includes("png") ? "png" : "jpg"
  const fileName = `${storeId}-${productId}-product-${randomBytes(6).toString("hex")}.${ext}`
  await mkdir(productImageUploadDir(), { recursive: true })
  await writeFile(path.join(productImageUploadDir(), fileName), validation.buffer)

  const url = productImagePublicUrl(fileName, resolveStoreMediaBaseUrl(req))
  const existingMeta =
    product.metadata && typeof product.metadata === "object"
      ? (product.metadata as Record<string, unknown>)
      : {}
  const imageUrls = Array.from(new Set([...readImageUrls(existingMeta), url]))
  const updateData: Record<string, unknown> = {
    metadata: {
      ...existingMeta,
      image_urls: imageUrls,
    },
  }
  if (!product.image_url) {
    updateData.image_url = url
  }
  if (!product.mockup_image_url) {
    updateData.mockup_image_url = url
  }

  const updated = await storeCoreService.updateProducts({
    selector: { id: productId, store_id: storeId },
    data: updateData,
  })
  const updatedProduct = Array.isArray(updated) ? updated[0] : updated

  return res.status(201).json({
    url,
    image_urls: imageUrls,
    product: updatedProduct ? normalizeProduct(updatedProduct) : null,
  })
}
