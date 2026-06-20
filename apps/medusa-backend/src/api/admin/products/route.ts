import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { listStoreProductsHandler } from "../_handlers/store-products-list"

/** Legacy list path — delegates to store-core handler. Prefer `GET /admin/store-products`. */
export const GET = (req: MedusaRequest, res: MedusaResponse) => listStoreProductsHandler(req, res)
