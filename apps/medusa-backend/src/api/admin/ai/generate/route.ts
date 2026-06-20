import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../../lib/store-context"
import {
  buildAiJobPayload,
  enqueueAiGenerationJob,
  normalizeAiJobResponse,
} from "../../../../lib/ai-generation/run-job"
import { getStoreCoreService, requireText, sendError } from "../../../_helpers/store-core"

type GenerateBody = Record<string, unknown>

export const POST = async (req: MedusaRequest<GenerateBody>, res: MedusaResponse) => {
  try {
    const body = req.body ?? {}
    const prompt = requireText(body.prompt)
    if (!prompt) {
      return sendError(res, 400, "VALIDATION_ERROR", "prompt is required")
    }

    const context = resolveCurrentStore(req)
    const storeId = requireText(body.store_id) ?? context.store_id
    const storeCoreService = getStoreCoreService(req)
    const stores = await storeCoreService.listStores({ id: storeId })
    if (!stores.length) {
      return sendError(res, 404, "STORE_NOT_FOUND", "Store not found")
    }

    const payload = buildAiJobPayload(body)
    const job = await enqueueAiGenerationJob(req.scope, storeId, payload)

    return res.status(202).json(normalizeAiJobResponse(job as Record<string, unknown>))
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to enqueue AI job"
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message },
    })
  }
}
