import type { S2bdiyClient } from "./s2bdiy-client"
import { S2bdiyApiError } from "./s2bdiy-client"
import { getAccessToken } from "./s2bdiy-auth"
import fs from "node:fs/promises"
import path from "node:path"

export type UploadMaterialResult = { id: number | string; name?: string; image_url?: string }
export interface S2bMaterialResponse { id: number; name: string; image_url: string }

function guessMime(filename: string): string {
  const lower = filename.toLowerCase()
  if (lower.endsWith(".png")) return "image/png"
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg"
  return "application/octet-stream"
}

// ---- Client-based (Dev2 compat) ----
export async function uploadMaterialClient(
  client: S2bdiyClient,
  input: { buffer: Buffer; filename: string; name?: string }
): Promise<UploadMaterialResult> {
  const form = new FormData()
  const bytes = new Uint8Array(input.buffer)
  const blob = new Blob([bytes], { type: guessMime(input.filename) })
  form.append("image", blob, input.filename)
  if (input.name) form.append("name", input.name)
  const data = await client.request<UploadMaterialResult>("/open/v1/material/uploadMaterial", { method: "POST", formData: form })
  const id = (data as UploadMaterialResult).id ?? (data as Record<string, unknown>).id
  if (id === undefined || id === null) throw new Error(`uploadMaterial missing id: ${JSON.stringify(data)}`)
  return { id, name: (data as UploadMaterialResult).name, image_url: (data as UploadMaterialResult).image_url }
}
export async function fetchPrintFileBuffer(printFileUrl: string): Promise<{ buffer: Buffer; filename: string }> {
  const parsed = new URL(printFileUrl)
  const filename = path.basename(parsed.pathname) || "print.png"
  const localBuffer = await readLocalAiWorkerStaticFile(parsed, filename)
  if (localBuffer) return { buffer: localBuffer, filename }

  let res: Response
  try {
    res = await fetch(printFileUrl)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Failed to fetch print file from ${printFileUrl}: ${detail}. If this is a local AI worker URL, start the real AI worker on port 8001 or keep the generated file under apps/ai-worker/var/uploads.`
    )
  }
  if (!res.ok) throw new Error(`Failed to fetch print file: HTTP ${res.status} ${printFileUrl}`)
  const arrayBuffer = await res.arrayBuffer()
  return { buffer: Buffer.from(arrayBuffer), filename }
}

async function readLocalAiWorkerStaticFile(parsed: URL, filename: string): Promise<Buffer | null> {
  if (!["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) return null
  if (!parsed.pathname.startsWith("/static/")) return null

  const uploadDir = process.env.AI_WORKER_UPLOAD_DIR
  const candidates = [
    ...(uploadDir
      ? [
          path.isAbsolute(uploadDir)
            ? uploadDir
            : path.resolve(process.cwd(), "../ai-worker", uploadDir),
          path.resolve(process.cwd(), "apps/ai-worker", uploadDir),
        ]
      : []),
    path.resolve(process.cwd(), "../ai-worker/var/uploads"),
    path.resolve(process.cwd(), "apps/ai-worker/var/uploads"),
  ]

  for (const dir of candidates) {
    try {
      return await fs.readFile(path.join(dir, filename))
    } catch {
      // Try the next common local workspace layout.
    }
  }

  return null
}

// ---- Standalone (backward compat) ----
export async function uploadMaterial(imageBuffer: Buffer, fileName: string): Promise<S2bMaterialResponse> {
  const token = await getAccessToken()
  const baseUrl = process.env.S2BDIY_API_BASE_URL?.replace(/\/$/, "")
  const formData = new FormData()
  formData.append("image", new Blob([new Uint8Array(imageBuffer)]), fileName)
  const response = await fetch(`${baseUrl}/open/v1/material/uploadMaterial`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData })
  if (!response.ok) { const text = await response.text(); throw new S2bdiyApiError(`uploadMaterial failed: ${response.status}`, response.status, text) }
  return response.json() as Promise<S2bMaterialResponse>
}
