import { model } from "@medusajs/framework/utils"

/**
 * Seller-issued coupon template for a store (ciiverse / marketplace store).
 * Amounts are USD major units (e.g. 1.00 = $1).
 */
const StoreCoupon = model.define("store_coupon", {
  id: model.id({ prefix: "scpn" }).primaryKey(),
  store_id: model.text(),
  code: model.text(),
  title: model.text(),
  description: model.text().nullable(),
  /** goods_voucher | shopping */
  coupon_type: model.text().default("goods_voucher"),
  /** USD major — flat off amount */
  discount_amount: model.number(),
  /** USD major — 0 = no threshold */
  min_subtotal: model.number().default(0),
  /** all_store | products */
  scope: model.text().default("all_store"),
  product_ids: model.json().nullable(),
  starts_at: model.dateTime().nullable(),
  ends_at: model.dateTime().nullable(),
  status: model.enum(["active", "archived"]).default("active"),
  is_default: model.boolean().default(false),
  /** how many instances to grant a buyer on claim (e.g. 5 vouchers) */
  grant_quantity: model.number().default(1),
  max_claims: model.number().nullable(),
  claim_count: model.number().default(0),
  metadata: model.json().nullable(),
})

export default StoreCoupon
