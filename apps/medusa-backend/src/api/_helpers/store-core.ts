import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { STORE_CORE_MODULE } from "../../modules/store-core"
import StoreCoreModuleService from "../../modules/store-core/service"
import { ErrorCodes } from "../../lib/errors"

export type ProductStatus = "draft" | "published" | "unpublished" | "archived"
export type ProductSource = "manual" | "ai"

export const getStoreCoreService = (req: MedusaRequest) => {
  return req.scope.resolve<StoreCoreModuleService>(STORE_CORE_MODULE) as any
}

export const sendError = (
  res: MedusaResponse,
  status: number,
  code: keyof typeof ErrorCodes,
  message: string
) => {
  return res.status(status).json({
    error: {
      code: ErrorCodes[code],
      message
    }
  })
}

export const normalizeProduct = (product: any) => ({
  product_id: product.id,
  store_id: product.store_id,
  title: product.title,
  description: product.description,
  status: product.status,
  source: product.source,
  ai_job_id: product.ai_job_id,
  prompt: product.prompt,
  design_image_url: product.design_image_url,
  image_url: product.image_url,
  tags: product.tags ?? [],
  price: product.price,
  variants: product.variants ?? [],
  metadata: product.metadata ?? {},
  created_at: product.created_at,
  updated_at: product.updated_at
})

export const requireText = (value: unknown) => {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

export const parseOptionalNumber = (value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return null
  }

  const parsed = typeof value === "number" ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : undefined
}

