export const BUYER_AUTH_POLICY = {
  passwordMinLength: 8,
  verificationCodeTtlMs: Number(process.env.BUYER_EMAIL_VERIFICATION_TTL_MS || 15 * 60 * 1000),
  resetCodeTtlMs: Number(process.env.BUYER_PASSWORD_RESET_TTL_MS || 30 * 60 * 1000),
  loginOtpTtlMs: Number(process.env.BUYER_LOGIN_OTP_TTL_MS || 15 * 60 * 1000),
  resendCooldownMs: Number(process.env.BUYER_AUTH_RESEND_COOLDOWN_MS || 60 * 1000),
  hourlyWindowMs: Number(process.env.BUYER_AUTH_RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000),
  maxVerificationSendsPerWindow: Number(process.env.BUYER_EMAIL_VERIFICATION_MAX_PER_HOUR || 5),
  maxPasswordResetSendsPerWindow: Number(process.env.BUYER_PASSWORD_RESET_MAX_PER_HOUR || 5),
  maxLoginOtpSendsPerWindow: Number(process.env.BUYER_LOGIN_OTP_MAX_PER_HOUR || 5),
  /** Short-lived session when "Remember me" is off (jsonwebtoken duration). */
  sessionTtlShort: (process.env.BUYER_SESSION_TTL_SHORT || "7d").trim() || "7d",
  /** Extended session when "Remember me" is on. */
  sessionTtlRemember: (process.env.BUYER_SESSION_TTL_REMEMBER || "30d").trim() || "30d",
}

/** Domains allowed for buyer login/register (Gmail + Apple ecosystem). */
export const BUYER_LOGIN_ALLOWED_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "privaterelay.appleid.com",
] as const

const DEFAULT_TEST_EMAILS = ["1355026750@qq.com"]

export type AuthEmailDeliveryMode = "local" | "resend"

export const getAuthEmailDeliveryMode = (): AuthEmailDeliveryMode => {
  const rawMode = (process.env.AUTH_EMAIL_DELIVERY_MODE || "").trim().toLowerCase()
  if (rawMode === "resend" || rawMode === "local") return rawMode
  return process.env.NODE_ENV === "production" ? "resend" : "local"
}

export const isAuthDevCodeEnabled = () =>
  process.env.NODE_ENV !== "production" && process.env.AUTH_DEV_CODE_ENABLED === "true"

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

export const getBuyerAuthTestEmails = (): string[] => {
  const raw = process.env.BUYER_AUTH_TEST_EMAILS
  const listed = (raw ?? DEFAULT_TEST_EMAILS.join(","))
    .split(",")
    .map((entry) => normalizeBuyerEmail(entry))
    .filter(Boolean)
  return Array.from(new Set(listed.length ? listed : DEFAULT_TEST_EMAILS.map(normalizeBuyerEmail)))
}

export const isBuyerAuthTestEmail = (email: string) => {
  const normalized = normalizeBuyerEmail(email)
  return Boolean(normalized) && getBuyerAuthTestEmails().includes(normalized)
}

export const getBuyerEmailDomain = (email: string) => {
  const normalized = normalizeBuyerEmail(email)
  const at = normalized.lastIndexOf("@")
  if (at < 0) return ""
  return normalized.slice(at + 1)
}

/** Allowlisted provider domains or configured test emails (e.g. QQ bootstrap). */
export const isAllowedBuyerLoginEmail = (email: string) => {
  const normalized = normalizeBuyerEmail(email)
  if (!isValidBuyerEmail(normalized)) return false
  if (isBuyerAuthTestEmail(normalized)) return true
  const domain = getBuyerEmailDomain(normalized)
  return (BUYER_LOGIN_ALLOWED_DOMAINS as readonly string[]).includes(domain)
}

export const buyerLoginEmailDeniedMessage =
  "Please use a Gmail or Apple account email to continue."

export const resolveBuyerSessionTtl = (rememberMe: boolean) =>
  rememberMe ? BUYER_AUTH_POLICY.sessionTtlRemember : BUYER_AUTH_POLICY.sessionTtlShort

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
