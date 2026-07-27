/**
 * Buyer AI Design — image-only generation (no language/copy models).
 *
 * POST /store/ai/generate
 * body: { prompt, product_id?, style_preset?, print_position? }
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCurrentStore } from "../../../../lib/store-context"
import { enqueueBuyerAiGenerationJob } from "../../../../lib/ai-generation/buyer-generate"
import { normalizeAiJobResponse } from "../../../../lib/ai-generation/run-job"
import { resolveBuyerAiRequestOwner } from "../../../../lib/buyer-ai-request"
import { BuyerPlanError, consumeBuyerAiCredit, serializeBuyerPlan } from "../../../../lib/buyer-plan"
import { getStoreCoreService, requireText, sendError } from "../../../_helpers/store-core"

type GenerateBody = {
  prompt?: string
  product_id?: string
  style_preset?: string
  print_position?: string
  guest_key?: string
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const body = (req.body ?? {}) as GenerateBody
    const prompt = requireText(body.prompt)
    if (!prompt) {
      return sendError(res, 400, "VALIDATION_ERROR", "prompt is required")
    }

    const productId = requireText(body.product_id) || null
    const { store_id: storeId } = resolveCurrentStore(req)
    const storeCoreService = getStoreCoreService(req)
    const stores = await storeCoreService.listStores({ id: storeId })
    if (!stores.length) {
      return sendError(res, 404, "STORE_NOT_FOUND", "Store not found")
    }

    if (productId) {
      const products = await storeCoreService.listProducts({ id: productId })
      const product = products[0]
      if (!product || product.store_id !== storeId) {
        return sendError(res, 404, "PRODUCT_NOT_FOUND", "Product not found")
      }
    }

    const owner = resolveBuyerAiRequestOwner(req)

    // Logged-in buyers consume AI image credits from customer.metadata plan.
    // Guests remain allowed for demo; ME/Plans UX pushes sign-in + upgrade.
    let planPayload: ReturnType<typeof serializeBuyerPlan> | null = null
    if (owner.customer_id) {
      try {
        const plan = await consumeBuyerAiCredit(req.scope, owner.customer_id, 1)
        planPayload = serializeBuyerPlan(plan)
      } catch (error) {
        if (error instanceof BuyerPlanError) {
          return res.status(error.status).json({
            error: { code: error.code, message: error.message },
          })
        }
        throw error
      }
    }

    const job = await enqueueBuyerAiGenerationJob(req.scope, storeId, {
      prompt,
      product_id: productId,
      style_preset: requireText(body.style_preset),
      print_position: requireText(body.print_position) ?? "front",
      customer_id: owner.customer_id,
      guest_key: owner.guest_key,
    })

    return res.status(202).json({
      ...normalizeAiJobResponse(job as Record<string, unknown>),
      ...(planPayload ? { plan: planPayload } : {}),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to enqueue buyer AI job"
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message },
    })
  }
}
