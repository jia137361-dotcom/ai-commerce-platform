import { model } from "@medusajs/framework/utils"

const ProductReview = model.define("mc_product_review", {
  id: model.id({ prefix: "prv" }).primaryKey(),
  store_id: model.text(),
  product_id: model.text(),
  order_id: model.text(),
  order_display_id: model.number(),
  customer_email: model.text(),
  customer_name: model.text().nullable(),
  rating: model.number(),
  title: model.text().nullable(),
  content: model.text().nullable(),
  status: model.enum(["published", "hidden"]).default("published"),
  metadata: model.json().nullable(),
})

export default ProductReview
