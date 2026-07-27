import { model } from "@medusajs/framework/utils"

/** Buyer wallet instance of a store coupon. */
const BuyerCoupon = model.define("buyer_coupon", {
  id: model.id({ prefix: "bcpn" }).primaryKey(),
  store_id: model.text(),
  customer_id: model.text(),
  coupon_id: model.text(),
  status: model.enum(["available", "reserved", "used", "expired"]).default("available"),
  quantity: model.number().default(1),
  expires_at: model.dateTime().nullable(),
  claimed_at: model.dateTime(),
  reserved_cart_id: model.text().nullable(),
  used_at: model.dateTime().nullable(),
  used_order_id: model.text().nullable(),
  metadata: model.json().nullable(),
})

export default BuyerCoupon
