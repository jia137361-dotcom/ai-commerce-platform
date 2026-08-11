import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../lib/store-context"
import { getStoreCoreService } from "../../_helpers/store-core"

import { readFollowerCount } from "../../../lib/store-engagement"

const normalizeStoreSettings = (settings: any, storeId: string) => {
  const metadata = (settings?.metadata ?? {}) as Record<string, unknown>
  return {
  store_id: settings?.store_id ?? storeId,
  brand_name: settings?.brand_name ?? null,
  logo_url: settings?.logo_url ?? null,
  support_email: settings?.support_email ?? null,
  seo_title: settings?.seo_title ?? null,
  seo_description: settings?.seo_description ?? null,
  metadata,
  follower_count: readFollowerCount(metadata),
}
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { store_id: storeId } = resolveCurrentStore(req)
  const storeCoreService = getStoreCoreService(req)
  const settings = await storeCoreService.listStoreSettings({ store_id: storeId })

  return res.json({
    settings: normalizeStoreSettings(settings[0], storeId)
  })
}

