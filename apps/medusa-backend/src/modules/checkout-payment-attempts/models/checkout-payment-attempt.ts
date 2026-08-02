import { model } from "@medusajs/framework/utils"

export const CHECKOUT_PAYMENT_ATTEMPT_STATUSES = [
  "created",
  "awaiting_payment",
  "requires_action",
  "payment_failed",
  "payment_processing",
  "payment_succeeded",
  "order_completion_failed",
  "completed",
  "expired",
  "cancelled",
] as const

const CheckoutPaymentAttempt = model.define("checkout_payment_attempt", {
  id: model.id({ prefix: "cpa" }).primaryKey(),
  cart_id: model.text(),
  store_id: model.text(),
  customer_id: model.text().nullable(),
  provider_id: model.text(),
  payment_collection_id: model.text().nullable(),
  payment_session_id: model.text().nullable(),
  provider_payment_id: model.text().nullable(),
  completed_order_id: model.text().nullable(),
  status: model.enum([...CHECKOUT_PAYMENT_ATTEMPT_STATUSES]).default("created"),
  expires_at: model.dateTime(),
  last_error: model.text().nullable(),
  metadata: model.json().nullable(),
})

export default CheckoutPaymentAttempt
