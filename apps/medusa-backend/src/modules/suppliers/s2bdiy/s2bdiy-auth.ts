import type { S2bdiyConfig } from "./config"

type TokenCache = { token: string; expiresAt: number }
let memoryCache: TokenCache | null = null
const TOKEN_TTL_MS = 2.5 * 24 * 60 * 60 * 1000

export function clearS2bdiyTokenCache(): void { memoryCache = null }
export const clearTokenCache = clearS2bdiyTokenCache

export async function getS2bdiyAccessToken(config: S2bdiyConfig, forceRefresh = false): Promise<string> {
  const now = Date.now()
  if (!forceRefresh && memoryCache && memoryCache.expiresAt > now) return memoryCache.token

  const url = `${config.apiBaseUrl}/open/v1/accessToken`
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ app_key: config.appKey, app_secret: config.appSecret }),
  })

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) throw new Error(`S2BDIY accessToken failed HTTP ${res.status}: ${JSON.stringify(body)}`)

  const data = (body.data ?? body) as Record<string, unknown>
  const token =
    (typeof data.token === "string" && data.token) ||
    (typeof body.token === "string" && body.token) ||
    (typeof data.access_token === "string" && data.access_token) ||
    null
  if (!token) throw new Error(`S2BDIY accessToken missing token in response: ${JSON.stringify(body)}`)

  memoryCache = { token, expiresAt: now + TOKEN_TTL_MS }
  return token
}

/** Simple env-based auth (backward compat) */
export async function getAccessToken(): Promise<string> {
  const apiBaseUrl = process.env.S2BDIY_API_BASE_URL?.replace(/\/$/, "")
  const appKey = process.env.S2BDIY_APP_KEY
  const appSecret = process.env.S2BDIY_APP_SECRET
  if (!apiBaseUrl || !appKey || !appSecret) {
    throw new Error("S2BDIY credentials not configured")
  }
  return getS2bdiyAccessToken({ apiBaseUrl, appKey, appSecret, platformId: Number(process.env.S2BDIY_PLATFORM_ID || "99") })
}
