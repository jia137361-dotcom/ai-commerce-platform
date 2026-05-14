import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { resolveCurrentStore } from "../../../lib/store-context"
import { readOrderStoreId } from "../../../lib/order-store-context"
import {
  ORDER_META_FULFILLMENT_STATUS,
  ORDER_META_PAYMENT_STATUS,
} from "../../../lib/order-custom-metadata"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const storeId = resolveCurrentStore(req).store_id
    const take = Math.min(Number(req.query?.limit ?? 50) || 50, 200)

    const orderModule = req.scope.resolve(Modules.ORDER)
    const orders = await orderModule.listOrders(
      {},
      { take, order: { created_at: "DESC" } }
    )

    const scoped = orders.filter((o) => readOrderStoreId(o) === storeId)

    res.status(200).json({
      store_id: storeId,
      count: scoped.length,
      orders: scoped.map((o) => ({
        id: o.id,
        display_id: o.display_id,
        email: o.email,
        created_at: o.created_at,
        currency_code: o.currency_code,
        payment_status: (o.metadata as Record<string, unknown> | null)?.[ORDER_META_PAYMENT_STATUS] ?? null,
        fulfillment_status:
          (o.metadata as Record<string, unknown> | null)?.[ORDER_META_FULFILLMENT_STATUS] ?? null,
      })),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Admin 订单列表失败:", error)
    res.status(400).json({ error: message })
  }
}
