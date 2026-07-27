import {
  BUYER_PLAN_CATALOG,
  buildPlanMetadataPatch,
  readBuyerPlanFromMetadata,
  serializeBuyerPlan,
} from "../lib/buyer-plan"

describe("buyer-plan metadata", () => {
  it("defaults missing metadata to Free entitlements", () => {
    const plan = readBuyerPlanFromMetadata({})
    expect(plan.planId).toBe("free")
    expect(plan.aiCreditsMonthly).toBe(5)
    expect(plan.aiCreditsRemaining).toBe(5)
    expect(plan.productLimit).toBe(25)
    expect(plan.canUseAi).toBe(true)
  })

  it("reads AI Creative entitlements from metadata", () => {
    const plan = readBuyerPlanFromMetadata({
      plan_id: "ai_creative",
      plan_status: "active",
      ai_credits_remaining: 12,
      ai_credits_monthly: 60,
    })
    expect(plan.planId).toBe("ai_creative")
    expect(plan.planName).toBe("AI Creative")
    expect(plan.aiCreditsRemaining).toBe(12)
    expect(plan.discountPercent).toBe(25)
    expect(serializeBuyerPlan(plan).can_use_ai).toBe(true)
  })

  it("marks exhausted credits as cannot use AI", () => {
    const plan = readBuyerPlanFromMetadata({
      plan_id: "free",
      ai_credits_remaining: 0,
      ai_credits_monthly: 5,
    })
    expect(plan.canUseAi).toBe(false)
  })

  it("builds metadata patch without dropping unrelated keys", () => {
    const snapshot = readBuyerPlanFromMetadata({ plan_id: "free", ai_credits_remaining: 3 })
    const patch = buildPlanMetadataPatch({ followed_store_ids: ["s1"], email_verified_at: "x" }, snapshot)
    expect(patch.followed_store_ids).toEqual(["s1"])
    expect(patch.email_verified_at).toBe("x")
    expect(patch.plan_id).toBe("free")
    expect(patch.ai_credits_remaining).toBe(3)
  })

  it("exposes catalog limits from Free and AI Creative", () => {
    expect(BUYER_PLAN_CATALOG.free.aiCreditsMonthly).toBe(5)
    expect(BUYER_PLAN_CATALOG.ai_creative.aiCreditsMonthly).toBe(60)
    expect(BUYER_PLAN_CATALOG.ai_creative.productLimit).toBe(300)
  })
})
