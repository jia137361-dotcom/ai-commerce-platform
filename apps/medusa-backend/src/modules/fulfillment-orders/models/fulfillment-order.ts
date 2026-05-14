import { model } from "@medusajs/framework/utils"

const FulfillmentOrder = model.define("fulfillment_order", {
  id: model.id().primaryKey(),
  order_id: model.text(),
  store_id: model.text(),
  /** 用于 payment.captured 时反查订单 */
  payment_collection_id: model.text().nullable(),
  supplier: model.text().default("mock"),
  supplier_order_id: model.text().nullable(),
  payload: model.json().nullable(),
  pushed_at: model.dateTime().nullable(),
  failed_reason: model.text().nullable(),
  status: model
    .enum(["pending_capture", "waiting", "pushed", "fulfilled", "failed", "canceled"])
    .default("pending_capture"),
})

export default FulfillmentOrder
