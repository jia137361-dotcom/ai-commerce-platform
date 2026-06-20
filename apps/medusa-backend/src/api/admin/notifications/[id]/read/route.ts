import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../../../lib/store-context"
import { normalizeNotification } from "../../../../../lib/notifications"
import { getStoreCoreService, sendError } from "../../../../_helpers/store-core"

export const PATCH = async (req: MedusaRequest, res: MedusaResponse) => {
  const notificationId = req.params.id as string
  const { store_id: storeId } = resolveCurrentStore(req)
  const storeCoreService = getStoreCoreService(req)

  const rows = await storeCoreService.listStoreNotifications({ id: notificationId })
  const row = rows[0]

  if (!row) {
    return sendError(res, 404, "VALIDATION_ERROR", "Notification not found")
  }

  if (row.store_id !== storeId) {
    return sendError(res, 403, "VALIDATION_ERROR", "Notification does not belong to current store")
  }

  const [updated] = await storeCoreService.updateStoreNotifications({
    selector: { id: notificationId, store_id: storeId },
    data: { read_at: new Date() },
  })

  return res.json({ notification: normalizeNotification(updated as Record<string, unknown>) })
}
