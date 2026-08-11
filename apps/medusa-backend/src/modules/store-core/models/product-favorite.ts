import { model } from "@medusajs/framework/utils"

const ProductFavorite = model.define("mc_product_favorite", {
  id: model.id({ prefix: "pf" }).primaryKey(),
  store_id: model.text(),
  product_id: model.text(),
  customer_id: model.text(),
})

export default ProductFavorite
