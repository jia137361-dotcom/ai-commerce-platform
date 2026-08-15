import type { MedusaRequest } from "@medusajs/framework/http"

export const DEFAULT_STORE_ID = process.env.DEFAULT_STORE_ID || "01KX2P21ZPPSRYY6VJJERRBQYG"

export type StoreContext = {
  store_id: string
  source: "header" | "host" | "default"
}

export const resolveCurrentStore = (req: MedusaRequest): StoreContext => {
  const headerValue = req.headers["x-store-id"]
  const headerStoreId = Array.isArray(headerValue) ? headerValue[0] : headerValue

  if (headerStoreId && headerStoreId.trim().length > 0) {
    return {
      store_id: headerStoreId.trim(),
      source: "header"
    }
  }

  const host = req.headers.host

  if (host && host.startsWith("localhost")) {
    return {
      store_id: DEFAULT_STORE_ID,
      source: "host"
    }
  }

  return {
    store_id: DEFAULT_STORE_ID,
    source: "default"
  }
}
