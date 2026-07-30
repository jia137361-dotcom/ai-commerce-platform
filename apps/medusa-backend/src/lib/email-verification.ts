import { createHash, randomInt, randomUUID, timingSafeEqual } from "node:crypto"
import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import {
  BUYER_AUTH_POLICY,
  authCodePepper,
  evaluateMetadataRateLimit,
  isAuthDevCodeEnabled,
} from "./buyer-auth-policy"
import { sendBuyerEmailVerificationCode } from "./email"

const hashCode = (email: string, code: string) =>
  createHash("sha256")
    .update(`${authCodePepper()}:${email.trim().toLowerCase()}:${code}`)
    .digest("hex")

const secureCompare = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

const emailVerificationSendLocks = new Map<string, Promise<unknown>>()

export const formatVerificationCode = (value: number) =>
  Math.trunc(value).toString().padStart(6, "0").slice(-6)

const generateVerificationCode = () => formatVerificationCode(randomInt(0, 1_000_000))

const maskEmail = (email: string) => {
  const [name, domain] = email.split("@")
  if (!domain) return "***"
  const prefix = name.slice(0, 2)
  return `${prefix}${"*".repeat(Math.max(2, name.length - 2))}@${domain}`
}

const logVerificationDiagnostic = (
  event: string,
  details: {
    customerId: string
    email: string
    generationId?: string
    providerMessageId?: string
    hashExists?: boolean
    expiresAt?: string
  }
) => {
  console.info("[buyer-email-verification]", {
    event,
    customerId: details.customerId,
    maskedEmail: maskEmail(details.email),
    generationId: details.generationId,
    providerMessageId: details.providerMessageId,
    hashExists: details.hashExists,
    expiresAt: details.expiresAt,
    now: new Date().toISOString(),
  })
}

export const isEmailVerified = (metadata?: Record<string, unknown> | null) =>
  typeof metadata?.email_verified_at === "string" && metadata.email_verified_at.length > 0

export const readEmailVerificationStatus = (metadata?: Record<string, unknown> | null) => ({
  verified: isEmailVerified(metadata),
  verifiedAt: typeof metadata?.email_verified_at === "string" ? metadata.email_verified_at : null,
})

export async function sendCustomerEmailVerification(
  container: MedusaContainer,
  customerId: string
) {
  const previousLock = emailVerificationSendLocks.get(customerId) ?? Promise.resolve()
  const nextLock = previousLock
    .catch(() => undefined)
    .then(() => sendCustomerEmailVerificationUnlocked(container, customerId))
  emailVerificationSendLocks.set(customerId, nextLock)
  try {
    return await nextLock
  } finally {
    if (emailVerificationSendLocks.get(customerId) === nextLock) {
      emailVerificationSendLocks.delete(customerId)
    }
  }
}

async function sendCustomerEmailVerificationUnlocked(
  container: MedusaContainer,
  customerId: string
) {
  const customerModule = container.resolve(Modules.CUSTOMER)
  const customer = await customerModule.retrieveCustomer(customerId)
  const email = typeof customer.email === "string" ? customer.email.trim().toLowerCase() : ""
  if (!email || !email.includes("@")) {
    throw new Error("A valid account email is required before verification")
  }

  const code = generateVerificationCode()
  const generationId = randomUUID()
  const nowMs = Date.now()
  const expiresAt = new Date(nowMs + BUYER_AUTH_POLICY.verificationCodeTtlMs).toISOString()
  const previousMetadata = customer.metadata ?? {}
  const limit = evaluateMetadataRateLimit(
    previousMetadata,
    {
      lastSentAt: "email_verification_last_sent_at",
      windowStartedAt: "email_verification_window_started_at",
      windowCount: "email_verification_window_count",
    },
    BUYER_AUTH_POLICY.maxVerificationSendsPerWindow,
    nowMs
  )

  if (!limit.allowed) {
    const seconds = Math.max(1, Math.ceil((limit.retryAfterMs ?? BUYER_AUTH_POLICY.resendCooldownMs) / 1000))
    throw new Error(`Please wait ${seconds} seconds before requesting another verification code.`)
  }

  const metadata = {
    ...previousMetadata,
    email_verification_code_hash: hashCode(email, code),
    email_verification_expires_at: expiresAt,
    email_verification_sent_to: email,
    email_verification_generation_id: generationId,
    email_verification_requested_at: new Date(nowMs).toISOString(),
    email_verification_last_sent_at: new Date(nowMs).toISOString(),
    email_verification_window_started_at: limit.windowStart,
    email_verification_window_count: limit.count,
  }

  await customerModule.updateCustomers(customerId, { metadata })
  logVerificationDiagnostic("metadata_saved", {
    customerId,
    email,
    generationId,
    hashExists: true,
    expiresAt,
  })
  const emailResult = await sendBuyerEmailVerificationCode({
    to: email,
    code,
    expiresInMinutes: Math.max(1, Math.round(BUYER_AUTH_POLICY.verificationCodeTtlMs / 60_000)),
    idempotencyKey: createHash("sha256")
      .update(`buyer-email-verification:${customerId}:${email}:${expiresAt}`)
      .digest("hex"),
  })
  if (!emailResult.success) {
    await customerModule.updateCustomers(customerId, { metadata: previousMetadata })
    logVerificationDiagnostic("provider_failed_metadata_rolled_back", {
      customerId,
      email,
      generationId,
      hashExists: false,
      expiresAt,
    })
    throw new Error("We couldn't send the email right now. Please try again.")
  }

  const latestCustomer = await customerModule.retrieveCustomer(customerId)
  const latestMetadata = latestCustomer.metadata ?? {}
  if (latestMetadata.email_verification_generation_id !== generationId) {
    logVerificationDiagnostic("stale_generation_after_provider_accept", {
      customerId,
      email,
      generationId,
      providerMessageId: emailResult.id,
      hashExists: typeof latestMetadata.email_verification_code_hash === "string",
      expiresAt,
    })
    throw new Error("A newer verification code was requested. Use the latest code.")
  }

  await customerModule.updateCustomers(customerId, {
    metadata: {
      ...latestMetadata,
      email_verification_provider_message_id: emailResult.id ?? null,
    },
  })
  logVerificationDiagnostic("provider_accepted", {
    customerId,
    email,
    generationId,
    providerMessageId: emailResult.id,
    hashExists: true,
    expiresAt,
  })

  return {
    email,
    expiresAt,
    generationId,
    ...(isAuthDevCodeEnabled() ? { devCode: code } : {}),
  }
}

export async function confirmCustomerEmailVerification(
  container: MedusaContainer,
  customerId: string,
  code: string
) {
  const normalizedCode = code.trim()
  if (!/^\d{6}$/.test(normalizedCode)) {
    throw new Error("Verification code must be a 6-digit number")
  }

  const customerModule = container.resolve(Modules.CUSTOMER)
  const customer = await customerModule.retrieveCustomer(customerId)
  const email = typeof customer.email === "string" ? customer.email.trim().toLowerCase() : ""
  const metadata = customer.metadata ?? {}
  const expectedHash =
    typeof metadata.email_verification_code_hash === "string"
      ? metadata.email_verification_code_hash
      : ""
  const expiresAt =
    typeof metadata.email_verification_expires_at === "string"
      ? metadata.email_verification_expires_at
      : ""
  const sentTo =
    typeof metadata.email_verification_sent_to === "string"
      ? metadata.email_verification_sent_to
      : email
  const generationId =
    typeof metadata.email_verification_generation_id === "string"
      ? metadata.email_verification_generation_id
      : undefined

  if (isEmailVerified(metadata) && !expectedHash) {
    return {
      verified: true,
      verifiedAt: typeof metadata.email_verified_at === "string" ? metadata.email_verified_at : new Date().toISOString(),
      email,
      generationId,
    }
  }

  logVerificationDiagnostic("confirm_attempt", {
    customerId,
    email,
    generationId,
    hashExists: Boolean(expectedHash),
    expiresAt,
  })

  if (!expectedHash || !expiresAt) {
    throw new Error("No verification code has been sent. Request a new code first.")
  }
  if (Date.parse(expiresAt) < Date.now()) {
    throw new Error("Verification code expired. Request a new code.")
  }
  if (sentTo !== email) {
    throw new Error("Verification code does not match the current account email.")
  }
  if (!secureCompare(hashCode(email, normalizedCode), expectedHash)) {
    logVerificationDiagnostic("confirm_hash_mismatch", {
      customerId,
      email,
      generationId,
      hashExists: true,
      expiresAt,
    })
    throw new Error("Verification code is incorrect.")
  }

  const verifiedAt = new Date().toISOString()
  const nextMetadata = {
    ...metadata,
    email_verified_at: verifiedAt,
    email_verification_code_hash: null,
    email_verification_expires_at: null,
    email_verification_sent_to: null,
    email_verification_used_at: verifiedAt,
  }

  await customerModule.updateCustomers(customerId, { metadata: nextMetadata })

  return {
    verified: true,
    verifiedAt,
    email,
    generationId,
  }
}
