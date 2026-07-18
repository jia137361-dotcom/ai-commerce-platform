import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../../../lib/store-context"
import { normalizeAiJobResponse } from "../../../../../lib/ai-generation/run-job"
import { getStoreCoreService, sendError } from "../../../../_helpers/store-core"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const jobId = req.params.job_id as string
  const { store_id: storeId } = resolveCurrentStore(req)
  const storeCoreService = getStoreCoreService(req)

  const jobs = await storeCoreService.listAiGenerationJobs({ id: jobId })
  const job = jobs[0] as Record<string, unknown> | undefined

  if (!job) {
    return sendError(res, 404, "VALIDATION_ERROR", "AI job not found")
  }

  if (job.store_id !== storeId) {
    return sendError(res, 403, "VALIDATION_ERROR", "AI job does not belong to current store")
  }

  const payload =
    job.payload && typeof job.payload === "object"
      ? (job.payload as Record<string, unknown>)
      : {}
  if (payload.buyer_diy !== true) {
    return sendError(res, 403, "VALIDATION_ERROR", "AI job is not a buyer DIY job")
  }

  return res.json(normalizeAiJobResponse(job))
}
