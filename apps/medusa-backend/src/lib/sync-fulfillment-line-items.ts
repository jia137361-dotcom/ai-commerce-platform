import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { FULFILLMENT_ORDERS_MODULE } from "../modules/fulfillment-orders"
import type FulfillmentOrdersModuleService from "../modules/fulfillment-orders/service"

export async function syncFulfillmentPayloadFromOrder(
  container: MedusaContainer,
  orderId: string
): Promise<void> {
  const orderModule = container.resolve(Modules.ORDER)
  const foService = container.resolve(FULFILLMENT_ORDERS_MODULE) as FulfillmentOrdersModuleService

  const order = await orderModule.retrieveOrder(orderId, {
    relations: ["items"],
  })

  const lineItems = (order.items ?? []).map((item: any) => ({
    line_item_id: item.id,
    variant_id: item.variant_id,
    quantity: item.quantity,
    metadata: item.metadata ?? {},
  }))

  const existing = await foService.listFulfillmentOrders({ order_id: [orderId] })
  const row = existing[0]
  if (!row) {
    return
  }

  const payload = {
    ...(row.payload as Record<string, unknown> | null),
    line_items: lineItems,
  }

  await foService.updateFulfillmentOrders({
    id: row.id,
    payload,
  })
}
