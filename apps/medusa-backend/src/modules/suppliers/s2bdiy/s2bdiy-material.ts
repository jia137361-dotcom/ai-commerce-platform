import { getAccessToken } from "./s2bdiy-auth"
import { S2bDiyError } from "./s2bdiy-client"

const baseUrl = () => process.env.S2BDIY_API_BASE_URL

export interface S2bMaterialResponse {
  id: number
  name: string
  image_url: string
}

export async function uploadMaterial(
  imageBuffer: Buffer,
  fileName: string
): Promise<S2bMaterialResponse> {
  const token = await getAccessToken()
  const url = `${baseUrl()}/open/v1/material/uploadMaterial`

  const formData = new FormData()
  const blob = new Blob([new Uint8Array(imageBuffer)])
  formData.append("image", blob, fileName)

  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new S2bDiyError(
      `S2BDIY uploadMaterial failed: ${response.status}`,
      response.status,
      text
    )
  }

  return response.json() as Promise<S2bMaterialResponse>
}
