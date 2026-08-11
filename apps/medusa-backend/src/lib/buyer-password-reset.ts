import { createHash, randomInt, timingSafeEqual } from "node:crypto"
import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import {
  BUYER_AUTH_POLICY,
  authCodePepper,
  evaluateMetadataRateLimit,
  isAuthDevCodeEnabled,
  isValidBuyerEmail,
  isValidBuyerPassword,
  normalizeBuyerEmail,
} from "./buyer-auth-policy"
import { sendBuyerPasswordResetCode } from "./email"

const RESET_NEUTRAL_MESSAGE = "If an account exists for that email, we'll send a password reset code."

type CustomerModule = {
  listCustomers: (filter: Record<string, unknown>, config?: Record<string, unknown>) => Promise<Array<{
    id: string
    email?: string | null
    metadata?: Record<string, unknown> | null
  }>>
  retrieveCustomer: (id: string) => Promise<{
    id: string
    email?: string | null
    metadata?: Record<string, unknown> | null
  }>
  updateCustomers: (id: string, data: Record<string, unknown>) => Promise<unknown>
}

type AuthModule = {
  updateProvider: (provider: string, data: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
}

export type BuyerPasswordResetRequestResult = {
  sent: true
  message: string
  expiresAt?: string
  devCode?: string
}

const hashResetCode = (email: string, code: string) =>
  createHash("sha256")
    .update(`${authCodePepper()}:password-reset:${email.trim().toLowerCase()}:${code}`)
    .digest("hex")

const secureCompare = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

async function findCustomerByEmail(container: MedusaContainer, email: string) {
  const customerModule = container.resolve(Modules.CUSTOMER) as unknown as CustomerModule
  const customers = await customerModule.listCustomers({ email }, { take: 1 })
  return customers[0] ?? null
}

export async function requestBuyerPasswordReset(
  container: MedusaContainer,
  rawEmail: unknown
): Promise<BuyerPasswordResetRequestResult> {
  const email = normalizeBuyerEmail(rawEmail)
  if (!isValidBuyerEmail(email)) {
    return { sent: true, message: RESET_NEUTRAL_MESSAGE }
  }

  const customerModule = container.resolve(Modules.CUSTOMER) as unknown as CustomerModule
  const customer = await findCustomerByEmail(container, email)
  if (!customer?.id) {
    return { sent: true, message: RESET_NEUTRAL_MESSAGE }
  }

  const code = String(randomInt(100000, 1000000))
  const nowMs = Date.now()
  const previousMetadata = customer.metadata ?? {}
  const limit = evaluateMetadataRateLimit(
    previousMetadata,
    {
      lastSentAt: "password_reset_last_sent_at",
      windowStartedAt: "password_reset_window_started_at",
      windowCount: "password_reset_window_count",
    },
    BUYER_AUTH_POLICY.maxPasswordResetSendsPerWindow,
    nowMs
  )

  if (!limit.allowed) {
    return { sent: true, message: RESET_NEUTRAL_MESSAGE }
  }

  const expiresAt = new Date(nowMs + BUYER_AUTH_POLICY.resetCodeTtlMs).toISOString()
  const nextMetadata = {
    ...previousMetadata,
    password_reset_code_hash: hashResetCode(email, code),
    password_reset_expires_at: expiresAt,
    password_reset_sent_to: email,
    password_reset_used_at: null,
    password_reset_last_sent_at: new Date(nowMs).toISOString(),
    password_reset_window_started_at: limit.windowStart,
    password_reset_window_count: limit.count,
  }
  await customerModule.updateCustomers(customer.id, { metadata: nextMetadata })

  const emailResult = await sendBuyerPasswordResetCode({
    to: email,
    code,
    expiresInMinutes: Math.max(1, Math.round(BUYER_AUTH_POLICY.resetCodeTtlMs / 60_000)),
    idempotencyKey: createHash("sha256")
      .update(`buyer-password-reset:${customer.id}:${email}:${expiresAt}`)
      .digest("hex"),
  })
  if (!emailResult.success) {
    await customerModule.updateCustomers(customer.id, { metadata: previousMetadata })
    throw new Error("We couldn't send the email right now. Please try again.")
  }

  return {
    sent: true,
    message: RESET_NEUTRAL_MESSAGE,
    expiresAt,
    ...(isAuthDevCodeEnabled() ? { devCode: code } : {}),
  }
}

export async function confirmBuyerPasswordReset(
  container: MedusaContainer,
  input: {
    email: unknown
    code: unknown
    password: unknown
  }
) {
  const email = normalizeBuyerEmail(input.email)
  const code = typeof input.code === "string" ? input.code.trim() : ""
  if (!isValidBuyerEmail(email) || !/^\d{6}$/.test(code) || !isValidBuyerPassword(input.password)) {
    throw new Error("Enter a valid email, 6-digit code, and a password of at least 8 characters.")
  }

  const customerModule = container.resolve(Modules.CUSTOMER) as unknown as CustomerModule
  const authModule = container.resolve(Modules.AUTH) as unknown as AuthModule
  const customer = await findCustomerByEmail(container, email)
  if (!customer?.id) {
    throw new Error("Reset code is invalid or expired.")
  }

  const freshCustomer = await customerModule.retrieveCustomer(customer.id)
  const metadata = freshCustomer.metadata ?? {}
  const expectedHash = typeof metadata.password_reset_code_hash === "string" ? metadata.password_reset_code_hash : ""
  const expiresAt = typeof metadata.password_reset_expires_at === "string" ? metadata.password_reset_expires_at : ""
  const sentTo = typeof metadata.password_reset_sent_to === "string" ? metadata.password_reset_sent_to : ""
  const usedAt = typeof metadata.password_reset_used_at === "string" ? metadata.password_reset_used_at : ""

  if (usedAt) throw new Error("Reset code has already been used. Request a new code.")
  if (!expectedHash || !expiresAt || sentTo !== email) throw new Error("Reset code is invalid or expired.")
  if (Date.parse(expiresAt) < Date.now()) throw new Error("Reset code is invalid or expired.")
  if (!secureCompare(hashResetCode(email, code), expectedHash)) throw new Error("Reset code is invalid or expired.")

  const updated = await authModule.updateProvider("emailpass", {
    entity_id: email,
    password: input.password,
  })
  if (!updated.success) throw new Error("Unable to reset password. Request a new code and try again.")

  const resetAt = new Date().toISOString()
  await customerModule.updateCustomers(freshCustomer.id, {
    metadata: {
      ...metadata,
      password_reset_code_hash: null,
      password_reset_expires_at: null,
      password_reset_sent_to: null,
      password_reset_used_at: resetAt,
    },
  })

  return { reset: true, email }
}

export const buyerPasswordResetNeutralMessage = RESET_NEUTRAL_MESSAGE
