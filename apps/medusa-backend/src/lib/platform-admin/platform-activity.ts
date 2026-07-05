import type { MedusaContainer } from "@medusajs/framework/types"
import { STORE_CORE_MODULE } from "../../modules/store-core"
import type StoreCoreModuleService from "../../modules/store-core/service"

export async function listPlatformActivity(
  container: MedusaContainer,
  options: { limit: number; offset: number }
) {
  const storeCore = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const events = await storeCore.listPlatformAuditEvents({}, {
    take: 1000,
    order: { created_at: "DESC" },
  })

  const page = events.slice(options.offset, options.offset + options.limit)

  return {
    count: events.length,
    events: page.map((event) => ({
      id: event.id,
      actor_user_id: event.actor_user_id ?? null,
      action: event.action,
      entity_type: event.entity_type,
      entity_id: event.entity_id ?? null,
      store_id: event.store_id ?? null,
      metadata: event.metadata ?? {},
      created_at: event.created_at ?? null,
    })),
  }
}
