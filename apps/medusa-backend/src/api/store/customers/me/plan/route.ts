import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveCustomerId } from "../../../../../lib/customer-session"
import {
  BuyerPlanError,
  consumeBuyerAiCredit,
  ensureBuyerPlanMetadata,
  serializeBuyerPlan,
  serializePlanCatalog,
  setBuyerPlanId,
  type BuyerPlanId,
} from "../../../../../lib/buyer-plan"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = resolveCustomerId(req)
  if (!customerId) {
    return res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Customer session is required" },
    })
  }

  try {
    const plan = await ensureBuyerPlanMetadata(req.scope, customerId)
    return res.json({
      plan: serializeBuyerPlan(plan),
      catalog: serializePlanCatalog(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load plan"
    return res.status(500).json({ error: { code: "PLAN_LOAD_ERROR", message } })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = resolveCustomerId(req)
  if (!customerId) {
    return res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Customer session is required" },
    })
  }

  const body = (req.body ?? {}) as { action?: string; plan_id?: string; amount?: number }
  const action = typeof body.action === "string" ? body.action.trim().toLowerCase() : ""

  try {
    if (action === "consume_credit") {
      const amount = typeof body.amount === "number" ? body.amount : 1
      const plan = await consumeBuyerAiCredit(req.scope, customerId, amount)
      return res.json({ plan: serializeBuyerPlan(plan), consumed: amount })
    }

    if (action === "upgrade" || action === "set_plan") {
      const planId = (body.plan_id === "ai_creative" ? "ai_creative" : "free") as BuyerPlanId
      // Stripe billing not wired yet — this is the demo entitlement switch.
      const plan = await setBuyerPlanId(req.scope, customerId, planId)
      return res.json({
        plan: serializeBuyerPlan(plan),
        billing: "demo_metadata_only",
        message:
          planId === "ai_creative"
            ? "AI Creative entitlements applied (demo). Stripe subscription comes later."
            : "Switched to Free plan entitlements.",
      })
    }

    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "action must be consume_credit, upgrade, or set_plan",
      },
    })
  } catch (error) {
    if (error instanceof BuyerPlanError) {
      return res.status(error.status).json({
        error: { code: error.code, message: error.message },
      })
    }
    const message = error instanceof Error ? error.message : "Unable to update plan"
    return res.status(400).json({ error: { code: "PLAN_UPDATE_ERROR", message } })
  }
}
