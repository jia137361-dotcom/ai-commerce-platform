import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../../lib/store-context"
import { generateAndCreateDraft, type AiGenerationPayload } from "../../../../lib/ai-generation/generate-and-create-draft"
import {
  getStoreCoreService,
  requireText,
  sendError,
} from "../../../_helpers/store-core"

type GenerateAndDraftBody = {
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
        message,
      },
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

  const context = resolveCurrentStore(req)
  const storeId = context.store_id
  const storeCoreService = getStoreCoreService(req)

  const stores = await storeCoreService.listStores({ id: storeId })
  if (!stores.length) {
    return sendError(res, 404, "STORE_NOT_FOUND", "Store not found")
  }

  const payload: AiGenerationPayload = {
    prompt,
    platform_product_id: requireText(body.platform_product_id) ?? "pp_tshirt",
    supplier_product_id: requireText(body.supplier_product_id) ?? "sp_tshirt",
    supplier_variant_id: requireText(body.supplier_variant_id) ?? "spv_tshirt_black_m",
    print_position: requireText(body.print_position) ?? "front",
    category_ids: Array.isArray(body.category_ids) ? body.category_ids : [],
    medusa_product_id: requireText(body.medusa_product_id),
    medusa_variant_id: requireText(body.medusa_variant_id),
  }

  try {
    const result = await generateAndCreateDraft(req.scope, storeId, payload)
    return res.status(201).json({
      product_id: result.product_id,
      store_id: result.store_id,
      status: result.status,
      ai_job_id: result.ai_job_id,
      generation: result.generation,
      s2b_provision_error: result.s2b_provision_error,
      product: result.product,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "generate-and-draft failed"
    if (message.includes("AI worker")) {
      return sendError(res, 502, "AI_PROVIDER_UNAVAILABLE", message)
    }
    return sendError(res, 400, "AI_JOB_FAILED", message)
  }
}
