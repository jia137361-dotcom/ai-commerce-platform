import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  deleteCustomerAddressRecord,
  updateCustomerAddressRecord,
  validateCustomerAddressInput,
} from "../../../../../../lib/customer-addresses"
import { resolveCustomerId } from "../../../../../../lib/customer-session"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = resolveCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Customer session is required" } })
  }

  const addressId = req.params.id as string
  const body = (req.body ?? {}) as Record<string, unknown>
  const parsed = validateCustomerAddressInput(body)
  if (typeof parsed === "string") {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: parsed } })
  }

  try {
    const address = await updateCustomerAddressRecord(req.scope, customerId, addressId, parsed)
    return res.json({ address })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update address"
    const status = message === "Address not found" ? 404 : 400
    return res.status(status).json({ error: { code: "ADDRESS_UPDATE_ERROR", message } })
  }
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = resolveCustomerId(req)
  if (!customerId) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Customer session is required" } })
  }

  const addressId = req.params.id as string
  try {
    await deleteCustomerAddressRecord(req.scope, customerId, addressId)
    return res.json({ deleted: true, address_id: addressId })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete address"
    const status = message === "Address not found" ? 404 : 400
    return res.status(status).json({ error: { code: "ADDRESS_DELETE_ERROR", message } })
  }
}
