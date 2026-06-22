import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { readOrderFulfillmentStatusMeta } from "../lib/order-custom-metadata"
import { shouldAutoConfirmReceipt } from "../lib/order-receipt-confirmation"

export default async function autoConfirmDeliveredOrdersJob(container: MedusaContainer) {
  const orderModule = container.resolve(Modules.ORDER)
  const orders = await orderModule.listOrders({}, { take: 500, order: { created_at: "ASC" } } as never)
  let updated = 0

  for (const order of orders) {
    const metadata = (order.metadata ?? {}) as Record<string, unknown>
    if (readOrderFulfillmentStatusMeta(metadata) !== "delivered" || !shouldAutoConfirmReceipt(order)) continue
    const confirmedAt = new Date().toISOString()
    await orderModule.updateOrders(order.id, {
      status: "completed",
      metadata: {
        ...metadata,
        buyer_confirmed_received_at: confirmedAt,
        receipt_confirmation_source: "automatic_7_days",
      },
    } as never)
    updated += 1
  }

  const logger = container.resolve("logger") as { info: (message: string) => void }
  logger.info(`Auto-confirmed ${updated} delivered orders`)
}

export const config = {
  name: "auto-confirm-delivered-orders",
  schedule: "0 * * * *",
}
