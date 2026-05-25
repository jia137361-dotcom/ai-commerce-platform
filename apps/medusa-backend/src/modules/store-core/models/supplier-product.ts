import { model } from "@medusajs/framework/utils"

const SupplierProduct = model.define("mc_supplier_product", {
  id: model.id({ prefix: "sp" }).primaryKey(),
  supplier_id: model.text(),
  supplier_product_id: model.text(),
  platform_product_id: model.text(),
  basic_product_id: model.text().nullable(),
  basic_product_code: model.text().nullable(),
  basic_product_name: model.text().nullable(),
  basic_product_en_name: model.text().nullable(),
  name: model.text(),
  category: model.text(),
  base_cost: model.float().default(0),
  purchase_price: model.float().nullable(),
  currency: model.text().default("usd"),
  product_show_master_image: model.text().nullable(),
  supplier_mockup_image_url: model.text().nullable(),
  produce_country: model.text().nullable(),
  warehouse_name: model.text().nullable(),
  deliver_goods_text: model.text().nullable(),
  status: model.enum(["active", "inactive", "archived"]).default("active"),
  raw_json: model.json().nullable()
})

export default SupplierProduct
