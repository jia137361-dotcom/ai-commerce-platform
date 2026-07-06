import { createHmac, timingSafeEqual } from "node:crypto"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { STORE_CORE_MODULE } from "../../modules/store-core"
import type StoreCoreModuleService from "../../modules/store-core/service"
import { sendError } from "../../api/_helpers/store-core"

export type AuthenticatedUserRequest = MedusaRequest & {
  auth_context?: {
    actor_id?: string
    actor_type?: string
  }
}

export type PlatformOperatorContext = {
  user_id: string
  operator_id: string
  role: "admin" | "viewer"
}

const JWT_SECRET = process.env.JWT_SECRET || "development-jwt-secret"

export function decodeBearerToken(req: MedusaRequest): string | null {
  const header = req.headers.authorization
  const value = Array.isArray(header) ? header[0] : header
  if (!value?.startsWith("Bearer ")) return null
  const token = value.slice("Bearer ".length).trim()
  return token.length ? token : null
}

export function verifyMedusaUserJwt(token: string): { actor_id?: string; actor_type?: string } | null {
  const parts = token.split(".")
  if (parts.length !== 3) return null
  const [header, payload, signature] = parts
  try {
    const expected = createHmac("sha256", JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest("base64url")
    const sigBuf = Buffer.from(signature)
    const expBuf = Buffer.from(expected)
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return null
    }
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      actor_id?: string
      actor_type?: string
    }
    if (decoded.actor_type && decoded.actor_type !== "user") return null
    return decoded
  } catch {
    return null
  }
}

export function resolveAdminUserId(req: MedusaRequest): string | null {
  const fromContext = (req as AuthenticatedUserRequest).auth_context?.actor_id
  if (typeof fromContext === "string" && fromContext.length > 0) {
    return fromContext
  }
  const token = decodeBearerToken(req)
  if (!token) return null
  const decoded = verifyMedusaUserJwt(token)
  return typeof decoded?.actor_id === "string" ? decoded.actor_id : null
}

export async function requirePlatformOperator(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<PlatformOperatorContext | null> {
  const userId = resolveAdminUserId(req)
  if (!userId) {
    sendError(res, 401, "UNAUTHORIZED", "Platform operator authentication required")
    return null
  }

  const storeCore = req.scope.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const operators = await storeCore.listPlatformOperators({ user_id: userId, status: "active" })
  const operator = operators[0] as { id: string; user_id: string; role: "admin" | "viewer" } | undefined

  if (!operator) {
    sendError(res, 403, "FORBIDDEN", "User is not an active platform operator")
    return null
  }

  const sellerMemberships = await storeCore.listStoreMembers({ user_id: userId })
  if (sellerMemberships.length) {
    sendError(res, 403, "FORBIDDEN", "Platform operator accounts must be separate from seller store accounts")
    return null
  }

  return {
    user_id: operator.user_id,
    operator_id: operator.id,
    role: operator.role,
  }
}

export async function assertPlatformAdmin(
  operator: PlatformOperatorContext,
  res: MedusaResponse
): Promise<boolean> {
  if (operator.role !== "admin") {
    sendError(res, 403, "FORBIDDEN", "Admin role required for this action")
    return false
  }
  return true
}

export const PLATFORM_STATUS_DISABLED = "disabled"

export function readPlatformStatus(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null
  const value = (metadata as Record<string, unknown>).platform_status
  return typeof value === "string" ? value : null
}

export function isPlatformDisabled(metadata: unknown): boolean {
  return readPlatformStatus(metadata) === PLATFORM_STATUS_DISABLED
}

export async function assertSellerUserActive(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<string | null> {
  const userId = resolveAdminUserId(req)
  if (!userId) return userId

  const userModule = req.scope.resolve(Modules.USER) as {
    retrieveUser: (id: string) => Promise<{ id: string; metadata?: Record<string, unknown> | null }>
  }
  try {
    const user = await userModule.retrieveUser(userId)
    if (isPlatformDisabled(user.metadata)) {
      sendError(res, 403, "FORBIDDEN", "Seller account is disabled by platform operations")
      return null
    }
    return userId
  } catch {
    return userId
  }
}

export async function assertCustomerActive(
  req: MedusaRequest,
  res: MedusaResponse,
  customerId: string
): Promise<boolean> {
  const customerModule = req.scope.resolve(Modules.CUSTOMER) as {
    retrieveCustomer: (id: string) => Promise<{ id: string; metadata?: Record<string, unknown> | null }>
  }
  try {
    const customer = await customerModule.retrieveCustomer(customerId)
    if (isPlatformDisabled(customer.metadata)) {
      sendError(res, 403, "FORBIDDEN", "Buyer account is disabled by platform operations")
      return false
    }
    return true
  } catch {
    return true
  }
}
