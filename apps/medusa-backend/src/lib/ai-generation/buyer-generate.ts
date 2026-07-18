import type { MedusaContainer } from "@medusajs/framework/types"
import { STORE_CORE_MODULE } from "../../modules/store-core"
import type StoreCoreModuleService from "../../modules/store-core/service"
import { callAiWorkerGenerateProduct } from "../ai-worker-client"
import { getS2bdiyConfig, isS2bdiyMockMode } from "../../modules/suppliers/s2bdiy/config"
import { S2bdiyClient } from "../../modules/suppliers/s2bdiy/s2bdiy-client"
import {
  fetchPrintFileBuffer,
  uploadMaterialClient,
} from "../../modules/suppliers/s2bdiy/s2bdiy-material"
import { publishAiJobEvent } from "./job-events"
import { updateAiJobRecord } from "./run-job"
import { requireText } from "../../api/_helpers/store-core"
import { resolveBasicProductIdForMcProduct } from "../s2bdiy/product-design-config"

const ESTIMATED_SECONDS = 45

export type BuyerAiGeneratePayload = {
  prompt: string
  /** Optional — only needed when binding a blank for Studio editor handoff. */
  product_id?: string | null
  style_preset?: string | null
  print_position?: string
}

export type BuyerAiMaterial = {
  id: string
  job_id: string
  created_at?: string | null
  prompt: string | null
  title: string | null
  design_image_url: string | null
  print_file_url: string | null
  mockup_image_url: string | null
  material_id: string | null
  material_url: string | null
  product_id: string | null
  editor_path: string | null
  mock_mode?: boolean
}

function templateTitle(prompt: string) {
  const clipped = prompt.trim().slice(0, 60)
  return clipped ? `AI artwork — ${clipped}` : "AI artwork"
}

async function tryUploadMaterial(
  imageUrl: string,
  name: string
): Promise<{ material_id: string; material_url: string | null } | null> {
  if (isS2bdiyMockMode() || !getS2bdiyConfig()) {
    return null
  }
  try {
    const config = getS2bdiyConfig()
    if (!config) return null
    const client = new S2bdiyClient(config)
    const { buffer, filename } = await fetchPrintFileBuffer(imageUrl)
    const uploaded = await uploadMaterialClient(client, {
      buffer,
      filename,
      name: name.slice(0, 80) || "buyer-ai-design",
    })
    return {
      material_id: String(uploaded.id),
      material_url: uploaded.image_url ?? null,
    }
  } catch (error) {
    console.warn(
      "[buyer-ai] material upload skipped:",
      error instanceof Error ? error.message : String(error)
    )
    return null
  }
}

export async function runBuyerAiGenerationJob(
  container: MedusaContainer,
  jobId: string,
  storeId: string,
  payload: BuyerAiGeneratePayload
) {
  const storeCoreService = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService

  try {
    await updateAiJobRecord(storeCoreService, jobId, {
      status: "running",
      progress: 5,
      current_step: "validating",
    })
    publishAiJobEvent(jobId, { type: "progress", progress: 5, current_step: "validating" })

    const prompt = requireText(payload.prompt)
    if (!prompt) {
      throw new Error("prompt is required")
    }

    let platformProductId = "pp_tshirt"
    let supplierProductId = "sp_tshirt"
    let supplierVariantId = "spv_tshirt_black_m"
    let product: Record<string, unknown> | undefined
    const productId = requireText(payload.product_id)

    if (productId) {
      const products = await storeCoreService.listProducts({ id: productId })
      product = products[0] as Record<string, unknown> | undefined
      if (!product || product.store_id !== storeId) {
        throw new Error("Product not found for this store")
      }
      platformProductId =
        (typeof product.platform_product_id === "string" && product.platform_product_id) ||
        platformProductId
      supplierProductId =
        (typeof product.supplier_product_id === "string" &&
          product.supplier_product_id.startsWith("sp_") &&
          product.supplier_product_id) ||
        supplierProductId
      supplierVariantId =
        (typeof product.supplier_variant_id === "string" && product.supplier_variant_id) ||
        supplierVariantId
    }

    const printPosition = payload.print_position || "front"

    await updateAiJobRecord(storeCoreService, jobId, {
      progress: 20,
      current_step: "generating_image",
    })
    publishAiJobEvent(jobId, {
      type: "progress",
      progress: 20,
      current_step: "generating_image",
    })

    const generated = await callAiWorkerGenerateProduct({
      prompt,
      platform_product_id: platformProductId,
      supplier_product_id: supplierProductId,
      supplier_variant_id: supplierVariantId,
      print_position: printPosition,
      generation_request_id: jobId,
      skip_copy: true,
    })

    await updateAiJobRecord(storeCoreService, jobId, {
      progress: 75,
      current_step: "saving_material",
    })
    publishAiJobEvent(jobId, {
      type: "progress",
      progress: 75,
      current_step: "saving_material",
    })

    const title = templateTitle(prompt)
    const uploadSource = generated.print_file_url || generated.design_image_url
    const material = uploadSource ? await tryUploadMaterial(uploadSource, title) : null

    const basicProductId = product
      ? await resolveBasicProductIdForMcProduct(storeCoreService, product)
      : null

    const editorPath =
      productId && material?.material_id
        ? `/design/${encodeURIComponent(productId)}?materialId=${encodeURIComponent(material.material_id)}`
        : productId
          ? `/design/${encodeURIComponent(productId)}`
          : material?.material_id
            ? `/studio`
            : "/studio"

    const result = {
      library_item: true,
      base_product_id: productId || null,
      // Prefer flat artwork for the materials library (not the garment mockup).
      design_image_url: generated.design_image_url,
      print_file_url: generated.print_file_url,
      mockup_image_url: generated.mockup_image_url,
      title,
      prompt,
      material_id: material?.material_id ?? null,
      material_url: material?.material_url ?? generated.design_image_url ?? null,
      basic_product_id: basicProductId,
      editor_path: editorPath,
      mock_mode: Boolean(generated.mock_mode),
      mock_mode_reason:
        typeof generated.mock_mode_reason === "string" ? generated.mock_mode_reason : null,
      generation: {
        ai_job_id: generated.ai_job_id,
        mock_mode: generated.mock_mode ?? false,
        mock_mode_reason:
          typeof generated.mock_mode_reason === "string" ? generated.mock_mode_reason : null,
        skip_copy: true,
      },
    }

    await updateAiJobRecord(storeCoreService, jobId, {
      status: "complete",
      progress: 100,
      current_step: "complete",
      product_id: productId || null,
      result,
      error: null,
    })
    publishAiJobEvent(jobId, {
      type: "complete",
      product_id: productId || null,
      generation: {
        design_image_url: generated.design_image_url,
        print_file_url: generated.print_file_url,
        mockup_image_url: generated.mockup_image_url,
        material_id: material?.material_id ?? null,
        editor_path: result.editor_path,
        title,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "AI generation failed"
    await updateAiJobRecord(storeCoreService, jobId, {
      status: "failed",
      current_step: "failed",
      error: message,
    })
    publishAiJobEvent(jobId, { type: "error", message })
  }
}

export async function enqueueBuyerAiGenerationJob(
  container: MedusaContainer,
  storeId: string,
  payload: BuyerAiGeneratePayload
) {
  const storeCoreService = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const productId = requireText(payload.product_id) || null

  const job = await storeCoreService.createAiGenerationJobs({
    store_id: storeId,
    status: "queued",
    progress: 0,
    current_step: "queued",
    estimated_seconds: ESTIMATED_SECONDS,
    payload: {
      ...payload,
      product_id: productId,
      buyer_diy: true,
      skip_copy: true,
    },
    result: null,
    error: null,
    product_id: productId,
    metadata: { source: "buyer_ai_design", skip_copy: true },
  })

  setImmediate(() => {
    void runBuyerAiGenerationJob(container, job.id, storeId, {
      ...payload,
      product_id: productId,
    })
  })

  return job
}

export function mapBuyerAiMaterial(job: Record<string, unknown>): BuyerAiMaterial | null {
  if (String(job.status) !== "complete") return null
  const payload =
    job.payload && typeof job.payload === "object"
      ? (job.payload as Record<string, unknown>)
      : {}
  if (payload.buyer_diy !== true) return null

  const result =
    job.result && typeof job.result === "object"
      ? (job.result as Record<string, unknown>)
      : {}

  const designImageUrl =
    (typeof result.design_image_url === "string" && result.design_image_url) || null
  if (!designImageUrl && !(typeof result.material_id === "string" && result.material_id)) {
    return null
  }

  const generation =
    result.generation && typeof result.generation === "object"
      ? (result.generation as Record<string, unknown>)
      : {}

  return {
    id: String(job.id),
    job_id: String(job.id),
    created_at:
      job.created_at instanceof Date
        ? job.created_at.toISOString()
        : typeof job.created_at === "string"
          ? job.created_at
          : null,
    prompt:
      (typeof result.prompt === "string" && result.prompt) ||
      (typeof payload.prompt === "string" && payload.prompt) ||
      null,
    title: (typeof result.title === "string" && result.title) || null,
    design_image_url: designImageUrl,
    print_file_url: (typeof result.print_file_url === "string" && result.print_file_url) || null,
    mockup_image_url:
      (typeof result.mockup_image_url === "string" && result.mockup_image_url) || null,
    material_id: (typeof result.material_id === "string" && result.material_id) || null,
    material_url:
      (typeof result.material_url === "string" && result.material_url) ||
      designImageUrl ||
      null,
    product_id:
      (typeof result.base_product_id === "string" && result.base_product_id) ||
      (typeof job.product_id === "string" && job.product_id) ||
      null,
    editor_path: (typeof result.editor_path === "string" && result.editor_path) || null,
    mock_mode: Boolean(result.mock_mode ?? generation.mock_mode),
  }
}

export async function listBuyerAiMaterials(
  storeCoreService: StoreCoreModuleService,
  storeId: string,
  limit = 48
): Promise<BuyerAiMaterial[]> {
  const jobs = (await storeCoreService.listAiGenerationJobs(
    { store_id: storeId, status: "complete" },
    { order: { created_at: "DESC" }, take: Math.min(Math.max(limit, 1), 100) }
  )) as Array<Record<string, unknown>>

  return jobs
    .map((job) => mapBuyerAiMaterial(job))
    .filter((item): item is BuyerAiMaterial => Boolean(item))
}
