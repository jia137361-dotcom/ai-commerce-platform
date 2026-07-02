import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { resolveCurrentStore } from "../../../lib/store-context"
import {
  normalizeStoreMessage,
  parseMessageBody,
} from "../../../lib/store-messages"
import { getStoreCoreService, sendError } from "../../_helpers/store-core"

type AuthenticatedRequest = MedusaRequest & {
  auth_context?: { actor_id?: string }
}

const readAuthCustomerId = (req: MedusaRequest) =>
  (req as AuthenticatedRequest).auth_context?.actor_id

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = readAuthCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ error: "Customer session is required" })
  }

  const { store_id: storeId } = resolveCurrentStore(req)
  const service = getStoreCoreService(req) as any
  const messages = await service.listStoreMessages(
    { store_id: storeId, customer_id: customerId },
    { order: { created_at: "ASC" } }
  )

  const unread = messages.filter(
    (message: { sender_role?: string; read_by_buyer_at?: unknown }) =>
      message.sender_role === "seller" && !message.read_by_buyer_at
  )
  for (const message of unread) {
    await service.updateStoreMessages({ id: message.id, read_by_buyer_at: new Date() })
  }

  return res.json({
    store_id: storeId,
    customer_id: customerId,
    messages: messages.map(normalizeStoreMessage),
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = readAuthCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ error: "Customer session is required" })
  }

  const body = parseMessageBody((req.body as { body?: unknown } | undefined)?.body)
  if (!body) {
    return sendError(res, 400, "VALIDATION_ERROR", "body is required and must be 2000 characters or fewer")
  }

  const { store_id: storeId } = resolveCurrentStore(req)
  const customerModule = req.scope.resolve(Modules.CUSTOMER) as {
    retrieveCustomer: (id: string) => Promise<{ email?: string | null; first_name?: string | null; last_name?: string | null }>
  }
  const customer = await customerModule.retrieveCustomer(customerId)
  const email = customer.email?.trim().toLowerCase()
  if (!email) {
    return sendError(res, 400, "VALIDATION_ERROR", "Customer email is required")
  }

  const orderId =
    typeof (req.body as { order_id?: unknown }).order_id === "string"
      ? (req.body as { order_id: string }).order_id.trim()
      : null
  const customerName = [customer.first_name, customer.last_name].filter(Boolean).join(" ").trim() || null
  const service = getStoreCoreService(req) as any
  const created = await service.createStoreMessages({
    store_id: storeId,
    customer_id: customerId,
    customer_email: email,
    customer_name: customerName,
    order_id: orderId || null,
    sender_role: "buyer",
    body,
    read_by_buyer_at: new Date(),
    read_by_seller_at: null,
  })
  const message = Array.isArray(created) ? created[0] : created

  return res.status(201).json({ message: normalizeStoreMessage(message) })
}
