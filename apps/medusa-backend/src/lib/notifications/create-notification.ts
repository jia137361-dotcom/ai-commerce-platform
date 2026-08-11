import type StoreCoreModuleService from "../../modules/store-core/service"
import type { NotificationType } from "../admin-notifications"

export const createStoreNotification = async (
  storeCoreService: StoreCoreModuleService,
  input: {
    store_id: string
    type: NotificationType
    title: string
    body?: string | null
    metadata?: Record<string, unknown>
  }
) => {
  const created = await (storeCoreService as any).createStoreNotifications([
    {
      store_id: input.store_id,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      metadata: input.metadata ?? {},
    },
  ])
  return Array.isArray(created) ? created[0] : created
}
