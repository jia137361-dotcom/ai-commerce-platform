import { model } from "@medusajs/framework/utils"

const Shipment = model.define("shipment", {
  id: model.id().primaryKey(),
  store_id: model.text(),
  order_id: model.text(),
  fulfillment_order_id: model.text(),
  carrier: model.text().nullable(),
  tracking_number: model.text().nullable(),
  tracking_url: model.text().nullable(),
  shipped_at: model.dateTime().nullable(),
  delivered_at: model.dateTime().nullable(),
  status: model.enum(["pending", "shipped", "delivered"]).default("pending"),
})

export default Shipment
