import { useEffect, useState } from "react"
import { AccountAuthLayout } from "../../components/account/AccountAuthLayout"
import { PageShell } from "../../components/layout/PageShell"
import { StoreFooter } from "../../components/layout/StoreFooter"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import { Button } from "../../components/ui/Button"
import { Card } from "../../components/ui/Card"
import { ErrorState, LoadingState } from "../../components/ui/States"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import {
  fetchBuyerPlan,
  formatStorageGb,
  upgradeBuyerPlan,
  type BuyerPlanCatalogEntry,
  type BuyerPlanId,
  type BuyerPlanSnapshot,
} from "../../lib/buyer-api"
import { useBuyerPageSettings } from "../../lib/useBuyerPageSettings"

const FALLBACK_CATALOG: BuyerPlanCatalogEntry[] = [
  {
    id: "free",
    name: "Free",
    priceLabel: "$0/month",
    monthlyPriceUsd: 0,
    aiCreditsMonthly: 5,
    productLimit: 25,
    storageLimitBytes: 2 * 1024 * 1024 * 1024,
    discountPercent: 0,
    description: "Start your business with AI tools",
  },
  {
    id: "ai_creative",
    name: "AI Creative",
    priceLabel: "From $9/month",
    monthlyPriceUsd: 9,
    aiCreditsMonthly: 60,
    productLimit: 300,
    storageLimitBytes: 10 * 1024 * 1024 * 1024,
    discountPercent: 25,
    description: "Create and design extensively with AI tools",
  },
]

type PlansPageProps = { cartCount: number }

export function PlansPage({ cartCount }: PlansPageProps) {
  const auth = useBuyerAuth()
  const { settings, marketplaceMode } = useBuyerPageSettings()
  const [catalog, setCatalog] = useState<BuyerPlanCatalogEntry[]>(FALLBACK_CATALOG)
  const [plan, setPlan] = useState<BuyerPlanSnapshot | null>(null)
  const [loading, setLoading] = useState(Boolean(auth.customer))
  const [busyPlan, setBusyPlan] = useState<BuyerPlanId | null>(null)
  const [message, setMessage] = useState<string>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    let active = true
    if (!auth.customer) {
      setLoading(false)
      setPlan(null)
      return
    }
    setLoading(true)
    void fetchBuyerPlan()
      .then((result) => {
        if (!active) return
        setPlan(result.plan)
        if (result.catalog.length) setCatalog(result.catalog)
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
  }, [auth.customer])

  const onSelect = async (planId: BuyerPlanId) => {
    if (!auth.customer) {
      window.location.assign(`/account/sign-in?returnTo=${encodeURIComponent("/plans")}`)
      return
    }
    if (plan?.planId === planId) return
    setBusyPlan(planId)
    setMessage(undefined)
    setError(undefined)
    try {
      const result = await upgradeBuyerPlan(planId)
      setPlan(result.plan)
      setMessage(result.message ?? "Plan updated.")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update plan")
    } finally {
      setBusyPlan(null)
    }
  }

  const content = (
    <div className="buyer-plans-page">
      <header className="buyer-plans-header">
        <p className="buyer-account-kicker">Ciiverse plans</p>
        <h1>Choose your Ciiverse plan.</h1>
        <p>AI Design uses monthly image credits. Upgrade for more credits, products, and storage.</p>
        {plan ? (
          <p className="buyer-plans-current">
            Current: <strong>{plan.planName}</strong> · {plan.aiCreditsRemaining}/{plan.aiCreditsMonthly} AI credits
          </p>
        ) : (
          <p className="buyer-plans-current">
            Sign in to activate a plan. Guests can browse; generating while signed in spends credits.
          </p>
        )}
      </header>

      {loading ? <LoadingState label="Loading plans..." /> : null}
      {error ? <ErrorState title="Plan unavailable" message={error} /> : null}
      {message ? <p className="buyer-plans-message" role="status">{message}</p> : null}

      <div className="buyer-plans-grid">
        {catalog.map((entry) => {
          const active = plan?.planId === entry.id
          return (
            <Card
              as="section"
              key={entry.id}
              className={["buyer-plans-card", active ? "is-current" : ""].filter(Boolean).join(" ")}
            >
              <p className="buyer-plans-card-kicker">{entry.name}</p>
              <h2>{entry.priceLabel}</h2>
              <p>{entry.description}</p>
              <ul>
                <li>
                  <strong>{entry.aiCreditsMonthly}</strong> AI image credits / month
                </li>
                <li>
                  <strong>{entry.productLimit}</strong> products
                </li>
                <li>
                  <strong>{formatStorageGb(entry.storageLimitBytes)}</strong> content storage
                </li>
                <li>
                  {entry.discountPercent > 0
                    ? `Up to ${entry.discountPercent}% product discount`
                    : "Standard product pricing"}
                </li>
                <li>Unlimited product designs · Design Maker · Mockup Generator</li>
                <li>Automatic fulfillment · CSV import/export · 24/7 support</li>
              </ul>
              <Button
                disabled={busyPlan !== null || active}
                loading={busyPlan === entry.id}
                variant={entry.id === "ai_creative" ? "primary" : "secondary"}
                onClick={() => void onSelect(entry.id)}
              >
                {!auth.customer
                  ? "Sign in to choose"
                  : active
                    ? "Current plan"
                    : entry.id === "ai_creative"
                      ? "Upgrade (demo)"
                      : "Switch to Free"}
              </Button>
            </Card>
          )
        })}
      </div>

      <Card as="section" className="buyer-plans-compare" variant="muted">
        <h2>Compare</h2>
        <div className="buyer-plans-table-wrap">
          <table className="buyer-plans-table">
            <thead>
              <tr>
                <th>Feature</th>
                {catalog.map((entry) => (
                  <th key={entry.id}>{entry.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>AI image credits</td>
                {catalog.map((entry) => (
                  <td key={entry.id}>{entry.aiCreditsMonthly}</td>
                ))}
              </tr>
              <tr>
                <td>Products</td>
                {catalog.map((entry) => (
                  <td key={entry.id}>{entry.productLimit}</td>
                ))}
              </tr>
              <tr>
                <td>Content storage</td>
                {catalog.map((entry) => (
                  <td key={entry.id}>{formatStorageGb(entry.storageLimitBytes)}</td>
                ))}
              </tr>
              <tr>
                <td>Product discount</td>
                {catalog.map((entry) => (
                  <td key={entry.id}>{entry.discountPercent > 0 ? `Up to ${entry.discountPercent}%` : "—"}</td>
                ))}
              </tr>
              <tr>
                <td>Order import automatically</td>
                {catalog.map((entry) => (
                  <td key={entry.id}>—</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="buyer-plans-note">
          Billing is metadata-only for now (no Stripe charge). Production will attach a real subscription.
        </p>
      </Card>
    </div>
  )

  if (auth.customer) {
    return (
      <AccountAuthLayout settings={settings} cartCount={cartCount} marketplaceMode={marketplaceMode}>
        {content}
      </AccountAuthLayout>
    )
  }

  return (
    <PageShell
      className="buyer-account-page"
      header={<StoreTopBar settings={settings} cartCount={cartCount} marketplaceMode={marketplaceMode} />}
      footer={<StoreFooter />}
      cartCount={cartCount}
    >
      {content}
    </PageShell>
  )
}
