import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { readFile } from "fs/promises"
import path from "path"
import { resolveLogoUploadDir } from "../../../../lib/store-settings-logo"

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const filename = req.params.filename as string
  if (!filename || filename.includes("..") || filename.includes("/")) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid filename" } })
  }

  const filePath = path.join(resolveLogoUploadDir(), filename)
  try {
    const data = await readFile(filePath)
    const ext = filename.split(".").pop()?.toLowerCase() ?? "png"
    res.setHeader("Content-Type", MIME[ext] ?? "application/octet-stream")
    res.setHeader("Cache-Control", "public, max-age=86400")
    return res.send(data)
  } catch {
    return res.status(404).json({ error: { code: "VALIDATION_ERROR", message: "File not found" } })
  }
}

export const AUTHENTICATE = false
