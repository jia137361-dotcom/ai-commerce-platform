import { model } from "@medusajs/framework/utils"

const DomainBinding = model.define("domain_binding", {
  id: model.id().primaryKey(),
  store_id: model.text(),
  domain: model.text(),
  status: model.enum(["pending", "verified", "active", "failed"]).default("pending"),
  ssl_status: model.text().nullable(),
  verified_at: model.dateTime().nullable()
})

export default DomainBinding

