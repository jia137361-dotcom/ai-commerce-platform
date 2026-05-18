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
  mockup_image_url?: string
  print_file_url?: string
  platform_product_id?: string | null
  supplier_product_id?: string | null
  supplier_variant_id?: string | null
  medusa_product_id?: string | null
  medusa_variant_id?: string | null
  tags?: string[]
  category_ids?: string[]
  price?: number | string
  cost?: number | string
  variants?: unknown[]
  source?: "manual" | "ai"
  ai_job_id?: string | null
  prompt?: string | null
  supplier_id?: string | null
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
  const cost = parseOptionalNumber(body.cost)

  if (price === undefined) {
    return sendError(res, 400, "VALIDATION_ERROR", "price must be a number")
  }

  if (cost === undefined) {
    return sendError(res, 400, "VALIDATION_ERROR", "cost must be a number")
  }

  const context = resolveCurrentStore(req)
  const storeId = requireText(body.store_id) ?? context.store_id
  const platformProductId = requireText(body.platform_product_id)
  const supplierId = requireText(body.supplier_id)
  const supplierProductId = requireText(body.supplier_product_id)
  const supplierVariantId = requireText(body.supplier_variant_id)
  const medusaProductId = requireText(body.medusa_product_id)
  const medusaVariantId = requireText(body.medusa_variant_id)
  const storeCoreService = getStoreCoreService(req)

  const stores = await storeCoreService.listStores({ id: storeId })

  if (!stores.length) {
    return sendError(res, 404, "STORE_NOT_FOUND", "Store not found")
  }

  const categoryIds = Array.isArray(body.category_ids) ? body.category_ids : []

  if (categoryIds.length) {
    const categories = await storeCoreService.listProductCategories({
      id: categoryIds,
      store_id: storeId
    })

    if (categories.length !== categoryIds.length) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "category_ids must belong to current store"
      )
    }
  }

  let platformProduct: any = null
  let supplierProduct: any = null
  let supplierVariant: any = null

  if (platformProductId) {
    const platformProducts = await storeCoreService.listPlatformProducts({
      id: platformProductId,
      status: "active"
    })

    platformProduct = platformProducts[0]

    if (!platformProduct) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "platform_product_id must reference an active platform product"
      )
    }
  }

  if (supplierId) {
    const suppliers = await storeCoreService.listSuppliers({
      id: supplierId,
      status: "active"
    })

    if (!suppliers.length) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "supplier_id must reference an active supplier"
      )
    }
  }

  if (supplierProductId) {
    const supplierProducts = await storeCoreService.listSupplierProducts({
      id: supplierProductId,
      status: "active"
    })

    supplierProduct = supplierProducts[0]

    if (!supplierProduct) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "supplier_product_id must reference an active supplier product"
      )
    }

    if (supplierId && supplierProduct.supplier_id !== supplierId) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "supplier_product_id must belong to supplier_id"
      )
    }

    if (
      platformProductId &&
      supplierProduct.platform_product_id !== platformProductId
    ) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "supplier_product_id must belong to platform_product_id"
      )
    }
  }

  if (supplierVariantId) {
    const supplierVariants = await storeCoreService.listSupplierProductVariants({
      id: supplierVariantId
    })

    supplierVariant = supplierVariants[0]

    if (!supplierVariant) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "supplier_variant_id must reference a supplier product variant"
      )
    }

    if (
      supplierProductId &&
      supplierVariant.supplier_product_id !== supplierProductId
    ) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "supplier_variant_id must belong to supplier_product_id"
      )
    }
  }

  const inheritedSupplierProductId =
    supplierProductId ?? platformProduct?.supplier_product_id ?? null
  const inheritedCost =
    cost ?? supplierVariant?.cost ?? supplierProduct?.base_cost ?? platformProduct?.base_cost ?? null

  const product = await storeCoreService.createProducts({
    store_id: storeId,
    title,
    description: body.description ?? null,
    status: "draft",
    source,
    ai_job_id: body.ai_job_id ?? null,
    prompt: body.prompt ?? null,
    supplier_id: supplierId ?? supplierProduct?.supplier_id ?? null,
    platform_product_id: platformProductId,
    supplier_product_id: inheritedSupplierProductId,
    supplier_variant_id: supplierVariantId,
    medusa_product_id: medusaProductId,
    medusa_variant_id: medusaVariantId,
    design_image_url: body.design_image_url ?? body.image_url ?? null,
    mockup_image_url: body.mockup_image_url ?? null,
    print_file_url: body.print_file_url ?? null,
    image_url: body.image_url ?? body.design_image_url ?? null,
    tags: Array.isArray(body.tags) ? body.tags : [],
    category_ids: categoryIds,
    price,
    cost: inheritedCost,
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

