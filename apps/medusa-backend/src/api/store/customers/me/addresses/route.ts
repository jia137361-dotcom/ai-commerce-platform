import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  createCustomerAddressRecord,
  listCustomerAddressRecords,
  validateCustomerAddressInput,
} from "../../../../../lib/customer-addresses"
import { resolveCustomerId } from "../../../../../lib/customer-session"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = resolveCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Customer session is required" } })
  }

  const limit = Math.min(Math.max(Number(req.query.limit ?? 50) || 50, 1), 100)
  const addresses = await listCustomerAddressRecords(req.scope, customerId, limit)
  return res.json({ addresses, count: addresses.length })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = resolveCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Customer session is required" } })
  }

  const body = (req.body ?? {}) as Record<string, unknown>
  const parsed = validateCustomerAddressInput(body)
  if (typeof parsed === "string") {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed } })
  }

  try {
    const address = await createCustomerAddressRecord(req.scope, customerId, parsed)
    return res.status(201).json({ address })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create address"
    return res.status(400).json({ error: { code: "ADDRESS_CREATE_ERROR", message } })
  }
}
