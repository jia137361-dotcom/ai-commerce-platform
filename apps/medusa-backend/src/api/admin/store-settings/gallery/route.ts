import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { randomBytes } from "node:crypto"
import { resolveCurrentStore } from "../../../../lib/store-context"
import {
  STORE_GALLERY_MAX_ITEMS,
  buildStoreMediaPublicUrl,
  resolveStoreMediaBaseUrl,
  resolveStoreMediaUploadDir,
  validateStoreImageUpload,
} from "../../../../lib/store-settings-media"
import { getStoreSettingsRecord, mergeStoreSettingsMetadata } from "../../../../lib/store-settings-update"
import { sendError } from "../../../_helpers/store-core"

type GalleryBody = {
  file_base64?: string
  content_type?: string
}

const readGalleryUrls = (metadata: Record<string, unknown>) =>
  Array.isArray(metadata.gallery_urls)
    ? metadata.gallery_urls.filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
    : []

export const POST = async (req: MedusaRequest<GalleryBody>, res: MedusaResponse) => {
  const body = req.body ?? {}
  const fileBase64 = typeof body.file_base64 === "string" ? body.file_base64.trim() : ""
  const contentType = typeof body.content_type === "string" ? body.content_type.trim().toLowerCase() : ""

  const validation = validateStoreImageUpload("gallery", fileBase64, contentType)
  if (!validation.ok) {
    return sendError(res, 400, "VALIDATION_ERROR", (validation as any).message ?? "Invalid image")
  }

  const { store_id: storeId } = resolveCurrentStore(req)
  const { settings } = await getStoreSettingsRecord(req)
  const currentUrls = readGalleryUrls((settings?.metadata ?? {}) as Record<string, unknown>)
  if (currentUrls.length >= STORE_GALLERY_MAX_ITEMS) {
    return sendError(res, 400, "VALIDATION_ERROR", `Gallery supports up to ${STORE_GALLERY_MAX_ITEMS} images`)
  }

  const ext = contentType.includes("png") ? "png" : "jpg"
  const fileName = `${storeId}-gallery-${randomBytes(6).toString("hex")}.${ext}`
  const uploadDir = resolveStoreMediaUploadDir("gallery")
  await mkdir(uploadDir, { recursive: true })
  await writeFile(path.join(uploadDir, fileName), validation.buffer)

  const imageUrl = buildStoreMediaPublicUrl("gallery", fileName, resolveStoreMediaBaseUrl(req))
  const updated = await mergeStoreSettingsMetadata(req, (metadata) => ({
    ...metadata,
    gallery_urls: [...readGalleryUrls(metadata), imageUrl],
  }))

  return res.status(201).json({
    url: imageUrl,
    gallery_urls: readGalleryUrls((updated.metadata ?? {}) as Record<string, unknown>),
  })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = (req.body ?? {}) as { url?: string }
  const target = typeof body.url === "string" ? body.url.trim() : ""
  if (!target) {
    return sendError(res, 400, "VALIDATION_ERROR", "url is required")
  }

  const updated = await mergeStoreSettingsMetadata(req, (metadata) => ({
    ...metadata,
    gallery_urls: readGalleryUrls(metadata).filter((url) => url !== target),
  }))

  return res.json({
    deleted: true,
    gallery_urls: readGalleryUrls((updated.metadata ?? {}) as Record<string, unknown>),
  })
}
