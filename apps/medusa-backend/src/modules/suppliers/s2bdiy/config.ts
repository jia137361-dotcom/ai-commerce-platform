export type S2bdiyConfig = {
  apiBaseUrl: string
  appKey: string
  appSecret: string
  platformId: number
}

const isPlaceholderSecret = (value?: string) =>
  !value ||
  value.includes("replace_me") ||
  value.includes("replace") ||
  value.includes("<") ||
  value.includes(">")

export function getS2bdiyConfig(): S2bdiyConfig | null {
  const apiBaseUrl = (
    process.env.S2BDIY_BASE_URL ||
    process.env.S2BDIY_API_BASE_URL
  )?.replace(/\/$/, "")
  const appKey = process.env.S2BDIY_APP_KEY
  const appSecret = process.env.S2BDIY_APP_SECRET
  if (!apiBaseUrl || !appKey || !appSecret || isPlaceholderSecret(appSecret)) return null
  return { apiBaseUrl, appKey, appSecret, platformId: Number(process.env.S2BDIY_PLATFORM_ID || "99") }
}

export function isS2bdiyMockMode() {
  return process.env.S2BDIY_MOCK_MODE === "true"
}

export function isS2bdiyEnabled() {
  if (process.env.S2BDIY_ENABLED === "false") return false
  if (isS2bdiyMockMode()) return true
  return getS2bdiyConfig() !== null
}

export function requireS2bdiyConfig(): S2bdiyConfig {
  if (isS2bdiyMockMode()) {
    return {
      apiBaseUrl: process.env.S2BDIY_API_BASE_URL?.replace(/\/$/, "") || "https://mock.s2bdiy.local",
      appKey: process.env.S2BDIY_APP_KEY || "mock_key",
      appSecret: process.env.S2BDIY_APP_SECRET || "mock_secret",
      platformId: Number(process.env.S2BDIY_PLATFORM_ID || "99"),
    }
  }
  const config = getS2bdiyConfig()
  if (!config) {
    throw new Error(
      "S2BDIY is not configured. Set S2BDIY_API_BASE_URL, S2BDIY_APP_KEY, S2BDIY_APP_SECRET, or enable S2BDIY_MOCK_MODE=true"
    )
  }
  return config
}
