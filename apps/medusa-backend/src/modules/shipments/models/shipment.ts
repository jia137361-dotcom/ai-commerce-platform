import { model } from "@medusajs/framework/utils"

const Shipment = model.define("shipment", {
  id: model.id().primaryKey(),
  fulfillment_order_id: model.text(),
  carrier: model.text().nullable(),
  tracking_number: model.text().nullable(),
  status: model.enum(["pending", "shipped", "delivered"]).default("pending"),
})

export default Shipment
