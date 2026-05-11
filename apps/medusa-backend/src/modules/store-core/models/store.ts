import { model } from "@medusajs/framework/utils"

const Store = model.define("store", {
  id: model.id().primaryKey(),
  owner_user_id: model.text().nullable(),
  name: model.text(),
  slug: model.text(),
  logo_url: model.text().nullable(),
  banner_url: model.text().nullable(),
  description: model.text().nullable(),
  seo_title: model.text().nullable(),
  seo_description: model.text().nullable(),
  status: model.enum(["draft", "active", "suspended", "archived"]).default("active"),
  stripe_account_id: model.text().nullable()
})

export default Store

