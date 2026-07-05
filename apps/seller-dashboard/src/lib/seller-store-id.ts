const STORAGE_KEY = "seller_store_id"

const readEnvStoreId = () => import.meta.env.VITE_STORE_ID?.trim() || "default_store"

export const getSellerStoreId = () => {
  if (typeof window === "undefined") return readEnvStoreId()
  return localStorage.getItem(STORAGE_KEY)?.trim() || readEnvStoreId()
}

export const setSellerStoreId = (storeId: string | null) => {
  if (typeof window === "undefined") return
  if (storeId?.trim()) {
    localStorage.setItem(STORAGE_KEY, storeId.trim())
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export const clearSellerStoreId = () => setSellerStoreId(null)
