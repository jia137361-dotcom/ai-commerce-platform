import { model } from "@medusajs/framework/utils"

const PlatformAuditEvent = model.define("platform_audit_event", {
  id: model.id().primaryKey(),
  actor_user_id: model.text().nullable(),
  action: model.text(),
  entity_type: model.text(),
  entity_id: model.text().nullable(),
  store_id: model.text().nullable(),
  metadata: model.json().nullable(),
})

export default PlatformAuditEvent
