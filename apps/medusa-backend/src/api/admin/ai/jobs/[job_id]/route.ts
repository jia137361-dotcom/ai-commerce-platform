import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../../../lib/store-context"
import { normalizeAiJobResponse } from "../../../../../lib/ai-generation/run-job"
import { getStoreCoreService, sendError } from "../../../../_helpers/store-core"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
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

  return res.json(normalizeAiJobResponse(job as Record<string, unknown>))
}
