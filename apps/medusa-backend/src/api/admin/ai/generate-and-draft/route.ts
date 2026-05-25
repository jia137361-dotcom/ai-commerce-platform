import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../../lib/store-context"
import { callAiWorkerGenerateProduct } from "../../../../lib/ai-worker-client"
import {
  createMcProduct,
  getStoreCoreService,
  normalizeProduct,
  parseOptionalNumber,
  requireText,
  sendError
} from "../../../_helpers/store-core"
import { getS2bdiyConfig } from "../../../../lib/s2bdiy"
import {
  provisionS2bProductForMcProduct,
  resolveS2bIdsFromEnvOrVariant,
} from "../../../../lib/s2bdiy/provision-s2b-product"

type GenerateAndDraftBody = {
  store_id?: string
  prompt?: string
  platform_product_id?: string
  supplier_product_id?: string
  supplier_variant_id?: string | null
  print_position?: string
  category_ids?: string[]
  medusa_product_id?: string | null
  medusa_variant_id?: string | null
}

export const POST = async (
  req: MedusaRequest<GenerateAndDraftBody>,
  res: MedusaResponse
) => {
  try {
    return await handleGenerateAndDraft(req, res)
  } catch (error: unknown) {
    console.error("generate-and-draft failed:", error)
    const message =
      error instanceof Error ? error.message : "generate-and-draft failed"
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message
      }
    })
  }
}

async function handleGenerateAndDraft(
  req: MedusaRequest<GenerateAndDraftBody>,
  res: MedusaResponse
) {
  const body = req.body ?? {}
  const prompt = requireText(body.prompt)

  if (!prompt) {
    return sendError(res, 400, "VALIDATION_ERROR", "prompt is required")
  }

  const platformProductId = requireText(body.platform_product_id) ?? "pp_tshirt"
  const supplierProductId = requireText(body.supplier_product_id) ?? "sp_tshirt"
  const supplierVariantId = requireText(body.supplier_variant_id) ?? "spv_tshirt_black_m"
  const printPosition = requireText(body.print_position) ?? "front"

  const context = resolveCurrentStore(req)
  const storeId = requireText(body.store_id) ?? context.store_id
  const storeCoreService = getStoreCoreService(req)

  const stores = await storeCoreService.listStores({ id: storeId })
  if (!stores.length) {
    return sendError(res, 404, "STORE_NOT_FOUND", "Store not found")
  }

  let generated
  try {
    generated = await callAiWorkerGenerateProduct({
      prompt,
      platform_product_id: platformProductId,
      supplier_product_id: supplierProductId,
      supplier_variant_id: supplierVariantId,
      print_position: printPosition,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "AI worker request failed"
    return sendError(res, 502, "VALIDATION_ERROR", message)
  }

  const title = requireText(generated.title)
  if (!title) {
    return sendError(res, 502, "VALIDATION_ERROR", "AI worker returned empty title")
  }

  const price = parseOptionalNumber(generated.price_suggestion)
  if (price === undefined) {
    return sendError(res, 502, "VALIDATION_ERROR", "AI worker returned invalid price_suggestion")
  }

  const supplierProducts = await storeCoreService.listSupplierProducts({
    id: supplierProductId,
    status: "active"
  })
  const supplierProduct = supplierProducts[0]
  if (!supplierProduct) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "supplier_product_id must reference an active supplier product"
    )
  }

  const cost =
    parseOptionalNumber(supplierProduct.base_cost) ??
    parseOptionalNumber(generated.price_suggestion) ??
    price

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

  const product = await createMcProduct(storeCoreService, {
    store_id: storeId,
    title,
    description: generated.description ?? null,
    status: "draft",
    source: "ai",
    ai_job_id: generated.ai_job_id,
    prompt: generated.prompt,
    supplier_id: generated.supplier_id ?? supplierProduct.supplier_id,
    platform_product_id: platformProductId,
    supplier_product_id: supplierProductId,
    supplier_variant_id: supplierVariantId,
    medusa_product_id: requireText(body.medusa_product_id),
    medusa_variant_id: requireText(body.medusa_variant_id),
    design_image_url: generated.design_image_url,
    mockup_image_url: generated.mockup_image_url,
    print_file_url: generated.print_file_url,
    image_url: generated.mockup_image_url ?? generated.design_image_url,
    tags: Array.isArray(generated.tags) ? generated.tags : [],
    category_ids: categoryIds,
    price,
    cost,
    variants: null,
    metadata: {
      seo: generated.seo ?? {},
      print_position: printPosition,
      ai_worker_mock_mode: generated.mock_mode ?? false
    }
  })

  let s2bProvisionError: string | null = null
  if (getS2bdiyConfig() && generated.print_file_url) {
    const variants = await storeCoreService.listSupplierProductVariants({ id: supplierVariantId })
    const variant = variants[0] as Record<string, unknown> | undefined
    const spRows = await storeCoreService.listSupplierProducts({ id: supplierProductId })
    const sp = spRows[0] as Record<string, unknown> | undefined
    const basicFromCatalog =
      sp?.basic_product_id != null ? String(sp.basic_product_id) : null
    const productForS2b = {
      ...(product as Record<string, unknown>),
      metadata: {
        ...((product.metadata as Record<string, unknown> | null) ?? {}),
        ...(basicFromCatalog ? { basic_product_id: basicFromCatalog } : {}),
      },
    }
    const s2bIds = resolveS2bIdsFromEnvOrVariant(variant, productForS2b)
    if (s2bIds) {
      try {
        await provisionS2bProductForMcProduct(storeCoreService, {
          productId: product.id,
          storeId,
          title,
          printFileUrl: generated.print_file_url,
          basicProductId: s2bIds.basicProductId,
          sizeId: s2bIds.sizeId,
          colorId: s2bIds.colorId,
          viewId: s2bIds.viewId,
        })
      } catch (error: unknown) {
        s2bProvisionError = error instanceof Error ? error.message : String(error)
        console.error("S2BDIY provision failed:", error)
      }
    }
  }

  const refreshed = await storeCoreService.listProducts({ id: product.id })
  const finalProduct = refreshed[0] ?? product

  return res.status(201).json({
    product_id: finalProduct.id,
    store_id: finalProduct.store_id,
    status: finalProduct.status,
    ai_job_id: generated.ai_job_id,
    generation: generated,
    s2b_provision_error: s2bProvisionError,
    product: normalizeProduct(finalProduct)
  })
}
