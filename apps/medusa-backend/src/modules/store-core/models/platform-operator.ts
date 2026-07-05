import { model } from "@medusajs/framework/utils"

const PlatformOperator = model.define("platform_operator", {
  id: model.id().primaryKey(),
  user_id: model.text(),
  role: model.enum(["admin", "viewer"]).default("admin"),
  status: model.enum(["active", "disabled"]).default("active"),
})

export default PlatformOperator
