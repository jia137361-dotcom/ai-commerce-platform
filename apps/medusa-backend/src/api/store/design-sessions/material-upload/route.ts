/**
 * Upload a design material (image) to S2BDIY and return material_id.
 *
 * POST /store/design-sessions/material-upload
 *
 * Accepts:
 *   - JSON body: { "image_base64": "data:image/png;base64,..." or raw base64 }
 *   - Raw binary body (Content-Type: image/png, image/jpeg, etc.)
 *
 * Proxies to S2BDIY: POST /open/v1/material/uploadMaterial
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { sendError } from "../../../_helpers/store-core"
import { getS2bdiyConfig } from "../../../../modules/suppliers/s2bdiy/config"
import { getS2bdiyAccessToken } from "../../../../modules/suppliers/s2bdiy/s2bdiy-auth"

const S2BDIY_UPLOAD_TIMEOUT_MS = 30_000

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const config = getS2bdiyConfig()
  if (!config) {
    return sendError(res, 503, "SUPPLIER_UNAVAILABLE", "Design service is not configured")
  }

  try {
    let imageBuffer: Buffer | null = null
    let fileName = "design.png"
    let mimeType = "image/png"

    const contentType = (req.headers["content-type"] ?? "").toLowerCase()

    if (contentType.includes("application/json")) {
      // JSON body with base64 image
      const body = (req.body ?? {}) as {
        image_base64?: string
        filename?: string
        material_id?: string | number
      }

      // If material_id is provided, just return it (already uploaded)
      if (body.material_id) {
        return res.status(200).json({
          material_id: Number(body.material_id),
          material_url: null,
          name: body.filename ?? "existing",
          reused: true,
        })
      }

      if (!body.image_base64) {
        return sendError(res, 400, "MISSING_FIELDS", "image_base64 is required")
      }

      // Handle data URI or raw base64
      const base64Str = body.image_base64.includes(",")
        ? body.image_base64.split(",")[1]
        : body.image_base64

      imageBuffer = Buffer.from(base64Str, "base64")
      if (body.filename) fileName = body.filename

      // Detect mime from data URI
      if (body.image_base64.includes("data:")) {
        const mimeMatch = body.image_base64.match(/^data:([^;]+)/)
        if (mimeMatch) mimeType = mimeMatch[1]
      }
    } else if (contentType.startsWith("image/")) {
      // Raw binary body
      const chunks: Buffer[] = []
      for await (const chunk of req as unknown as AsyncIterable<Buffer>) {
        chunks.push(chunk)
      }
      if (!chunks.length) {
        return sendError(res, 400, "MISSING_FIELDS", "Empty image body")
      }
      imageBuffer = Buffer.concat(chunks)
      mimeType = contentType

      // Extract filename from Content-Disposition if present
      const disposition = req.headers["content-disposition"]
      if (disposition) {
        const nameMatch = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        if (nameMatch) fileName = nameMatch[1].replace(/['"]/g, "")
      }
    } else {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "Use application/json with image_base64 or raw image body"
      )
    }

    // Validate
    if (!imageBuffer || imageBuffer.length === 0) {
      return sendError(res, 400, "VALIDATION_ERROR", "Could not read image data")
    }

    if (imageBuffer.length > 50 * 1024 * 1024) {
      return sendError(res, 400, "VALIDATION_ERROR", "Image must be under 50MB")
    }

    // Get S2BDIY token
    const token = await getS2bdiyAccessToken(config)
    const baseUrl = config.apiBaseUrl.replace(/\/$/, "")

    // Build form data for S2BDIY
    const formData = new FormData()
    const blob = new Blob([new Uint8Array(imageBuffer)], { type: mimeType })
    formData.append("image", blob, fileName)

    // Upload to S2BDIY with timeout
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), S2BDIY_UPLOAD_TIMEOUT_MS)

    let resp: Response
    try {
      resp = await fetch(`${baseUrl}/open/v1/material/uploadMaterial`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }

    const result = (await resp.json()) as {
      status: string
      status_code: number
      msg?: string
      data?: { id: number; name: string; image_url: string }
    }

    if (!resp.ok || result.status !== "success" || !result.data?.id) {
      return sendError(res, 502, "EXTERNAL_SERVICE_ERROR", result.msg ?? `S2BDIY returned ${resp.status}`)
    }

    return res.status(200).json({
      material_id: result.data.id,
      material_url: result.data.image_url,
      name: result.data.name,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[material-upload] failed:", message)
    return sendError(res, 500, "EXTERNAL_SERVICE_ERROR", `Upload failed: ${message}`)
  }
}
