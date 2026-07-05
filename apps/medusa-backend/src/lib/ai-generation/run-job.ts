import type { MedusaContainer } from "@medusajs/framework/types"
import { STORE_CORE_MODULE } from "../../modules/store-core"
import type StoreCoreModuleService from "../../modules/store-core/service"
import {
  generateAndCreateDraft,
  type AiGenerationPayload,
} from "./generate-and-create-draft"
import { publishAiJobEvent } from "./job-events"
import { notifyAiJobComplete, notifyAiJobFailed } from "../notifications"

const ESTIMATED_SECONDS = 45

export async function updateAiJobRecord(
  storeCoreService: StoreCoreModuleService,
  jobId: string,
  data: Record<string, unknown>
) {
  await storeCoreService.updateAiGenerationJobs({
    selector: { id: jobId },
    data,
  })
}

export async function runAiGenerationJob(
  container: MedusaContainer,
  jobId: string,
  storeId: string,
  payload: AiGenerationPayload
) {
  const storeCoreService = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService

  try {
    await updateAiJobRecord(storeCoreService, jobId, {
      status: "running",
      progress: 0,
      current_step: "queued",
    })

    const result = await generateAndCreateDraft(container, storeId, payload, async (progress, step) => {
      await updateAiJobRecord(storeCoreService, jobId, {
        progress,
        current_step: step,
      })
      publishAiJobEvent(jobId, { type: "progress", progress, current_step: step })
    }, { generation_request_id: jobId })

    const jobResult = {
      product_id: result.product_id,
      ai_job_id: result.ai_job_id,
      generation: result.generation,
      s2b_provision_error: result.s2b_provision_error,
      product: result.product,
    }

    await updateAiJobRecord(storeCoreService, jobId, {
      status: "complete",
      progress: 100,
      current_step: "complete",
      product_id: result.product_id,
      result: jobResult,
      error: null,
    })

    publishAiJobEvent(jobId, {
      type: "complete",
      product_id: result.product_id,
      generation: result.generation as unknown as Record<string, unknown>,
    })

    await notifyAiJobComplete(storeCoreService, storeId, {
      jobId,
      productId: result.product_id,
      title: result.product.title ?? "Product",
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "AI generation failed"
    await updateAiJobRecord(storeCoreService, jobId, {
      status: "failed",
      current_step: "failed",
      error: message,
    })
    publishAiJobEvent(jobId, { type: "error", message })
    await notifyAiJobFailed(storeCoreService, storeId, { jobId, message })
  }
}

export const buildAiJobPayload = (body: Record<string, unknown>): AiGenerationPayload => ({
  prompt: String(body.prompt ?? ""),
  platform_product_id: String(body.platform_product_id ?? "pp_tshirt"),
  supplier_product_id: String(body.supplier_product_id ?? "sp_tshirt"),
  supplier_variant_id: String(body.supplier_variant_id ?? "spv_tshirt_black_m"),
  print_position: String(body.print_position ?? "front"),
  category_ids: Array.isArray(body.category_ids) ? (body.category_ids as string[]) : [],
  marketplace_category:
    typeof body.marketplace_category === "string" ? body.marketplace_category : null,
  marketplace_category_label:
    typeof body.marketplace_category_label === "string" ? body.marketplace_category_label : null,
  style_preset: typeof body.style_preset === "string" ? body.style_preset : null,
  style_preset_label:
    typeof body.style_preset_label === "string" ? body.style_preset_label : null,
  medusa_product_id: typeof body.medusa_product_id === "string" ? body.medusa_product_id : null,
  medusa_variant_id:
    typeof body.medusa_variant_id === "string" ? body.medusa_variant_id : null,
})

export const normalizeAiJobResponse = (job: Record<string, unknown>) => {
  const payload =
    job.payload && typeof job.payload === "object"
      ? (job.payload as Record<string, unknown>)
      : {}

  return {
    job_id: job.id,
    store_id: job.store_id,
    status: job.status,
    progress: job.progress ?? 0,
    current_step: job.current_step ?? null,
    estimated_seconds: job.estimated_seconds ?? ESTIMATED_SECONDS,
    product_id: job.product_id ?? null,
    error: job.error ?? null,
    result: job.result ?? null,
    prompt: typeof payload.prompt === "string" ? payload.prompt : null,
    created_at: job.created_at,
    updated_at: job.updated_at,
  }
}

export const enqueueAiGenerationJob = async (
  container: MedusaContainer,
  storeId: string,
  payload: AiGenerationPayload
) => {
  const storeCoreService = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService

  const job = await storeCoreService.createAiGenerationJobs({
    store_id: storeId,
    status: "queued",
    progress: 0,
    current_step: "queued",
    estimated_seconds: ESTIMATED_SECONDS,
    payload,
    result: null,
    error: null,
    product_id: null,
    metadata: {},
  })

  setImmediate(() => {
    void runAiGenerationJob(container, job.id, storeId, payload)
  })

  return job
}
