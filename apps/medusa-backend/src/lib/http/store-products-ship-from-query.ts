import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

declare module "@medusajs/framework/http" {
  interface MedusaRequest {
    shipFromFilter?: string
  }
}

/** Runs on app.use('/store') before Medusa core GET /store/products query validation. */
export const stashStoreProductsShipFromQuery = (
  req: MedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) => {
  if (req.method !== "GET") return next()
  const url = req.originalUrl ?? req.url ?? ""
  if (!url.startsWith("/store/products")) return next()
  const raw = req.query?.ship_from
  if (typeof raw !== "string" || !raw.trim()) return next()
  req.shipFromFilter = raw.trim()
  delete (req.query as Record<string, unknown>).ship_from
  return next()
}
