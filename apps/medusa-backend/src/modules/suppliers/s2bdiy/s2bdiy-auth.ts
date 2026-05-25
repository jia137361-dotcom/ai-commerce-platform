let cachedToken: string | null = null
let expiresAt: number = 0

interface TokenResponse {
  access_token: string
  expires_in: number
}

export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < expiresAt - 60_000) {
    return cachedToken
  }

  const appKey = process.env.S2BDIY_APP_KEY
  const appSecret = process.env.S2BDIY_APP_SECRET
  const baseUrl = process.env.S2BDIY_API_BASE_URL

  if (!appKey || !appSecret || !baseUrl) {
    throw new Error("S2BDIY credentials not configured (S2BDIY_APP_KEY, S2BDIY_APP_SECRET, S2BDIY_API_BASE_URL)")
  }

  const response = await fetch(`${baseUrl}/open/v1/accessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_key: appKey,
      app_secret: appSecret,
    }),
  })

  if (!response.ok) {
    throw new Error(`S2BDIY auth failed: ${response.status} ${await response.text()}`)
  }

  const data: TokenResponse = await response.json()
  cachedToken = data.access_token
  expiresAt = Date.now() + (data.expires_in ?? 3600) * 1000

  return cachedToken
}

export function clearTokenCache(): void {
  cachedToken = null
  expiresAt = 0
}
