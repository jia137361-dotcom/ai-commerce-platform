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
import {
  buyerOwnsLegacyResource,
  readBuyerResourceOwner,
  type BuyerResourceOwnerFields,
} from "../buyer-resource-ownership"

const ESTIMATED_SECONDS = 45

export type BuyerAiGeneratePayload = {
  prompt: string
  /** Optional — only needed when binding a blank for Studio editor handoff. */
  product_id?: string | null
  style_preset?: string | null
  print_position?: string
  customer_id?: string | null
  guest_key?: string | null
}

export type BuyerAiMaterialListContext = {
  customerId: string | null
  guestKey: string | null
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

export type BuyerMaterialUploadResult =
  | { ok: true; material_id: string; material_url: string | null }
  | { ok: false; error: string }

/** Upload artwork to S2BDIY so it appears in Studio's material panel. */
export async function uploadBuyerArtworkToS2bdiy(
  imageUrl: string,
  name: string
): Promise<BuyerMaterialUploadResult> {
  if (isS2bdiyMockMode()) {
    return { ok: false, error: "S2BDIY_MOCK_MODE=true — turn off mock to upload Studio materials" }
  }
  if (!getS2bdiyConfig()) {
    return {
      ok: false,
      error: "S2BDIY not configured — set S2BDIY_APP_KEY / S2BDIY_APP_SECRET",
    }
  }
  try {
    const config = getS2bdiyConfig()
    if (!config) {
      return { ok: false, error: "S2BDIY not configured" }
    }
    const client = new S2bdiyClient(config)
    const { buffer, filename } = await fetchPrintFileBuffer(imageUrl)
    const uploaded = await uploadMaterialClient(client, {
      buffer,
      filename,
      name: name.slice(0, 80) || "buyer-ai-design",
    })
    return {
      ok: true,
      material_id: String(uploaded.id),
      material_url: uploaded.image_url ?? null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn("[buyer-ai] material upload failed:", message)
    return { ok: false, error: message }
  }
}

async function tryUploadMaterial(
  imageUrl: string,
  name: string
): Promise<{
  material_id: string | null
  material_url: string | null
  upload_error?: string
}> {
  const uploaded = await uploadBuyerArtworkToS2bdiy(imageUrl, name)
  if (uploaded.ok === true) {
    return { material_id: uploaded.material_id, material_url: uploaded.material_url }
  }
  return { material_id: null, material_url: null, upload_error: uploaded.error }
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
    const material = uploadSource
      ? await tryUploadMaterial(uploadSource, title)
      : { material_id: null, material_url: null, upload_error: "no artwork url to upload" }

    if (material.upload_error) {
      console.warn(`[buyer-ai] job ${jobId} Studio material upload skipped: ${material.upload_error}`)
    }

    const basicProductId = product
      ? await resolveBasicProductIdForMcProduct(storeCoreService, product)
      : null

    const editorPath =
      productId && material.material_id
        ? `/design/${encodeURIComponent(productId)}?materialId=${encodeURIComponent(material.material_id)}`
        : productId
          ? `/design/${encodeURIComponent(productId)}`
          : material.material_id
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
      material_id: material.material_id,
      material_url: material.material_url ?? generated.design_image_url ?? null,
      material_upload_error: material.upload_error ?? null,
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
      product_id: null,
      result,
      error: null,
    })
    publishAiJobEvent(jobId, {
      type: "complete",
      product_id: null,
      generation: {
        design_image_url: generated.design_image_url,
        print_file_url: generated.print_file_url,
        mockup_image_url: generated.mockup_image_url,
        material_id: material.material_id,
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

function readJobOwner(job: Record<string, unknown>): BuyerResourceOwnerFields {
  const payload =
    job.payload && typeof job.payload === "object"
      ? (job.payload as Record<string, unknown>)
      : {}
  const metadata =
    job.metadata && typeof job.metadata === "object"
      ? (job.metadata as Record<string, unknown>)
      : {}
  return readBuyerResourceOwner(payload, metadata)
}

export function buyerOwnsAiMaterial(
  job: Record<string, unknown>,
  customerId: string | null,
  guestKey: string | null
) {
  return buyerOwnsLegacyResource(readJobOwner(job), customerId, guestKey)
}

export async function enqueueBuyerAiGenerationJob(
  container: MedusaContainer,
  storeId: string,
  payload: BuyerAiGeneratePayload
) {
  const storeCoreService = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const productId = requireText(payload.product_id) || null
  const owner = {
    customer_id: requireText(payload.customer_id),
    guest_key: requireText(payload.guest_key),
  }

  const job = await storeCoreService.createAiGenerationJobs({
    store_id: storeId,
    status: "queued",
    progress: 0,
    current_step: "queued",
    estimated_seconds: ESTIMATED_SECONDS,
    payload: {
      ...payload,
      product_id: productId,
      customer_id: owner.customer_id,
      guest_key: owner.guest_key,
      buyer_diy: true,
      skip_copy: true,
      library_item: true,
    },
    result: null,
    error: null,
    product_id: null,
    metadata: {
      source: "buyer_ai_design",
      skip_copy: true,
      library_item: true,
      customer_id: owner.customer_id,
      guest_key: owner.guest_key,
    },
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
  limit = 48,
  context?: BuyerAiMaterialListContext
): Promise<BuyerAiMaterial[]> {
  const jobs = (await storeCoreService.listAiGenerationJobs(
    { store_id: storeId, status: "complete" },
    { order: { created_at: "DESC" }, take: Math.min(Math.max(limit * 4, limit), 200) }
  )) as Array<Record<string, unknown>>

  const customerId = context?.customerId ?? null
  const guestKey = context?.guestKey ?? null

  return jobs
    .filter((job) => buyerOwnsAiMaterial(job, customerId, guestKey))
    .map((job) => mapBuyerAiMaterial(job))
    .filter((item): item is BuyerAiMaterial => Boolean(item))
    .slice(0, Math.min(Math.max(limit, 1), 100))
}
