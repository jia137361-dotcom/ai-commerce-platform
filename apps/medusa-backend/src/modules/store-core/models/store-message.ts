import { model } from "@medusajs/framework/utils"

const StoreMessage = model.define("mc_store_message", {
  id: model.id({ prefix: "smsg" }).primaryKey(),
  store_id: model.text(),
  customer_id: model.text(),
  customer_email: model.text(),
  customer_name: model.text().nullable(),
  order_id: model.text().nullable(),
  sender_role: model.enum(["buyer", "seller"]),
  body: model.text(),
  read_by_buyer_at: model.dateTime().nullable(),
  read_by_seller_at: model.dateTime().nullable(),
})

export default StoreMessage
