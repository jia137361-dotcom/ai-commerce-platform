export type S2bdiyConfig = {
  apiBaseUrl: string
  appKey: string
  appSecret: string
  platformId: number
}

export function getS2bdiyConfig(): S2bdiyConfig | null {
  const apiBaseUrl = process.env.S2BDIY_API_BASE_URL?.replace(/\/$/, "")
  const appKey = process.env.S2BDIY_APP_KEY
  const appSecret = process.env.S2BDIY_APP_SECRET
  if (!apiBaseUrl || !appKey || !appSecret) {
    return null
  }
  return {
    apiBaseUrl,
    appKey,
    appSecret,
    platformId: Number(process.env.S2BDIY_PLATFORM_ID || "99"),
  }
}

export function requireS2bdiyConfig(): S2bdiyConfig {
  const config = getS2bdiyConfig()
  if (!config) {
    throw new Error(
      "S2BDIY is not configured. Set S2BDIY_API_BASE_URL, S2BDIY_APP_KEY, S2BDIY_APP_SECRET in .env"
    )
  }
  return config
}
