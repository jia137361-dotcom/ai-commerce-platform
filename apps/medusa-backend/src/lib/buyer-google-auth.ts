import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { generateJwtTokenForAuthIdentity } from "@medusajs/medusa/api/auth/utils/generate-jwt-token"
import jwt from "jsonwebtoken"
import {
  buyerLoginEmailDeniedMessage,
  isAllowedBuyerLoginEmail,
  isValidBuyerEmail,
  normalizeBuyerEmail,
  resolveBuyerSessionTtl,
} from "./buyer-auth-policy"
import {
  buildAuthIdentityActorMetadata,
  isGoogleOAuthConfigured,
  resolveOAuthCallbackUrl,
} from "./oauth-actor"

type CustomerRecord = {
  id: string
  email?: string | null
  first_name?: string | null
  last_name?: string | null
  metadata?: Record<string, unknown> | null
}

type AuthIdentityRecord = {
  id: string
  app_metadata?: Record<string, unknown> | null
  provider_identities?: Array<{
    provider?: string | null
    entity_id?: string | null
    user_metadata?: Record<string, unknown> | null
  }>
}

type AuthModule = {
  listAuthIdentities: (
    filters: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<AuthIdentityRecord[]>
  updateAuthIdentities: (data: Record<string, unknown>) => Promise<AuthIdentityRecord>
}

type CustomerModule = {
  listCustomers: (filters: Record<string, unknown>, config?: Record<string, unknown>) => Promise<CustomerRecord[]>
  createCustomers: (data: Record<string, unknown>) => Promise<CustomerRecord>
  updateCustomers: (id: string, data: Record<string, unknown>) => Promise<CustomerRecord>
  retrieveCustomer: (id: string) => Promise<CustomerRecord>
}

type GoogleAuthJwtPayload = {
  auth_identity_id?: string
  auth_provider?: string
  actor_type?: string
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
}

export class BuyerGoogleAuthError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status = 400) {
    super(message)
    this.code = code
    this.status = status
  }
}

export { isGoogleOAuthConfigured, resolveOAuthCallbackUrl }

async function findCustomerByEmail(container: MedusaContainer, email: string) {
  const customerModule = container.resolve(Modules.CUSTOMER) as unknown as CustomerModule
  const customers = await customerModule.listCustomers({ email }, { take: 5 })
  return customers.find((row) => normalizeBuyerEmail(row.email) === email) ?? null
}

function extractBearerToken(authorizationHeader: unknown): string {
  if (typeof authorizationHeader !== "string" || !authorizationHeader.trim()) {
    throw new BuyerGoogleAuthError("AUTH_TOKEN_REQUIRED", "Google sign-in token is required.", 401)
  }
  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i)
  if (!match?.[1]?.trim()) {
    throw new BuyerGoogleAuthError("AUTH_TOKEN_REQUIRED", "Google sign-in token is required.", 401)
  }
  return match[1].trim()
}

function verifyGoogleAuthToken(container: MedusaContainer, token: string): GoogleAuthJwtPayload {
  const config = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE) as {
    projectConfig: { http: { jwtSecret: string } }
  }
  try {
    const decoded = jwt.verify(token, config.projectConfig.http.jwtSecret)
    if (!decoded || typeof decoded === "string") {
      throw new BuyerGoogleAuthError("AUTH_TOKEN_INVALID", "Google sign-in token is invalid.", 401)
    }
    return decoded as GoogleAuthJwtPayload
  } catch (error) {
    if (error instanceof BuyerGoogleAuthError) throw error
    throw new BuyerGoogleAuthError("AUTH_TOKEN_INVALID", "Google sign-in token is invalid or expired.", 401)
  }
}

function resolveGoogleEmail(payload: GoogleAuthJwtPayload, identity: AuthIdentityRecord): string {
  const fromJwt = normalizeBuyerEmail(payload.user_metadata?.email)
  if (fromJwt) return fromJwt

  const googleIdentity = identity.provider_identities?.find((row) => row.provider === "google")
  const fromIdentity = normalizeBuyerEmail(googleIdentity?.user_metadata?.email)
  if (fromIdentity) return fromIdentity

  throw new BuyerGoogleAuthError("GOOGLE_EMAIL_MISSING", "Google did not return an email address.", 400)
}

function resolveProfileNames(payload: GoogleAuthJwtPayload, identity: AuthIdentityRecord) {
  const googleIdentity = identity.provider_identities?.find((row) => row.provider === "google")
  const meta = {
    ...(googleIdentity?.user_metadata ?? {}),
    ...(payload.user_metadata ?? {}),
  }
  const given =
    typeof meta.given_name === "string"
      ? meta.given_name.trim()
      : typeof meta.name === "string"
        ? meta.name.trim().split(/\s+/)[0]
        : ""
  const family = typeof meta.family_name === "string" ? meta.family_name.trim() : ""
  return {
    firstName: given || undefined,
    lastName: family || undefined,
  }
}

export async function completeBuyerGoogleAuth(
  container: MedusaContainer,
  input: {
    authorizationHeader?: unknown
    rememberMe?: unknown
  }
) {
  if (!isGoogleOAuthConfigured()) {
    throw new BuyerGoogleAuthError(
      "GOOGLE_AUTH_DISABLED",
      "Google sign-in is not configured on this server.",
      503
    )
  }

  const token = extractBearerToken(input.authorizationHeader)
  const payload = verifyGoogleAuthToken(container, token)

  if (payload.auth_provider && payload.auth_provider !== "google") {
    throw new BuyerGoogleAuthError("AUTH_PROVIDER_MISMATCH", "Expected a Google authentication token.", 401)
  }
  if (payload.actor_type && payload.actor_type !== "customer") {
    throw new BuyerGoogleAuthError("ACTOR_TYPE_MISMATCH", "Expected a customer authentication token.", 401)
  }

  const authIdentityId = typeof payload.auth_identity_id === "string" ? payload.auth_identity_id.trim() : ""
  if (!authIdentityId) {
    throw new BuyerGoogleAuthError("AUTH_IDENTITY_MISSING", "Google auth identity is missing.", 401)
  }

  const authModule = container.resolve(Modules.AUTH) as unknown as AuthModule
  const identities = await authModule.listAuthIdentities(
    { id: authIdentityId },
    { relations: ["provider_identities"], take: 1 }
  )
  const authIdentity = identities[0]
  if (!authIdentity?.id) {
    throw new BuyerGoogleAuthError("AUTH_IDENTITY_MISSING", "Google auth identity was not found.", 401)
  }

  const email = resolveGoogleEmail(payload, authIdentity)
  if (!isValidBuyerEmail(email)) {
    throw new BuyerGoogleAuthError("VALIDATION_ERROR", "Google returned an invalid email address.")
  }
  if (!isAllowedBuyerLoginEmail(email)) {
    throw new BuyerGoogleAuthError("EMAIL_PROVIDER_NOT_ALLOWED", buyerLoginEmailDeniedMessage, 403)
  }

  const customerModule = container.resolve(Modules.CUSTOMER) as unknown as CustomerModule
  const existingCustomerId =
    typeof authIdentity.app_metadata?.customer_id === "string"
      ? authIdentity.app_metadata.customer_id
      : typeof payload.app_metadata?.customer_id === "string"
        ? payload.app_metadata.customer_id
        : ""

  let customer: CustomerRecord | null = null
  let created = false

  if (existingCustomerId) {
    try {
      customer = await customerModule.retrieveCustomer(existingCustomerId)
    } catch {
      customer = null
    }
  }

  if (!customer) {
    customer = await findCustomerByEmail(container, email)
  }

  const names = resolveProfileNames(payload, authIdentity)
  const verifiedAt = new Date().toISOString()

  if (!customer?.id) {
    customer = await customerModule.createCustomers({
      email,
      first_name: names.firstName,
      last_name: names.lastName,
      metadata: {
        created_via: "buyer_google_oauth",
        email_verified_at: verifiedAt,
        google_linked_at: verifiedAt,
      },
    })
    created = true
  } else {
    const metadata =
      customer.metadata && typeof customer.metadata === "object"
        ? { ...(customer.metadata as Record<string, unknown>) }
        : {}
    await customerModule.updateCustomers(customer.id, {
      ...(names.firstName && !customer.first_name ? { first_name: names.firstName } : {}),
      ...(names.lastName && !customer.last_name ? { last_name: names.lastName } : {}),
      metadata: {
        ...metadata,
        email_verified_at:
          typeof metadata.email_verified_at === "string" ? metadata.email_verified_at : verifiedAt,
        google_linked_at: verifiedAt,
      },
    })
    customer = await customerModule.retrieveCustomer(customer.id)
  }

  await authModule.updateAuthIdentities({
    id: authIdentity.id,
    app_metadata: buildAuthIdentityActorMetadata({
      authIdentityId: authIdentity.id,
      actor: "buyer",
      actorId: customer.id,
      previousMetadata: authIdentity.app_metadata,
    }),
  })

  const linkedIdentities = await authModule.listAuthIdentities(
    { id: authIdentity.id },
    { relations: ["provider_identities"], take: 1 }
  )
  const linkedIdentity = linkedIdentities[0]
  if (!linkedIdentity?.id) {
    throw new BuyerGoogleAuthError("AUTH_IDENTITY_MISSING", "Google auth identity is missing after link.", 500)
  }

  const rememberMe = Boolean(input.rememberMe)
  const config = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE) as {
    projectConfig: { http: { jwtSecret: string; jwtExpiresIn?: string; jwtOptions?: Record<string, unknown> } }
  }
  const expiresIn = resolveBuyerSessionTtl(rememberMe)

  const sessionToken = await generateJwtTokenForAuthIdentity(
    {
      authIdentity: linkedIdentity as never,
      actorType: "customer",
      authProvider: "google",
      container,
    },
    {
      secret: config.projectConfig.http.jwtSecret,
      expiresIn,
      options: config.projectConfig.http.jwtOptions,
    }
  )

  return {
    token: sessionToken,
    email,
    customerId: customer.id,
    created,
    rememberMe,
    expiresIn,
  }
}
