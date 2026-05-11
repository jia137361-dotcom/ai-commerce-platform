import { model } from "@medusajs/framework/utils"

const StoreSetting = model.define("store_setting", {
  id: model.id().primaryKey(),
  store_id: model.text(),
  brand_name: model.text().nullable(),
  logo_url: model.text().nullable(),
  support_email: model.text().nullable(),
  seo_title: model.text().nullable(),
  seo_description: model.text().nullable(),
  metadata: model.json().nullable()
})

export default StoreSetting

