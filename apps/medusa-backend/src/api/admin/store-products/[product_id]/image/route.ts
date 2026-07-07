import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { randomBytes } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { resolveCurrentStore } from "../../../../../lib/store-context"
import {
  buildStoreMediaPublicUrl,
  resolveStoreMediaBaseUrl,
  resolveStoreMediaUploadDir,
  validateStoreImageUpload,
} from "../../../../../lib/store-settings-media"
import {
  getMcProductById,
  getStoreCoreService,
  normalizeProduct,
  sendError,
} from "../../../../_helpers/store-core"

type ProductImageBody = {
  file_base64?: string
  content_type?: string
}

const isGalleryItem = (value: unknown) =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as Record<string, unknown>).id === "string" &&
      typeof (value as Record<string, unknown>).url === "string" &&
      typeof (value as Record<string, unknown>).kind === "string"
  )

export const POST = async (
  req: MedusaRequest<ProductImageBody>,
  res: MedusaResponse
) => {
  const productId = req.params.product_id as string
  const { store_id: storeId } = resolveCurrentStore(req)
  const storeCore = getStoreCoreService(req)
  const product = await getMcProductById(storeCore, productId, storeId)

  if (!product) {
    return sendError(res, 404, "PRODUCT_NOT_FOUND", "Product not found")
  }

  const body = req.body ?? {}
  const fileBase64 = typeof body.file_base64 === "string" ? body.file_base64.trim() : ""
  const contentType =
    typeof body.content_type === "string" ? body.content_type.trim().toLowerCase() : ""
  const validation = validateStoreImageUpload("gallery", fileBase64, contentType)
  if (!validation.ok) {
    return sendError(res, 400, "VALIDATION_ERROR", validation.message)
  }

  const ext = contentType.includes("png") ? "png" : "jpg"
  const fileName = `${storeId}-product-${randomBytes(6).toString("hex")}.${ext}`
  const uploadDir = resolveStoreMediaUploadDir("gallery")
  await mkdir(uploadDir, { recursive: true })
  await writeFile(path.join(uploadDir, fileName), validation.buffer)

  const imageUrl = buildStoreMediaPublicUrl("gallery", fileName, resolveStoreMediaBaseUrl(req))
  const metadata = (product.metadata ?? {}) as Record<string, unknown>
  const existingGallery = Array.isArray(metadata.gallery)
    ? metadata.gallery.filter(isGalleryItem)
    : []
  const gallery = [
    ...existingGallery,
    {
      id: `mockup_${existingGallery.length + 1}`,
      label: existingGallery.length ? `Image ${existingGallery.length + 1}` : "Main image",
      url: imageUrl,
      kind: "mockup",
    },
  ]

  const updated = await storeCore.updateProducts({
    selector: { id: productId, store_id: storeId },
    data: {
      image_url: product.image_url ?? imageUrl,
      mockup_image_url: product.mockup_image_url ?? imageUrl,
      metadata: {
        ...metadata,
        gallery,
      },
    },
  })
  const updatedProduct = Array.isArray(updated) ? updated[0] : updated

  return res.status(201).json({
    url: imageUrl,
    gallery,
    product: updatedProduct ? normalizeProduct(updatedProduct) : null,
  })
}
