import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { PaymentEvents } from "@medusajs/utils"
import { FULFILLMENT_ORDERS_MODULE } from "../modules/fulfillment-orders"
import type FulfillmentOrdersModuleService from "../modules/fulfillment-orders/service"
import { markOrderPaidAndFulfillmentWaiting } from "../lib/sync-order-paid-fulfillment"
import { tryRegisterWebhookDedupe } from "../lib/webhook-dedupe"
import { pushOrderToS2bdiy } from "../lib/s2bdiy/push-s2b-order"
import { getS2bdiyConfig } from "../modules/suppliers/s2bdiy/config"

async function resolveOrderIdFromPayment(
  container: MedusaContainer,
  paymentId: string
): Promise<string | null> {
  const paymentModule = container.resolve(Modules.PAYMENT) as {
    retrievePayment: (
      id: string,
      config?: { relations?: string[] }
    ) => Promise<{ payment_collection_id?: string | null }>
  }
  const payment = await paymentModule.retrievePayment(paymentId, {
    relations: ["payment_collection"],
  })
  const pcId = payment.payment_collection_id
  if (!pcId) {
    return null
  }
  const foService = container.resolve(FULFILLMENT_ORDERS_MODULE) as FulfillmentOrdersModuleService
  const rows = await foService.listFulfillmentOrders({ payment_collection_id: [pcId] })
  return rows[0]?.order_id ?? null
}

export default async function paymentCapturedSyncHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const orderId = await resolveOrderIdFromPayment(container, data.id)
  if (!orderId) {
    return
  }

  const dedupeKey = `payment.captured:${data.id}`
  const firstTime = await tryRegisterWebhookDedupe(container, dedupeKey, "payment.captured")
  if (!firstTime) {
    return
  }

  await markOrderPaidAndFulfillmentWaiting(container, orderId, "payment.captured_event")

  if (getS2bdiyConfig()) {
    try {
      await pushOrderToS2bdiy(container, orderId)
    } catch (error) {
      console.error("S2BDIY push order failed after payment.captured:", error)
    }
  }
}

export const config: SubscriberConfig = {
  event: PaymentEvents.CAPTURED,
}
