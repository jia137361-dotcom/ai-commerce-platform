import { createHash, randomInt } from "node:crypto"
import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

const OTP_TTL_MS = 15 * 60 * 1000

const hashCode = (email: string, code: string) =>
  createHash("sha256").update(`${email.trim().toLowerCase()}:${code}`).digest("hex")

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
  const customerModule = container.resolve(Modules.CUSTOMER)
  const customer = await customerModule.retrieveCustomer(customerId)
  const email = typeof customer.email === "string" ? customer.email.trim().toLowerCase() : ""
  if (!email || !email.includes("@")) {
    throw new Error("A valid account email is required before verification")
  }

  const code = String(randomInt(100000, 1000000))
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString()
  const metadata = {
    ...(customer.metadata ?? {}),
    email_verification_code_hash: hashCode(email, code),
    email_verification_expires_at: expiresAt,
    email_verification_sent_to: email,
  }

  await customerModule.updateCustomers(customerId, { metadata })

  if (process.env.NODE_ENV !== "production") {
    console.info(`[email-verification] code=${code} email=${email} customer_id=${customerId}`)
  }

  return {
    email,
    expiresAt,
    devCode: process.env.NODE_ENV !== "production" ? code : undefined,
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

  if (!expectedHash || !expiresAt) {
    throw new Error("No verification code has been sent. Request a new code first.")
  }
  if (Date.parse(expiresAt) < Date.now()) {
    throw new Error("Verification code expired. Request a new code.")
  }
  if (sentTo !== email) {
    throw new Error("Verification code does not match the current account email.")
  }
  if (hashCode(email, normalizedCode) !== expectedHash) {
    throw new Error("Verification code is incorrect.")
  }

  const verifiedAt = new Date().toISOString()
  const nextMetadata = {
    ...metadata,
    email_verified_at: verifiedAt,
    email_verification_code_hash: null,
    email_verification_expires_at: null,
    email_verification_sent_to: null,
  }

  await customerModule.updateCustomers(customerId, { metadata: nextMetadata })

  return {
    verified: true,
    verifiedAt,
    email,
  }
}
