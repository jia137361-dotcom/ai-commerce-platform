import { model } from "@medusajs/framework/utils"

const StoreMember = model.define("store_member", {
  id: model.id().primaryKey(),
  store_id: model.text(),
  user_id: model.text(),
  role: model.enum(["owner", "admin", "designer", "operator", "viewer"]).default("owner")
})

export default StoreMember

