import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { randomBytes } from "node:crypto"
import { resolveCurrentStore } from "../../../../lib/store-context"
import {
  buildLogoPublicUrl,
  resolveLogoUploadDir,
  validateLogoUpload,
} from "../../../../lib/store-settings-logo"
import { getStoreCoreService, sendError } from "../../../_helpers/store-core"

type LogoBody = {
  file_base64?: string
  content_type?: string
}

export const POST = async (req: MedusaRequest<LogoBody>, res: MedusaResponse) => {
  const body = req.body ?? {}
  const fileBase64 = typeof body.file_base64 === "string" ? body.file_base64.trim() : ""
  const contentType = typeof body.content_type === "string" ? body.content_type.trim().toLowerCase() : ""

  const validation = validateLogoUpload(fileBase64, contentType)
  if (!validation.ok) {
    return sendError(res, 400, "VALIDATION_ERROR", validation.message)
  }

  const { store_id: storeId } = resolveCurrentStore(req)
  const storeCoreService = getStoreCoreService(req)
  const ext = contentType.includes("png") ? "png" : "jpg"
  const fileName = `${storeId}-${randomBytes(6).toString("hex")}.${ext}`
  const uploadDir = resolveLogoUploadDir()
  await mkdir(uploadDir, { recursive: true })
  await writeFile(path.join(uploadDir, fileName), validation.buffer)

  const logoUrl = buildLogoPublicUrl(fileName)

  const existing = await storeCoreService.listStoreSettings({ store_id: storeId })
  if (existing.length) {
    const [updated] = await storeCoreService.updateStoreSettings({
      selector: { id: existing[0].id, store_id: storeId },
      data: { logo_url: logoUrl },
    })
    return res.json({ logo_url: updated.logo_url })
  }

  const created = await storeCoreService.createStoreSettings({
    store_id: storeId,
    brand_name: null,
    logo_url: logoUrl,
    support_email: null,
    seo_title: null,
    seo_description: null,
    metadata: {},
  })

  return res.status(201).json({ logo_url: created.logo_url })
}
