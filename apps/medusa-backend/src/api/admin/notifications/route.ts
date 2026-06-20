import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../lib/store-context"
import {
  normalizeNotification,
  parseNotificationsListQuery,
} from "../../../lib/notifications"
import { getStoreCoreService, sendError } from "../../_helpers/store-core"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { store_id: storeId } = resolveCurrentStore(req)
  const query = parseNotificationsListQuery((req.query ?? {}) as Record<string, unknown>)
  const storeCoreService = getStoreCoreService(req)

  const all = await storeCoreService.listStoreNotifications(
    { store_id: storeId },
    { order: { created_at: "DESC" } }
  )

  const filtered = query.unreadOnly
    ? all.filter((row: { read_at?: Date | null }) => row.read_at == null)
    : all

  const page = filtered.slice(query.offset, query.offset + query.limit)

  return res.json({
    store_id: storeId,
    count: filtered.length,
    limit: query.limit,
    offset: query.offset,
    notifications: page.map((row: Record<string, unknown>) =>
      normalizeNotification(row)
    ),
  })
}
