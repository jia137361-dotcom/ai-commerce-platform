import { model } from "@medusajs/framework/utils"

const StoreNotification = model.define("mc_store_notification", {
  id: model.id({ prefix: "ntf" }).primaryKey(),
  store_id: model.text(),
  type: model.enum(["ai_complete", "ai_failed", "order_paid", "fulfillment_failed", "refund_request"]),
  title: model.text(),
  body: model.text().nullable(),
  read_at: model.dateTime().nullable(),
  metadata: model.json().nullable(),
})

export default StoreNotification
