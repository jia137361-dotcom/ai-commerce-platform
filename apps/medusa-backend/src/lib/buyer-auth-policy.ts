export const BUYER_AUTH_POLICY = {
  passwordMinLength: 8,
  verificationCodeTtlMs: Number(process.env.BUYER_EMAIL_VERIFICATION_TTL_MS || 15 * 60 * 1000),
  resetCodeTtlMs: Number(process.env.BUYER_PASSWORD_RESET_TTL_MS || 30 * 60 * 1000),
  resendCooldownMs: Number(process.env.BUYER_AUTH_RESEND_COOLDOWN_MS || 60 * 1000),
  hourlyWindowMs: Number(process.env.BUYER_AUTH_RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000),
  maxVerificationSendsPerWindow: Number(process.env.BUYER_EMAIL_VERIFICATION_MAX_PER_HOUR || 5),
  maxPasswordResetSendsPerWindow: Number(process.env.BUYER_PASSWORD_RESET_MAX_PER_HOUR || 5),
}

export const normalizeBuyerEmail = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : ""

export const isValidBuyerEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

export const isValidBuyerPassword = (value: unknown) =>
  typeof value === "string" && value.length >= BUYER_AUTH_POLICY.passwordMinLength

export const authCodePepper = () =>
  process.env.BUYER_AUTH_CODE_PEPPER ||
  process.env.JWT_SECRET ||
  "development-jwt-secret"

export type RateLimitDecision = {
  allowed: boolean
  retryAfterMs?: number
  windowStart: string
  count: number
}

export function evaluateMetadataRateLimit(
  metadata: Record<string, unknown>,
  keys: {
    lastSentAt: string
    windowStartedAt: string
    windowCount: string
  },
  maxPerWindow: number,
  nowMs = Date.now()
): RateLimitDecision {
  const lastSentAt = typeof metadata[keys.lastSentAt] === "string" ? Date.parse(metadata[keys.lastSentAt] as string) : 0
  if (lastSentAt && nowMs - lastSentAt < BUYER_AUTH_POLICY.resendCooldownMs) {
    return {
      allowed: false,
      retryAfterMs: BUYER_AUTH_POLICY.resendCooldownMs - (nowMs - lastSentAt),
      windowStart: typeof metadata[keys.windowStartedAt] === "string" ? metadata[keys.windowStartedAt] as string : new Date(nowMs).toISOString(),
      count: Number(metadata[keys.windowCount] ?? 0) || 0,
    }
  }

  const existingWindowStart = typeof metadata[keys.windowStartedAt] === "string"
    ? Date.parse(metadata[keys.windowStartedAt] as string)
    : 0
  const insideWindow = existingWindowStart && nowMs - existingWindowStart < BUYER_AUTH_POLICY.hourlyWindowMs
  const count = insideWindow ? Number(metadata[keys.windowCount] ?? 0) || 0 : 0
  if (count >= maxPerWindow) {
    return {
      allowed: false,
      retryAfterMs: BUYER_AUTH_POLICY.hourlyWindowMs - (nowMs - existingWindowStart),
      windowStart: new Date(existingWindowStart).toISOString(),
      count,
    }
  }

  return {
    allowed: true,
    windowStart: insideWindow ? new Date(existingWindowStart).toISOString() : new Date(nowMs).toISOString(),
    count: count + 1,
  }
}
