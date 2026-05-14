import { model } from "@medusajs/framework/utils"

const FulfillmentOrder = model.define("fulfillment_order", {
  id: model.id().primaryKey(),
  order_id: model.text(),
  store_id: model.text(),
  /** 用于 payment.captured 时反查订单（与 cart 完成时写入一致） */
  payment_collection_id: model.text().nullable(),
  status: model
    .enum(["pending_capture", "waiting", "fulfilled", "canceled"])
    .default("pending_capture"),
})

export default FulfillmentOrder
