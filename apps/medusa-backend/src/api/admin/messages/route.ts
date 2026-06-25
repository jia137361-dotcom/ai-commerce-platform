import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../lib/store-context"
import {
  normalizeStoreMessage,
  parseMessageBody,
  summarizeSellerMessageThreads,
} from "../../../lib/store-messages"
import { getStoreCoreService, sendError } from "../../_helpers/store-core"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { store_id: storeId } = resolveCurrentStore(req)
  const service = getStoreCoreService(req) as any
  const customerId =
    typeof req.query?.customer_id === "string" && req.query.customer_id.trim()
      ? req.query.customer_id.trim()
      : undefined

  if (customerId) {
    const messages = await service.listStoreMessages(
      { store_id: storeId, customer_id: customerId },
      { order: { created_at: "ASC" } }
    )
    const unread = messages.filter(
      (message: { sender_role?: string; read_by_seller_at?: unknown }) =>
        message.sender_role === "buyer" && !message.read_by_seller_at
    )
    for (const message of unread) {
      await service.updateStoreMessages({ id: message.id, read_by_seller_at: new Date() })
    }
    return res.json({
      store_id: storeId,
      customer_id: customerId,
      messages: messages.map(normalizeStoreMessage),
    })
  }

  const messages = await service.listStoreMessages(
    { store_id: storeId },
    { order: { created_at: "DESC" } }
  )

  return res.json({
    store_id: storeId,
    count: messages.length,
    threads: summarizeSellerMessageThreads(messages),
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = parseMessageBody((req.body as { body?: unknown } | undefined)?.body)
  const customerId =
    typeof (req.body as { customer_id?: unknown }).customer_id === "string"
      ? (req.body as { customer_id: string }).customer_id.trim()
      : ""
  if (!customerId) {
    return sendError(res, 400, "VALIDATION_ERROR", "customer_id is required")
  }
  if (!body) {
    return sendError(res, 400, "VALIDATION_ERROR", "body is required and must be 2000 characters or fewer")
  }

  const { store_id: storeId } = resolveCurrentStore(req)
  const service = getStoreCoreService(req) as any
  const existing = await service.listStoreMessages(
    { store_id: storeId, customer_id: customerId },
    { order: { created_at: "DESC" }, take: 1 }
  )
  const latest = existing[0]
  if (!latest) {
    return res.status(404).json({
      error: { message: "No existing conversation for this customer" },
    })
  }

  const created = await service.createStoreMessages({
    store_id: storeId,
    customer_id: customerId,
    customer_email: latest.customer_email,
    customer_name: latest.customer_name ?? null,
    order_id: latest.order_id ?? null,
    sender_role: "seller",
    body,
    read_by_buyer_at: null,
    read_by_seller_at: new Date(),
  })
  const message = Array.isArray(created) ? created[0] : created

  return res.status(201).json({ message: normalizeStoreMessage(message) })
}
