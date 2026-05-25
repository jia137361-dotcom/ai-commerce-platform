import { model } from "@medusajs/framework/utils"

const SupplierOrderItem = model.define("mc_supplier_order_item", {
  id: model.id({ prefix: "soi" }).primaryKey(),
  supplier_order_id: model.text(),
  order_item_id: model.text().nullable(),
  third_item_id: model.text().nullable(),
  basic_product_id: model.text().nullable(),
  supplier_product_id: model.text().nullable(),
  supplier_product_name: model.text().nullable(),
  supplier_size_id: model.text().nullable(),
  supplier_color_id: model.text().nullable(),
  supplier_size_name: model.text().nullable(),
  supplier_color_name: model.text().nullable(),
  show_image: model.text().nullable(),
  quantity: model.number().default(1),
  product_amount: model.float().nullable(),
  total_amount: model.float().nullable(),
  total_weight: model.float().nullable(),
  raw_json: model.json().nullable(),
})

export default SupplierOrderItem
