import type { MedusaRequest } from "@medusajs/framework/http"
import { getStoreCoreService } from "../api/_helpers/store-core"
import { resolveCurrentStore } from "./store-context"

type StoreSettingsRecord = {
  id: string
  store_id: string
  brand_name?: string | null
  logo_url?: string | null
  support_email?: string | null
  seo_title?: string | null
  seo_description?: string | null
  metadata?: Record<string, unknown> | null
}

export async function getStoreSettingsRecord(req: MedusaRequest, storeId?: string): Promise<{
  storeId: string
  settings: StoreSettingsRecord | null
}> {
  const { store_id: contextStoreId } = resolveCurrentStore(req)
  const resolvedStoreId = storeId ?? contextStoreId
  const storeCoreService = getStoreCoreService(req)
  const settings = (await storeCoreService.listStoreSettings({ store_id: resolvedStoreId }))[0] ?? null
  return { storeId: resolvedStoreId, settings }
}

export async function upsertStoreSettings(req: MedusaRequest, data: {
  logo_url?: string | null
  metadata?: Record<string, unknown>
}) {
  const { storeId, settings } = await getStoreSettingsRecord(req)
  const storeCoreService = getStoreCoreService(req)

  if (settings) {
    const [updated] = await storeCoreService.updateStoreSettings({
      selector: { id: settings.id, store_id: storeId },
      data: {
        logo_url: data.logo_url ?? settings.logo_url ?? null,
        metadata: data.metadata ?? settings.metadata ?? {},
      },
    })
    return updated
  }

  return storeCoreService.createStoreSettings({
    store_id: storeId,
    brand_name: null,
    logo_url: data.logo_url ?? null,
    support_email: null,
    seo_title: null,
    seo_description: null,
    metadata: data.metadata ?? {},
  })
}

export async function mergeStoreSettingsMetadata(
  req: MedusaRequest,
  patch: (metadata: Record<string, unknown>) => Record<string, unknown>
) {
  const { settings } = await getStoreSettingsRecord(req)
  const current = { ...(settings?.metadata ?? {}) }
  return upsertStoreSettings(req, { metadata: patch(current) })
}
