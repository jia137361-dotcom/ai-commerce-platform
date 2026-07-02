import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../lib/store-context"
import {
  getStoreCoreService,
  requireText,
  sendError
} from "../../_helpers/store-core"

type StoreSettingsBody = {
  store_id?: string
  brand_name?: string | null
  logo_url?: string | null
  support_email?: string | null
  seo_title?: string | null
  seo_description?: string | null
  metadata?: Record<string, unknown> | null
}

const normalizeStoreSettings = (settings: any, storeId: string) => ({
  store_id: settings?.store_id ?? storeId,
  brand_name: settings?.brand_name ?? null,
  logo_url: settings?.logo_url ?? null,
  support_email: settings?.support_email ?? null,
  seo_title: settings?.seo_title ?? null,
  seo_description: settings?.seo_description ?? null,
  metadata: settings?.metadata ?? {},
  created_at: settings?.created_at,
  updated_at: settings?.updated_at
})

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { store_id: storeId } = resolveCurrentStore(req)
  const storeCoreService = getStoreCoreService(req)
  const settings = await storeCoreService.listStoreSettings({ store_id: storeId })

  return res.json({
    settings: normalizeStoreSettings(settings[0], storeId)
  })
}

export const PUT = async (
  req: MedusaRequest<StoreSettingsBody>,
  res: MedusaResponse
) => {
  const body = req.body ?? {}
  const { store_id: contextStoreId } = resolveCurrentStore(req)
  const storeId = requireText(body.store_id) ?? contextStoreId
  const storeCoreService = getStoreCoreService(req)
  const stores = await storeCoreService.listStores({ id: storeId })

  if (!stores.length) {
    return sendError(res, 404, "STORE_NOT_FOUND", "Store not found")
  }

  const existing = await storeCoreService.listStoreSettings({ store_id: storeId })
  const data = {
    store_id: storeId,
    brand_name: body.brand_name ?? null,
    logo_url: body.logo_url ?? null,
    support_email: body.support_email ?? null,
    seo_title: body.seo_title ?? null,
    seo_description: body.seo_description ?? null,
    metadata: body.metadata ?? {}
  }

  if (existing.length) {
    const [updatedSettings] = await storeCoreService.updateStoreSettings({
      selector: {
        id: existing[0].id,
        store_id: storeId
      },
      data
    })

    return res.json({
      settings: normalizeStoreSettings(updatedSettings, storeId)
    })
  }

  const settings = await storeCoreService.createStoreSettings(data)

  return res.status(201).json({
    settings: normalizeStoreSettings(settings, storeId)
  })
}

