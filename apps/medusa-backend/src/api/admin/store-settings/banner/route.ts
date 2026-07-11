import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { randomBytes } from "node:crypto"
import { resolveCurrentStore } from "../../../../lib/store-context"
import {
  buildStoreMediaPublicUrl,
  resolveStoreMediaBaseUrl,
  resolveStoreMediaUploadDir,
  validateStoreImageUpload,
} from "../../../../lib/store-settings-media"
import { mergeStoreSettingsMetadata } from "../../../../lib/store-settings-update"
import { sendError } from "../../../_helpers/store-core"

type BannerBody = {
  file_base64?: string
  content_type?: string
}

export const POST = async (req: MedusaRequest<BannerBody>, res: MedusaResponse) => {
  const body = req.body ?? {}
  const fileBase64 = typeof body.file_base64 === "string" ? body.file_base64.trim() : ""
  const contentType = typeof body.content_type === "string" ? body.content_type.trim().toLowerCase() : ""

  const validation = validateStoreImageUpload("banner", fileBase64, contentType)
  if (!validation.ok) {
    return sendError(res, 400, "VALIDATION_ERROR", (validation as any).message ?? "Invalid image")
  }

  const { store_id: storeId } = resolveCurrentStore(req)
  const ext = contentType.includes("png") ? "png" : "jpg"
  const fileName = `${storeId}-banner-${randomBytes(6).toString("hex")}.${ext}`
  const uploadDir = resolveStoreMediaUploadDir("banner")
  await mkdir(uploadDir, { recursive: true })
  await writeFile(path.join(uploadDir, fileName), validation.buffer)

  const bannerUrl = buildStoreMediaPublicUrl("banner", fileName, resolveStoreMediaBaseUrl(req))
  const updated = await mergeStoreSettingsMetadata(req, (metadata) => ({
    ...metadata,
    banner_url: bannerUrl,
  }))

  return res.json({ banner_url: bannerUrl, settings: updated })
}
