import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../../../../lib/store-context"
import {
  buildAiJobPayload,
  normalizeAiJobResponse,
  runAiGenerationJob,
} from "../../../../../../lib/ai-generation/run-job"
import { getStoreCoreService, sendError } from "../../../../../_helpers/store-core"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const jobId = req.params.job_id as string
    const { store_id: storeId } = resolveCurrentStore(req)
    const storeCoreService = getStoreCoreService(req)

    const jobs = await storeCoreService.listAiGenerationJobs({ id: jobId })
    const job = jobs[0]

    if (!job) {
      return sendError(res, 404, "AI_JOB_NOT_FOUND", "AI job not found")
    }

    if (job.store_id !== storeId) {
      return sendError(
        res,
        403,
        "AI_JOB_STORE_MISMATCH",
        "This AI generation job belongs to another store. Please start a new generation for the current store."
      )
    }

    if (job.status !== "failed") {
      return sendError(res, 400, "VALIDATION_ERROR", "Only failed jobs can be retried")
    }

    const payload = buildAiJobPayload((job.payload ?? {}) as Record<string, unknown>)

    await storeCoreService.updateAiGenerationJobs({
      selector: { id: jobId },
      data: {
        status: "queued",
        progress: 0,
        current_step: "queued",
        error: null,
        result: null,
        product_id: null,
      },
    })

    setImmediate(() => {
      void runAiGenerationJob(req.scope, jobId, storeId, payload)
    })

    const refreshed = await storeCoreService.listAiGenerationJobs({ id: jobId })
    return res.status(202).json(normalizeAiJobResponse(refreshed[0] as Record<string, unknown>))
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to retry AI job"
    return sendError(res, 500, "AI_JOB_FAILED", message)
  }
}
