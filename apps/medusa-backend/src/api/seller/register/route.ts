import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { registerSellerAccount, type SellerRegisterInput } from "../../../lib/seller-register"
import { sendError } from "../../_helpers/store-core"

export const POST = async (req: MedusaRequest<SellerRegisterInput>, res: MedusaResponse) => {
  const body = req.body ?? {}
  try {
    const result = await registerSellerAccount(req.scope, {
      email: body.email ?? "",
      password: body.password ?? "",
      store_name: body.store_name,
      first_name: body.first_name,
      last_name: body.last_name,
    })
    return res.status(201).json({ seller: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to register seller account"
    if (/already exists|already in use/i.test(message)) {
      return sendError(res, 409, "VALIDATION_ERROR", message)
    }
    if (/required|at least/i.test(message)) {
      return sendError(res, 400, "VALIDATION_ERROR", message)
    }
    if (error instanceof MedusaError) {
      return sendError(res, 400, "VALIDATION_ERROR", error.message)
    }
    throw error
  }
}
