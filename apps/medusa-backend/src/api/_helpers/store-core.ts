import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { STORE_CORE_MODULE } from "../../modules/store-core"
import StoreCoreModuleService from "../../modules/store-core/service"
import { ErrorCodes } from "../../lib/errors"
import { summarizeProductReviews } from "../../lib/product-reviews"

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
  supplier_id: product.supplier_id,
  platform_product_id: product.platform_product_id,
  basic_product_id: product.basic_product_id,
  supplier_product_id: product.supplier_product_id,
  supplier_variant_id: product.supplier_variant_id,
  supplier_material_id: product.supplier_material_id,
  supplier_size_id: product.supplier_size_id,
  supplier_color_id: product.supplier_color_id,
  view_id: product.view_id,
  design_type: product.design_type,
  medusa_product_id: product.medusa_product_id,
  medusa_variant_id: product.medusa_variant_id,
  is_cart_addable: product.status === "published" && Boolean(product.medusa_variant_id),
  design_image_url: product.design_image_url,
  mockup_image_url: product.mockup_image_url,
  print_file_url: product.print_file_url,
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

export const normalizeProductWithReviewSummary = (
  product: any,
  summary?: { average_rating: number | null; review_count: number }
) => ({
  ...normalizeProduct(product),
  average_rating: summary?.average_rating ?? null,
  review_count: summary?.review_count ?? 0
})

export const getProductReviewSummaries = async (
  storeCoreService: StoreCoreModuleService,
  storeId: string,
  productIds: string[]
) => {
  const summaries = new Map<string, { average_rating: number | null; review_count: number }>()
  const uniqueProductIds = [...new Set(productIds.filter(Boolean))]

  if (!uniqueProductIds.length) {
    return summaries
  }

  const reviews = await (storeCoreService as any).listProductReviews({
    store_id: storeId,
    product_id: uniqueProductIds,
    status: "published"
  })

  for (const productId of uniqueProductIds) {
    const summary = summarizeProductReviews(
      reviews.filter((review: any) => review.product_id === productId)
    )
    summaries.set(productId, {
      average_rating: summary.average_rating,
      review_count: summary.review_count
    })
  }

  return summaries
}

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

export const normalizeSupplierProduct = (supplierProduct: any) => ({
  supplier_product_id: supplierProduct.id,
  supplier_id: supplierProduct.supplier_id,
  external_supplier_product_id: supplierProduct.supplier_product_id,
  platform_product_id: supplierProduct.platform_product_id,
  basic_product_id: supplierProduct.basic_product_id,
  basic_product_code: supplierProduct.basic_product_code,
  basic_product_name: supplierProduct.basic_product_name,
  basic_product_en_name: supplierProduct.basic_product_en_name,
  name: supplierProduct.name,
  category: supplierProduct.category,
  purchase_price: supplierProduct.purchase_price,
  supplier_product_code: supplierProduct.supplier_product_code,
  supplier_product_name: supplierProduct.supplier_product_name,
  product_show_master_image: supplierProduct.product_show_master_image,
  supplier_mockup_image_url: supplierProduct.supplier_mockup_image_url,
  base_cost: supplierProduct.base_cost,
  currency: supplierProduct.currency,
  produce_country: supplierProduct.produce_country,
  warehouse_name: supplierProduct.warehouse_name,
  deliver_goods_text: supplierProduct.deliver_goods_text,
  status: supplierProduct.status,
  raw_json: supplierProduct.raw_json ?? {},
  created_at: supplierProduct.created_at,
  updated_at: supplierProduct.updated_at
})

export const normalizeSupplierProductVariant = (variant: any) => ({
  supplier_variant_id: variant.id,
  supplier_product_id: variant.supplier_product_id,
  basic_product_id: variant.basic_product_id,
  external_supplier_variant_id: variant.supplier_variant_id,
  supplier_variant_code: variant.supplier_variant_code,
  supplier_size_id: variant.supplier_size_id,
  supplier_color_id: variant.supplier_color_id,
  color: variant.color,
  size: variant.size,
  size_name: variant.size_name,
  color_name: variant.color_name,
  sku: variant.sku,
  cost: variant.cost,
  weight: variant.weight,
  length: variant.length,
  width: variant.width,
  height: variant.height,
  stock_status: variant.stock_status,
  raw_json: variant.raw_json ?? {},
  created_at: variant.created_at,
  updated_at: variant.updated_at
})

export const normalizeSupplierPrintSpec = (spec: any) => ({
  print_spec_id: spec.id,
  supplier_product_id: spec.supplier_product_id,
  supplier_variant_id: spec.supplier_variant_id,
  basic_product_id: spec.basic_product_id,
  view_id: spec.view_id,
  view_name: spec.view_name,
  view_en_name: spec.view_en_name,
  print_position: spec.print_position,
  print_file_width: spec.print_file_width,
  print_file_height: spec.print_file_height,
  dpi: spec.dpi,
  design_area_width: spec.design_area_width,
  design_area_height: spec.design_area_height,
  design_area_unit: spec.design_area_unit,
  design_type: spec.design_type,
  tip_level: spec.tip_level,
  accepted_formats: spec.accepted_formats ?? [],
  background_required: spec.background_required,
  safe_margin: spec.safe_margin,
  bleed: spec.bleed,
  color_mode: spec.color_mode,
  status: spec.status,
  created_at: spec.created_at,
  updated_at: spec.updated_at
})

export const normalizePlatformDesignTemplate = (template: any) => ({
  template_id: template.id,
  platform_product_id: template.platform_product_id,
  name: template.name,
  canvas_width: template.canvas_width,
  canvas_height: template.canvas_height,
  design_area_x: template.design_area_x,
  design_area_y: template.design_area_y,
  design_area_width: template.design_area_width,
  design_area_height: template.design_area_height,
  preview_background_url: template.preview_background_url,
  status: template.status,
  created_at: template.created_at,
  updated_at: template.updated_at
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

/** Load one mc_product by id within a store. Prefer retrieveProduct over list filters. */
export const getMcProductById = async (
  storeCoreService: StoreCoreModuleService,
  productId: string,
  storeId: string
) => {
  const svc = storeCoreService as StoreCoreModuleService & {
    retrieveProduct?: (id: string) => Promise<Record<string, unknown> | null>
  }

  if (typeof svc.retrieveProduct === "function") {
    try {
      const product = await svc.retrieveProduct(productId)
      if (product && product.store_id === storeId) {
        return product
      }
      if (product) {
        return null
      }
    } catch {
      // fall through to list-based lookup
    }
  }

  const scoped = await storeCoreService.listProducts({
    id: productId,
    store_id: storeId,
  })
  if (scoped[0]) {
    return scoped[0]
  }

  const scopedArray = await storeCoreService.listProducts({
    id: [productId],
    store_id: storeId,
  })
  if (scopedArray[0]) {
    return scopedArray[0]
  }

  const storeProducts = await storeCoreService.listProducts({ store_id: storeId })
  return storeProducts.find((row: { id?: string }) => row.id === productId) ?? null
}

/** MedusaService.createProducts expects an array (see phase1-dev2-bootstrap.ts). */
export const createMcProduct = async (
  storeCoreService: StoreCoreModuleService,
  data: Record<string, unknown>
) => {
  const created = await storeCoreService.createProducts([data])
  const product = Array.isArray(created) ? created[0] : created
  if (!product?.id) {
    throw new Error("createProducts did not return a product row")
  }
  return product
}

