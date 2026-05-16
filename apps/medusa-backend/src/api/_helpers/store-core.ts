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
  platform_product_id: product.platform_product_id,
  supplier_product_id: product.supplier_product_id,
  medusa_product_id: product.medusa_product_id,
  medusa_variant_id: product.medusa_variant_id,
  is_cart_addable: product.status === "published" && Boolean(product.medusa_variant_id),
  design_image_url: product.design_image_url,
  image_url: product.image_url,
  tags: product.tags ?? [],
  price: product.price,
  cost: product.cost,
  variants: product.variants ?? [],
  category_ids: product.category_ids ?? [],
  metadata: product.metadata ?? {},
  created_at: product.created_at,
  updated_at: product.updated_at
})

export const normalizeCategory = (category: any) => ({
  category_id: category.id,
  store_id: category.store_id,
  name: category.name,
  slug: category.slug,
  description: category.description,
  parent_id: category.parent_id,
  sort_order: category.sort_order,
  created_at: category.created_at,
  updated_at: category.updated_at
})

export const normalizePlatformProduct = (platformProduct: any) => ({
  platform_product_id: platformProduct.id,
  title: platformProduct.title,
  category: platformProduct.category,
  description: platformProduct.description,
  base_cost: platformProduct.base_cost,
  supplier: platformProduct.supplier,
  supplier_product_id: platformProduct.supplier_product_id,
  available_colors: platformProduct.available_colors ?? [],
  available_sizes: platformProduct.available_sizes ?? [],
  print_area: platformProduct.print_area ?? {},
  status: platformProduct.status,
  created_at: platformProduct.created_at,
  updated_at: platformProduct.updated_at
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

