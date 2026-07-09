import type { MedusaContainer } from "@medusajs/framework/types"
import { STORE_CORE_MODULE } from "../../modules/store-core"
import type StoreCoreModuleService from "../../modules/store-core/service"
import { callAiWorkerGenerateProduct, type AiWorkerGenerateResult } from "../ai-worker-client"
import {
  createMcProduct,
  getMcProductById,
  normalizeProduct,
  parseOptionalNumber,
  requireText,
} from "../../api/_helpers/store-core"
import { isS2bdiyEnabled } from "../../modules/suppliers/s2bdiy/config"
import {
  provisionS2bProductForMcProduct,
  resolveS2bIdsFromEnvOrVariant,
} from "../s2bdiy/provision-s2b-product"
import { convertCnyToUsd } from "../pricing"

export type AiGenerationPayload = {
  prompt: string
  platform_product_id: string
  supplier_product_id: string
  supplier_variant_id: string
  print_position: string
  category_ids?: string[]
  marketplace_category?: string | null
  marketplace_category_label?: string | null
  style_preset?: string | null
  style_preset_label?: string | null
  medusa_product_id?: string | null
  medusa_variant_id?: string | null
}

export type AiGenerationDraftResult = {
  product_id: string
  store_id: string
  status: string
  ai_job_id: string | null
  generation: AiWorkerGenerateResult
  s2b_provision_error: string | null
  product: ReturnType<typeof normalizeProduct>
}

export type ProgressCallback = (progress: number, currentStep: string) => void | Promise<void>

export async function generateAndCreateDraft(
  container: MedusaContainer,
  storeId: string,
  payload: AiGenerationPayload,
  onProgress?: ProgressCallback,
  options?: { generation_request_id?: string }
): Promise<AiGenerationDraftResult> {
  const storeCoreService = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService

  const report = async (progress: number, step: string) => {
    if (onProgress) {
      await onProgress(progress, step)
    }
  }

  await report(5, "validating")

  const prompt = requireText(payload.prompt)
  if (!prompt) {
    throw new Error("prompt is required")
  }

  const platformProductId = requireText(payload.platform_product_id) ?? "pp_tshirt"
  const supplierProductId = requireText(payload.supplier_product_id) ?? "sp_tshirt"
  const supplierVariantId = requireText(payload.supplier_variant_id) ?? "spv_tshirt_black_m"
  const printPosition = requireText(payload.print_position) ?? "front"

  const stores = await storeCoreService.listStores({ id: storeId })
  if (!stores.length) {
    throw new Error("Store not found")
  }

  await report(15, "calling_ai_worker")

  const generated = await callAiWorkerGenerateProduct({
    prompt,
    platform_product_id: platformProductId,
    supplier_product_id: supplierProductId,
    supplier_variant_id: supplierVariantId,
    print_position: printPosition,
    generation_request_id: options?.generation_request_id ?? null,
  })

  await report(45, "generating_mockup")

  const title = requireText(generated.title)
  if (!title) {
    throw new Error("AI worker returned empty title")
  }

  const price = parseOptionalNumber(generated.price_suggestion)
  if (price === undefined) {
    throw new Error("AI worker returned invalid price_suggestion")
  }

  const supplierProducts = await storeCoreService.listSupplierProducts({
    id: supplierProductId,
    status: "active",
  })
  const supplierProduct = supplierProducts[0]
  if (!supplierProduct) {
    throw new Error("supplier_product_id must reference an active supplier product")
  }

  const supplierVariants = await storeCoreService.listSupplierProductVariants({
    id: supplierVariantId,
  })
  const supplierVariant = supplierVariants[0] as Record<string, unknown> | undefined

  if (!supplierVariant) {
    throw new Error("supplier_variant_id must reference a supplier product variant")
  }

  if (supplierVariant.supplier_product_id !== supplierProductId) {
    throw new Error("supplier_variant_id must belong to supplier_product_id")
  }

  const costCny =
    parseOptionalNumber(supplierProduct.base_cost) ??
    parseOptionalNumber(generated.price_suggestion) ??
    price
  const cost = costCny != null ? convertCnyToUsd(costCny) : null

  const basicProductId =
    supplierProduct.basic_product_id != null
      ? String(supplierProduct.basic_product_id)
      : process.env.S2BDIY_TEST_BASIC_PRODUCT_ID ?? null
  const supplierSizeId =
    supplierVariant.supplier_size_id != null
      ? String(supplierVariant.supplier_size_id)
      : process.env.S2BDIY_TEST_SIZE_ID ?? null
  const supplierColorId =
    supplierVariant.supplier_color_id != null
      ? String(supplierVariant.supplier_color_id)
      : process.env.S2BDIY_TEST_COLOR_ID ?? null
  const viewId = process.env.S2BDIY_TEST_VIEW_ID ?? "1"

  const categoryIds = Array.isArray(payload.category_ids) ? payload.category_ids : []
  if (categoryIds.length) {
    const categories = await storeCoreService.listProductCategories({
      id: categoryIds,
      store_id: storeId,
    })
    if (categories.length !== categoryIds.length) {
      throw new Error("category_ids must belong to current store")
    }
  }

  await report(70, "creating_draft")

  const catalogVariants = await storeCoreService.listSupplierProductVariants({
    supplier_product_id: supplierProductId,
  })
  const variantRows = (catalogVariants as Array<Record<string, unknown>>).map((row) => ({
    supplier_variant_id: String(row.id),
    supplier_size_id: row.supplier_size_id != null ? String(row.supplier_size_id) : undefined,
    supplier_color_id: row.supplier_color_id != null ? String(row.supplier_color_id) : undefined,
    color: String(row.color_name ?? row.color ?? "Default"),
    size: String(row.size_name ?? row.size ?? "Default"),
    price: price ?? 0,
    stock: 50,
  }))

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
    basic_product_id: basicProductId,
    supplier_size_id: supplierSizeId,
    supplier_color_id: supplierColorId,
    view_id: viewId,
    design_type: 1,
    medusa_product_id: requireText(payload.medusa_product_id),
    medusa_variant_id: requireText(payload.medusa_variant_id),
    design_image_url: generated.design_image_url,
    mockup_image_url: generated.mockup_image_url,
    print_file_url: generated.print_file_url,
    image_url: generated.mockup_image_url ?? generated.design_image_url,
    tags: Array.isArray(generated.tags) ? generated.tags : [],
    category_ids: categoryIds,
    price,
    cost,
    variants: variantRows.length ? variantRows : null,
    metadata: {
      seo: generated.seo ?? {},
      print_position: printPosition,
      ai_worker_mock_mode: generated.mock_mode ?? false,
      ai_worker_mock_mode_reason:
        typeof generated.mock_mode_reason === "string" ? generated.mock_mode_reason : null,
      market_confidence: 0.82,
      marketplace_category: payload.marketplace_category ?? null,
      marketplace_category_label: payload.marketplace_category_label ?? null,
      style_preset: payload.style_preset ?? null,
      style_preset_label: payload.style_preset_label ?? null,
      gallery: Array.isArray(generated.gallery) ? generated.gallery : [],
      requires_shipping: true,
    },
  })

  let s2bProvisionError: string | null = null
  if (isS2bdiyEnabled() && generated.print_file_url) {
    await report(85, "s2b_provision")
    const productForS2b = product as Record<string, unknown>
    const s2bIds = resolveS2bIdsFromEnvOrVariant(supplierVariant, productForS2b)
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

  if (isS2bdiyEnabled() && generated.print_file_url) {
    const existingMetadata = (product.metadata ?? {}) as Record<string, unknown>
    await storeCoreService.updateProducts({
      selector: { id: product.id },
      data: {
        metadata: {
          ...existingMetadata,
          s2b_provision_error: s2bProvisionError,
        },
      },
    })
  }

  const refreshed = await getMcProductById(storeCoreService, product.id, storeId)
  const finalProduct = refreshed ?? product

  await report(100, "complete")

  return {
    product_id: finalProduct.id,
    store_id: finalProduct.store_id,
    status: finalProduct.status,
    ai_job_id: generated.ai_job_id ?? null,
    generation: generated,
    s2b_provision_error: s2bProvisionError,
    product: normalizeProduct(finalProduct),
  }
}
