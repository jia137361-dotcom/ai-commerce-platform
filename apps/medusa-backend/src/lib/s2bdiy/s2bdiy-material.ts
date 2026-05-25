import type { S2bdiyClient } from "./s2bdiy-client"

export type UploadMaterialResult = {
  id: number | string
  name?: string
  image_url?: string
}

export async function uploadMaterial(
  client: S2bdiyClient,
  input: { buffer: Buffer; filename: string; name?: string }
): Promise<UploadMaterialResult> {
  const form = new FormData()
  const bytes = new Uint8Array(input.buffer)
  const blob = new Blob([bytes], { type: guessMime(input.filename) })
  form.append("image", blob, input.filename)
  if (input.name) {
    form.append("name", input.name)
  }

  const data = await client.request<UploadMaterialResult>("/open/v1/material/uploadMaterial", {
    method: "POST",
    formData: form,
  })

  const id = (data as UploadMaterialResult).id ?? (data as Record<string, unknown>).id
  if (id === undefined || id === null) {
    throw new Error(`uploadMaterial missing id: ${JSON.stringify(data)}`)
  }
  return {
    id,
    name: (data as UploadMaterialResult).name,
    image_url: (data as UploadMaterialResult).image_url,
  }
}

function guessMime(filename: string): string {
  const lower = filename.toLowerCase()
  if (lower.endsWith(".png")) return "image/png"
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg"
  return "application/octet-stream"
}

export async function fetchPrintFileBuffer(printFileUrl: string): Promise<{ buffer: Buffer; filename: string }> {
  const res = await fetch(printFileUrl)
  if (!res.ok) {
    throw new Error(`Failed to fetch print file: HTTP ${res.status} ${printFileUrl}`)
  }
  const arrayBuffer = await res.arrayBuffer()
  const urlPath = new URL(printFileUrl).pathname
  const filename = urlPath.split("/").pop() || "print.png"
  return { buffer: Buffer.from(arrayBuffer), filename }
}
