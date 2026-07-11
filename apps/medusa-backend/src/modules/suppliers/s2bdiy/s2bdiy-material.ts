import type { S2bdiyClient } from "./s2bdiy-client"
import { S2bdiyApiError } from "./s2bdiy-client"
import { getAccessToken } from "./s2bdiy-auth"

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
  const result = data as UploadMaterialResult
  const id = result.id ?? (data as Record<string, unknown>).id as string | number
  if (id === undefined || id === null) throw new Error(`uploadMaterial missing id: ${JSON.stringify(data)}`)
  return { id, name: result.name, image_url: result.image_url }
}
export async function fetchPrintFileBuffer(printFileUrl: string): Promise<{ buffer: Buffer; filename: string }> {
  const res = await fetch(printFileUrl)
  if (!res.ok) throw new Error(`Failed to fetch print file: HTTP ${res.status} ${printFileUrl}`)
  const arrayBuffer = await res.arrayBuffer()
  const urlPath = new URL(printFileUrl).pathname
  const filename = urlPath.split("/").pop() || "print.png"
  return { buffer: Buffer.from(arrayBuffer), filename }
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
