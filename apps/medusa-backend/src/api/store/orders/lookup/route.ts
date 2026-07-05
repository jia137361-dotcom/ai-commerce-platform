import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { resolveCurrentStore } from "../../../../lib/store-context"
import { assertOrderBelongsToCurrentStore, readOrderStoreId } from "../../../../lib/order-store-context"
import { OrderStoreAccessError } from "../../../../lib/order-store-error"
import {
  ORDER_META_PAYMENT_STATUS,
  resolveBuyerOrderFulfillmentStatus,
} from "../../../../lib/order-custom-metadata"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const email = (req.query?.email as string | undefined)?.trim().toLowerCase()
    const displayIdRaw =
      (req.query?.display_id as string | undefined) ?? (req.query?.order_number as string | undefined)
    if (!email || !displayIdRaw) {
      return res.status(400).json({ error: "email and display_id (or order_number) are required" })
    }
    const display_id = Number(displayIdRaw)
    if (!Number.isFinite(display_id)) {
      return res.status(400).json({ error: "display_id must be a number" })
    }

    const orderModule = req.scope.resolve(Modules.ORDER)
    const orders = await orderModule.listOrders(
      { email, display_id } as Parameters<typeof orderModule.listOrders>[0],
      { take: 5, order: { created_at: "DESC" } }
    )

    const storeId = resolveCurrentStore(req).store_id
    const match = orders.find((o) => readOrderStoreId(o) === storeId)

    if (!match) {
      return res.status(404).json({ error: "Order not found" })
    }

    assertOrderBelongsToCurrentStore(req, match)

    res.status(200).json({
      order_id: match.id,
      display_id: match.display_id,
      order_number: match.display_id,
      email: match.email,
      store_id: readOrderStoreId(match),
      payment_status: (match.metadata as Record<string, unknown> | null)?.[ORDER_META_PAYMENT_STATUS] ?? null,
      fulfillment_status: resolveBuyerOrderFulfillmentStatus(match.metadata as Record<string, unknown> | null),
      created_at: match.created_at,
    })
  } catch (error: unknown) {
    if (error instanceof OrderStoreAccessError) {
      return res.status(403).json({
        error: { code: error.code, message: error.message },
      })
    }
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("订单 lookup 失败:", error)
    res.status(400).json({ error: message })
  }
}
