import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { assertOrderBelongsToCurrentStore } from "../../../../../lib/order-store-context"
import { OrderStoreAccessError } from "../../../../../lib/order-store-error"
import { retrySupplierOrderPay } from "../../../../../lib/s2bdiy/push-s2b-order"
import { getS2bdiyConfig } from "../../../../../modules/suppliers/s2bdiy/config"
import { Modules } from "@medusajs/framework/utils"
import { sendError } from "../../../../_helpers/store-core"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!getS2bdiyConfig()) {
    return sendError(res, 400, "VALIDATION_ERROR", "S2BDIY is not configured")
  }

  try {
    const orderId = req.params.order_id as string
    const orderModule = req.scope.resolve(Modules.ORDER)
    const order = await orderModule.retrieveOrder(orderId)
    assertOrderBelongsToCurrentStore(req, order)

    await retrySupplierOrderPay(req.scope, orderId)
    return res.status(200).json({ order_id: orderId, status: "pay_retried" })
  } catch (error: unknown) {
    if (error instanceof OrderStoreAccessError) {
      return res.status(403).json({ error: { code: error.code, message: error.message } })
    }
    const message = error instanceof Error ? error.message : "retry failed"
    return sendError(res, 502, "PAYMENT_FAILED", message)
  }
}
