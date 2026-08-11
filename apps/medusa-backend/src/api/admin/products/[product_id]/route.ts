import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  deleteStoreProductByIdHandler,
  getStoreProductByIdHandler,
  putStoreProductByIdHandler,
} from "../../_handlers/store-product-by-id"

/** Legacy path — Medusa core may intercept GET/PUT/DELETE; prefer `/admin/store-products/:id`. */

export const GET = (req: MedusaRequest, res: MedusaResponse) => getStoreProductByIdHandler(req, res)

export const PUT = (req: MedusaRequest, res: MedusaResponse) => putStoreProductByIdHandler(req, res)

export const DELETE = (req: MedusaRequest, res: MedusaResponse) =>
  deleteStoreProductByIdHandler(req, res)
