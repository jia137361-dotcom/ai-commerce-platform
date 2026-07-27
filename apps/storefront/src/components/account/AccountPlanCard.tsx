import { useEffect, useState } from "react"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import {
  fetchBuyerPlan,
  formatStorageGb,
  type BuyerPlanSnapshot,
} from "../../lib/buyer-api"

export function AccountPlanCard() {
  const [plan, setPlan] = useState<BuyerPlanSnapshot | null>(null)
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void fetchBuyerPlan()
      .then((result) => {
        if (!active) return
        setPlan(result.plan)
      })
      .catch((reason) => {
        if (!active) return
        setError(reason instanceof Error ? reason.message : "Unable to load plan")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <Card as="section" className="buyer-account-plan-card">
        <p className="buyer-account-kicker">Plan &amp; AI</p>
        <p>Loading plan…</p>
      </Card>
    )
  }

  if (error || !plan) {
    return (
      <Card as="section" className="buyer-account-plan-card" variant="muted">
        <p className="buyer-account-kicker">Plan &amp; AI</p>
        <h2>Plan unavailable</h2>
        <p>{error ?? "Sign in again to refresh entitlements."}</p>
        <Button href="/plans" variant="secondary">
          View plans
        </Button>
      </Card>
    )
  }

  const creditPct =
    plan.aiCreditsMonthly > 0
      ? Math.min(100, Math.round((plan.aiCreditsRemaining / plan.aiCreditsMonthly) * 100))
      : 0
  const storagePct =
    plan.storageLimitBytes > 0
      ? Math.min(100, Math.round((plan.storageUsedBytes / plan.storageLimitBytes) * 100))
      : 0

  return (
    <Card as="section" className="buyer-account-plan-card">
      <p className="buyer-account-kicker">Plan &amp; AI</p>
      <div className="buyer-account-plan-title-row">
        <h2>{plan.planName}</h2>
        <span className="buyer-account-plan-badge">{plan.priceLabel}</span>
      </div>
      <p>
        {plan.canUseAi
          ? "AI Design is available with your remaining credits."
          : "No AI credits left. Upgrade to keep generating."}
      </p>

      <div className="buyer-account-plan-meter">
        <div className="buyer-account-plan-meter-label">
          <span>AI image credits</span>
          <strong>
            {plan.aiCreditsRemaining} / {plan.aiCreditsMonthly}
          </strong>
        </div>
        <div className="buyer-account-plan-meter-track" aria-hidden="true">
          <span style={{ width: `${creditPct}%` }} />
        </div>
      </div>

      <div className="buyer-account-plan-meter">
        <div className="buyer-account-plan-meter-label">
          <span>Storage</span>
          <strong>
            {formatStorageGb(plan.storageUsedBytes)} / {formatStorageGb(plan.storageLimitBytes)}
          </strong>
        </div>
        <div className="buyer-account-plan-meter-track" aria-hidden="true">
          <span style={{ width: `${storagePct}%` }} />
        </div>
      </div>

      <p className="buyer-account-plan-meta">
        Product limit {plan.productLimit}
        {plan.discountPercent > 0 ? ` · Up to ${plan.discountPercent}% discount` : null}
      </p>

      <div className="buyer-account-actions">
        <Button href="/plans">{plan.planId === "free" ? "Upgrade plan" : "Manage plan"}</Button>
        <Button href="/ai-design" variant="secondary">
          AI Design
        </Button>
      </div>
    </Card>
  )
}
