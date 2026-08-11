import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../../lib/store-context"
import { getStoreCoreService } from "../../../_helpers/store-core"

export const PATCH = async (req: MedusaRequest, res: MedusaResponse) => {
  const { store_id: storeId } = resolveCurrentStore(req)
  const storeCoreService = getStoreCoreService(req)

  const all = await storeCoreService.listStoreNotifications({ store_id: storeId })
  const unread = all.filter((row: { read_at?: Date | null }) => row.read_at == null)
  const now = new Date()

  await Promise.all(
    unread.map((row: { id: string }) =>
      storeCoreService.updateStoreNotifications({
        selector: { id: row.id, store_id: storeId },
        data: { read_at: now },
      })
    )
  )

  return res.json({ store_id: storeId, marked_read: unread.length })
}
