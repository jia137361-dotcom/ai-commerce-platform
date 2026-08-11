import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto"
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { generateJwtTokenForAuthIdentity } from "@medusajs/medusa/api/auth/utils/generate-jwt-token"
import {
  BUYER_AUTH_POLICY,
  authCodePepper,
  buyerLoginEmailDeniedMessage,
  evaluateMetadataRateLimit,
  isAllowedBuyerLoginEmail,
  isAuthDevCodeEnabled,
  isValidBuyerEmail,
  isValidBuyerPassword,
  normalizeBuyerEmail,
  resolveBuyerSessionTtl,
} from "./buyer-auth-policy"
import { sendBuyerLoginOtpCode } from "./email"

type CustomerRecord = {
  id: string
  email?: string | null
  metadata?: Record<string, unknown> | null
}

type AuthModule = {
  register: (
    provider: string,
    data: Record<string, unknown>
  ) => Promise<{ success: boolean; error?: string; authIdentity?: { id?: string } }>
  listProviderIdentities: (
    filters: Record<string, unknown>
  ) => Promise<Array<{ entity_id?: string | null; auth_identity_id?: string | null }>>
  updateProvider: (provider: string, data: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>
  updateAuthIdentities: (data: Record<string, unknown>) => Promise<{ id?: string; app_metadata?: Record<string, unknown> }>
  listAuthIdentities: (
    filters: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<Array<{ id: string; app_metadata?: Record<string, unknown> | null }>>
  authenticate: (
    provider: string,
    data: Record<string, unknown>
  ) => Promise<{ success: boolean; error?: string; authIdentity?: { id?: string; app_metadata?: Record<string, unknown> } }>
}

type CustomerModule = {
  listCustomers: (filters: Record<string, unknown>, config?: Record<string, unknown>) => Promise<CustomerRecord[]>
  createCustomers: (data: Record<string, unknown>) => Promise<CustomerRecord>
  updateCustomers: (id: string, data: Record<string, unknown>) => Promise<CustomerRecord>
  retrieveCustomer: (id: string) => Promise<CustomerRecord>
}

const loginOtpSendLocks = new Map<string, Promise<unknown>>()

const hashLoginOtp = (email: string, code: string) =>
  createHash("sha256")
    .update(`${authCodePepper()}:login-otp:${email}:${code}`)
    .digest("hex")

const secureCompare = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

const formatOtpCode = (value: number) =>
  Math.trunc(value).toString().padStart(6, "0").slice(-6)

const generateOtpCode = () => formatOtpCode(randomInt(0, 1_000_000))

const generateOtpBootstrapPassword = () => randomBytes(32).toString("base64url")

export class BuyerLoginOtpError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status = 400) {
    super(message)
    this.code = code
    this.status = status
  }
}

async function findCustomerByEmail(container: MedusaContainer, email: string) {
  const customerModule = container.resolve(Modules.CUSTOMER) as unknown as CustomerModule
  const customers = await customerModule.listCustomers({ email }, { take: 5 })
  return customers.find((row) => normalizeBuyerEmail(row.email) === email) ?? null
}

async function ensureBuyerAuthLinked(
  container: MedusaContainer,
  email: string,
  customerId: string
) {
  const authModule = container.resolve(Modules.AUTH) as unknown as AuthModule
  let identities = await authModule.listProviderIdentities({
    provider: "emailpass",
    entity_id: email,
  })

  if (!identities.length) {
    const password = generateOtpBootstrapPassword()
    const registered = await authModule.register("emailpass", {
      body: { email, password },
      actorType: "customer",
    })
    if (!registered.success) {
      throw new BuyerLoginOtpError(
        "AUTH_REGISTER_FAILED",
        registered.error ?? "Unable to prepare buyer credentials.",
        500
      )
    }
    identities = await authModule.listProviderIdentities({
      provider: "emailpass",
      entity_id: email,
    })
  }

  const authIdentityId = identities[0]?.auth_identity_id
  if (!authIdentityId) {
    throw new BuyerLoginOtpError("AUTH_IDENTITY_MISSING", "Buyer auth identity is missing.", 500)
  }

  const existingIdentities = await authModule.listAuthIdentities({ id: authIdentityId })
  const previousMeta =
    existingIdentities[0]?.app_metadata && typeof existingIdentities[0].app_metadata === "object"
      ? (existingIdentities[0].app_metadata as Record<string, unknown>)
      : {}

  await authModule.updateAuthIdentities({
    id: authIdentityId,
    app_metadata: {
      ...previousMeta,
      customer_id: customerId,
    },
  })

  return authIdentityId
}

async function ensureBuyerCustomerForOtp(container: MedusaContainer, email: string) {
  const customerModule = container.resolve(Modules.CUSTOMER) as unknown as CustomerModule
  let customer = await findCustomerByEmail(container, email)
  if (!customer?.id) {
    customer = await customerModule.createCustomers({
      email,
      metadata: {
        created_via: "buyer_login_otp",
      },
    })
  }
  await ensureBuyerAuthLinked(container, email, customer.id)
  return customerModule.retrieveCustomer(customer.id)
}

export async function sendBuyerLoginOtp(container: MedusaContainer, rawEmail: unknown) {
  const email = normalizeBuyerEmail(rawEmail)
  if (!isValidBuyerEmail(email)) {
    throw new BuyerLoginOtpError("VALIDATION_ERROR", "Enter a valid email address.")
  }
  if (!isAllowedBuyerLoginEmail(email)) {
    throw new BuyerLoginOtpError("EMAIL_PROVIDER_NOT_ALLOWED", buyerLoginEmailDeniedMessage, 403)
  }

  const previousLock = loginOtpSendLocks.get(email) ?? Promise.resolve()
  const nextLock = previousLock
    .catch(() => undefined)
    .then(() => sendBuyerLoginOtpUnlocked(container, email))
  loginOtpSendLocks.set(email, nextLock)
  try {
    return await nextLock
  } finally {
    if (loginOtpSendLocks.get(email) === nextLock) {
      loginOtpSendLocks.delete(email)
    }
  }
}

async function sendBuyerLoginOtpUnlocked(container: MedusaContainer, email: string) {
  const customerModule = container.resolve(Modules.CUSTOMER) as unknown as CustomerModule
  const customer = await ensureBuyerCustomerForOtp(container, email)
  const code = generateOtpCode()
  const generationId = randomUUID()
  const nowMs = Date.now()
  const previousMetadata = (customer.metadata ?? {}) as Record<string, unknown>
  const limit = evaluateMetadataRateLimit(
    previousMetadata,
    {
      lastSentAt: "login_otp_last_sent_at",
      windowStartedAt: "login_otp_window_started_at",
      windowCount: "login_otp_window_count",
    },
    BUYER_AUTH_POLICY.maxLoginOtpSendsPerWindow,
    nowMs
  )

  if (!limit.allowed) {
    const seconds = Math.max(1, Math.ceil((limit.retryAfterMs ?? BUYER_AUTH_POLICY.resendCooldownMs) / 1000))
    throw new BuyerLoginOtpError(
      "RATE_LIMITED",
      `Please wait ${seconds} seconds before requesting another sign-in code.`,
      429
    )
  }

  const expiresAt = new Date(nowMs + BUYER_AUTH_POLICY.loginOtpTtlMs).toISOString()
  await customerModule.updateCustomers(customer.id, {
    metadata: {
      ...previousMetadata,
      login_otp_code_hash: hashLoginOtp(email, code),
      login_otp_expires_at: expiresAt,
      login_otp_generation_id: generationId,
      login_otp_used_at: null,
      login_otp_last_sent_at: new Date(nowMs).toISOString(),
      login_otp_window_started_at: limit.windowStart,
      login_otp_window_count: limit.count,
    },
  })

  const emailResult = await sendBuyerLoginOtpCode({
    to: email,
    code,
    expiresInMinutes: Math.max(1, Math.round(BUYER_AUTH_POLICY.loginOtpTtlMs / 60_000)),
    idempotencyKey: `buyer-login-otp:${customer.id}:${generationId}`,
  })

  if (!emailResult.success) {
    throw new BuyerLoginOtpError(
      "EMAIL_DELIVERY_ERROR",
      "We couldn't send the email right now. Please try again.",
      503
    )
  }

  return {
    sent: true as const,
    email,
    expiresAt,
    ...(isAuthDevCodeEnabled() ? { devCode: code } : {}),
  }
}

export async function confirmBuyerLoginOtp(
  container: MedusaContainer,
  input: { email?: unknown; code?: unknown; rememberMe?: unknown; password?: unknown }
) {
  const email = normalizeBuyerEmail(input.email)
  const code = typeof input.code === "string" ? input.code.trim() : ""
  const rememberMe = Boolean(input.rememberMe)
  const password = typeof input.password === "string" ? input.password : ""

  if (!isValidBuyerEmail(email) || !/^\d{6}$/.test(code)) {
    throw new BuyerLoginOtpError("VALIDATION_ERROR", "Enter a valid email and 6-digit code.")
  }
  if (!isAllowedBuyerLoginEmail(email)) {
    throw new BuyerLoginOtpError("EMAIL_PROVIDER_NOT_ALLOWED", buyerLoginEmailDeniedMessage, 403)
  }
  if (password && !isValidBuyerPassword(password)) {
    throw new BuyerLoginOtpError(
      "VALIDATION_ERROR",
      `Password must be at least ${BUYER_AUTH_POLICY.passwordMinLength} characters.`
    )
  }

  const customerModule = container.resolve(Modules.CUSTOMER) as unknown as CustomerModule
  const authModule = container.resolve(Modules.AUTH) as unknown as AuthModule
  const customer = await findCustomerByEmail(container, email)
  if (!customer?.id) {
    throw new BuyerLoginOtpError("OTP_INVALID", "Sign-in code is invalid or expired. Request a new code.")
  }

  const metadata = (customer.metadata ?? {}) as Record<string, unknown>
  const hash = typeof metadata.login_otp_code_hash === "string" ? metadata.login_otp_code_hash : ""
  const expiresAt = typeof metadata.login_otp_expires_at === "string" ? Date.parse(metadata.login_otp_expires_at) : 0
  const usedAt = typeof metadata.login_otp_used_at === "string" ? metadata.login_otp_used_at : null
  const createdViaOtp = metadata.created_via === "buyer_login_otp"
  const passwordAlreadySet = typeof metadata.password_set_at === "string"

  if (!hash || !expiresAt || usedAt || Date.now() > expiresAt || !secureCompare(hash, hashLoginOtp(email, code))) {
    throw new BuyerLoginOtpError("OTP_INVALID", "Sign-in code is invalid or expired. Request a new code.")
  }

  if (createdViaOtp && !passwordAlreadySet && !password) {
    throw new BuyerLoginOtpError(
      "PASSWORD_REQUIRED",
      "Create a password to finish setting up your account.",
      400
    )
  }

  await ensureBuyerAuthLinked(container, email, customer.id)

  if (password) {
    const updatedPassword = await authModule.updateProvider("emailpass", {
      entity_id: email,
      password,
    })
    if (!updatedPassword.success) {
      throw new BuyerLoginOtpError(
        "PASSWORD_SET_FAILED",
        updatedPassword.error ?? "Unable to set your password.",
        400
      )
    }
  }

  const identities = await authModule.listProviderIdentities({
    provider: "emailpass",
    entity_id: email,
  })
  const authIdentityId = identities[0]?.auth_identity_id
  if (!authIdentityId) {
    throw new BuyerLoginOtpError("AUTH_IDENTITY_MISSING", "Buyer auth identity is missing.", 500)
  }
  const authIdentities = await authModule.listAuthIdentities({ id: authIdentityId })
  const authIdentity = authIdentities[0]
  if (!authIdentity?.id) {
    throw new BuyerLoginOtpError("AUTH_IDENTITY_MISSING", "Buyer auth identity is missing.", 500)
  }

  const config = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE) as {
    projectConfig: { http: { jwtSecret: string; jwtExpiresIn?: string; jwtOptions?: Record<string, unknown> } }
  }
  const expiresIn = resolveBuyerSessionTtl(rememberMe)

  const token = await generateJwtTokenForAuthIdentity(
    {
      authIdentity: authIdentity as never,
      actorType: "customer",
      authProvider: "emailpass",
      container,
    },
    {
      secret: config.projectConfig.http.jwtSecret,
      expiresIn,
      options: config.projectConfig.http.jwtOptions,
    }
  )

  const verifiedAt = new Date().toISOString()
  await customerModule.updateCustomers(customer.id, {
    metadata: {
      ...metadata,
      email_verified_at: typeof metadata.email_verified_at === "string" ? metadata.email_verified_at : verifiedAt,
      login_otp_used_at: verifiedAt,
      login_otp_code_hash: null,
      login_otp_expires_at: null,
      login_otp_last_success_at: verifiedAt,
      login_otp_remember_me: rememberMe,
      ...(password ? { password_set_at: verifiedAt } : {}),
    },
  })

  return {
    token,
    email,
    customerId: customer.id,
    rememberMe,
    expiresIn,
    passwordSet: Boolean(password),
  }
}
