import { apiFetch } from "./client"

export type StoreSettings = {
  store_id: string
  brand_name?: string | null
  logo_url?: string | null
  support_email?: string | null
  seo_title?: string | null
  seo_description?: string | null
  metadata?: Record<string, unknown>
}

export const getStoreContext = (storeId?: string) =>
  apiFetch<{ store_context: { store_id: string; source: string } }>("/store-context", { storeId })

export const getStoreSettings = (storeId: string) =>
  apiFetch<{ settings: StoreSettings }>("/store/settings", { storeId, publishable: true })

export const getAdminStoreSettings = (storeId: string, token: string) =>
  apiFetch<{ settings: StoreSettings }>("/admin/store-settings", { storeId, adminToken: token })

export const saveAdminStoreSettings = (storeId: string, token: string, settings: Partial<StoreSettings>) =>
  apiFetch<{ settings: StoreSettings }>("/admin/store-settings", {
    method: "PUT",
    storeId,
    adminToken: token,
    body: settings,
  })

export const health = () => apiFetch<Record<string, unknown>>("/health")
