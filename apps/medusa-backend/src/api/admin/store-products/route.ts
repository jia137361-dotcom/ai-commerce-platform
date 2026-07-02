import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { listStoreProductsHandler } from "../_handlers/store-products-list"

/** mc_product list — use this instead of `/admin/products` (Medusa native route conflict). */
export const GET = (req: MedusaRequest, res: MedusaResponse) => listStoreProductsHandler(req, res)
