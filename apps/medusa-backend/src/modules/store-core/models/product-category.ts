import { model } from "@medusajs/framework/utils"

const ProductCategory = model.define("mc_product_category", {
  id: model.id({ prefix: "cat" }).primaryKey(),
  store_id: model.text(),
  name: model.text(),
  slug: model.text(),
  description: model.text().nullable(),
  parent_id: model.text().nullable(),
  sort_order: model.number().default(0),
  supplier_category_id: model.text().nullable(),
  level: model.number().default(1),
})

export default ProductCategory
