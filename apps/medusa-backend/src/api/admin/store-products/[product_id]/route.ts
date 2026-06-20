import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  deleteStoreProductByIdHandler,
  getStoreProductByIdHandler,
  putStoreProductByIdHandler,
} from "../../_handlers/store-product-by-id"

/** Store-core mc_product CRUD — avoids Medusa native `/admin/products/:id` route conflict. */

export const GET = (req: MedusaRequest, res: MedusaResponse) => getStoreProductByIdHandler(req, res)

export const PUT = (req: MedusaRequest, res: MedusaResponse) => putStoreProductByIdHandler(req, res)

export const DELETE = (req: MedusaRequest, res: MedusaResponse) =>
  deleteStoreProductByIdHandler(req, res)
