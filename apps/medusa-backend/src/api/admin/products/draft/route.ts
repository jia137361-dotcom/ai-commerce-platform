import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../../lib/store-context"
import {
  getStoreCoreService,
  normalizeProduct,
  parseOptionalNumber,
  requireText,
  sendError
} from "../../../_helpers/store-core"

type CreateDraftProductBody = {
  store_id?: string
  title?: string
  description?: string
  image_url?: string
  design_image_url?: string
  tags?: string[]
  category_ids?: string[]
  price?: number | string
  variants?: unknown[]
  source?: "manual" | "ai"
  ai_job_id?: string | null
  prompt?: string | null
  metadata?: Record<string, unknown>
}

export const POST = async (
  req: MedusaRequest<CreateDraftProductBody>,
  res: MedusaResponse
) => {
  const body = req.body ?? {}
  const title = requireText(body.title)

  if (!title) {
    return sendError(res, 400, "VALIDATION_ERROR", "title is required")
  }

  const source = body.source ?? "manual"

  if (!["manual", "ai"].includes(source)) {
    return sendError(res, 400, "VALIDATION_ERROR", "source must be manual or ai")
  }

  const price = parseOptionalNumber(body.price)

  if (price === undefined) {
    return sendError(res, 400, "VALIDATION_ERROR", "price must be a number")
  }

  const context = resolveCurrentStore(req)
  const storeId = requireText(body.store_id) ?? context.store_id
  const storeCoreService = getStoreCoreService(req)

  const stores = await storeCoreService.listStores({ id: storeId })

  if (!stores.length) {
    return sendError(res, 404, "STORE_NOT_FOUND", "Store not found")
  }

  const product = await storeCoreService.createProducts({
    store_id: storeId,
    title,
    description: body.description ?? null,
    status: "draft",
    source,
    ai_job_id: body.ai_job_id ?? null,
    prompt: body.prompt ?? null,
    design_image_url: body.design_image_url ?? body.image_url ?? null,
    image_url: body.image_url ?? body.design_image_url ?? null,
    tags: Array.isArray(body.tags) ? body.tags : [],
    category_ids: Array.isArray(body.category_ids) ? body.category_ids : [],
    price,
    variants: Array.isArray(body.variants) ? body.variants : [],
    metadata: body.metadata ?? {}
  })

  return res.status(201).json({
    product_id: product.id,
    store_id: product.store_id,
    status: product.status,
    product: normalizeProduct(product)
  })
}

