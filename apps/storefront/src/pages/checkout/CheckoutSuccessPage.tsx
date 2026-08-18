import { useEffect, useMemo, useState } from "react"
import { CheckoutSuccessSummary, type CheckoutSuccessInfo } from "../../components/checkout/CheckoutSuccessSummary"
import { PageShell } from "../../components/layout/PageShell"
import { StoreFooter } from "../../components/layout/StoreFooter"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import { Button } from "../../components/ui/Button"
import { Card } from "../../components/ui/Card"
import { EmptyState } from "../../components/ui/States"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import { getScopedBuyerStoreId } from "../../lib/buyer-api"
import { useBuyerPageSettings } from "../../lib/useBuyerPageSettings"
import { buildSettingsStoreHref } from "../../lib/storefront-links"
import {
  clearPlatformCheckoutSession,
  isPlatformCheckoutComplete,
  nextPendingPlatformCheckoutGroup,
  readPlatformCheckoutSession,
} from "../../lib/platform-checkout-session"

type CheckoutSuccessPageProps = { cartCount: number }
const successStorageKey = (storeId: string) => `citigoo:${storeId}:checkout_success`

const readSuccessInfo = (): CheckoutSuccessInfo | null => {
  const params = new URLSearchParams(window.location.search)
  const orderId = params.get("order_id") ?? ""
  const storeFromQuery = params.get("store")?.trim()
  const storeId = storeFromQuery || getScopedBuyerStoreId()
  const raw = window.sessionStorage.getItem(successStorageKey(storeId))
  if (!raw) return orderId ? { orderId } : null
  try {
    const parsed = JSON.parse(raw) as Partial<CheckoutSuccessInfo> & {
      order_id?: string
      display_id?: string
      currency_code?: string
      platformCheckoutId?: string
      platformCheckoutIndex?: number
      platformCheckoutCount?: number
      storeId?: string
    }
    const storedOrderId = parsed.orderId ?? parsed.order_id
    if (storedOrderId && (!orderId || storedOrderId === orderId)) {
      return {
        orderId: storedOrderId,
        displayId: parsed.displayId ?? parsed.display_id,
        email: parsed.email,
        total: parsed.total,
        currencyCode: parsed.currencyCode ?? parsed.currency_code,
        paymentProviderId: parsed.paymentProviderId,
        paymentMethodLabel: parsed.paymentMethodLabel ?? null,
        paymentStatus: parsed.paymentStatus,
        platformCheckoutId: parsed.platformCheckoutId,
        platformCheckoutIndex: parsed.platformCheckoutIndex,
        platformCheckoutCount: parsed.platformCheckoutCount,
        storeId: parsed.storeId,
      }
    }
  } catch (error) {
    console.warn("[checkout-success] unable to parse checkout success data", error)
  }
  return orderId ? { orderId } : null
}

const buildStoreCheckoutHref = (
  group: NonNullable<ReturnType<typeof nextPendingPlatformCheckoutGroup>>,
  session: NonNullable<ReturnType<typeof readPlatformCheckoutSession>>
) => {
  const params = new URLSearchParams({
    store: group.store_id,
    platform_checkout_id: session.platform_checkout_id,
    platform_checkout_index: String(group.platform_checkout_index),
    platform_checkout_count: String(group.platform_checkout_count),
  })
  return `/checkout?${params.toString()}`
}

export function CheckoutSuccessPage({ cartCount }: CheckoutSuccessPageProps) {
  const auth = useBuyerAuth()
  const [successInfo] = useState(() => readSuccessInfo())
  const [showCompletionStatus, setShowCompletionStatus] = useState(Boolean(successInfo?.orderId))
  const platformSession = useMemo(() => readPlatformCheckoutSession(), [])
  const platformCheckoutActive = Boolean(
    new URLSearchParams(window.location.search).get("platform_checkout") ||
      successInfo?.platformCheckoutId
  )
  const successStoreId = successInfo?.storeId?.trim()
  const { settings } = useBuyerPageSettings({
    marketplace: platformCheckoutActive,
    storeId: successStoreId,
  })
  const storeHref = buildSettingsStoreHref(settings)
  const pendingGroup = useMemo(
    () => (platformCheckoutActive ? nextPendingPlatformCheckoutGroup(platformSession) : null),
    [platformCheckoutActive, platformSession]
  )
  const allPlatformComplete = useMemo(
    () => (platformCheckoutActive ? isPlatformCheckoutComplete(platformSession) : false),
    [platformCheckoutActive, platformSession]
  )

  useEffect(() => {
    if (!successInfo?.orderId) return
    const timeout = window.setTimeout(() => setShowCompletionStatus(false), 900)
    return () => window.clearTimeout(timeout)
  }, [successInfo?.orderId])

  useEffect(() => {
    if (platformCheckoutActive && allPlatformComplete) {
      clearPlatformCheckoutSession()
    }
  }, [allPlatformComplete, platformCheckoutActive])

  return (
    <PageShell
      className="buyer-checkout-page buyer-checkout-success-page"
      contentClassName="buyer-checkout-success-shell"
      header={<StoreTopBar settings={settings} cartCount={cartCount} marketplaceMode={platformCheckoutActive} />}
      footer={<StoreFooter />}
      cartCount={cartCount}
      storeHref={storeHref}
    >
      {showCompletionStatus ? (
        <div className="buyer-checkout-completion-backdrop" role="status" aria-live="polite">
          <div className="buyer-checkout-completion-dialog">
            <div className="buyer-checkout-completion-spinner" aria-hidden="true" />
            <strong>Payment confirmed</strong>
            <p>Preparing your order details...</p>
            <small>Please wait a moment.</small>
          </div>
        </div>
      ) : null}
      {successInfo?.orderId ? (
        <>
          <CheckoutSuccessSummary info={successInfo} isAuthenticated={Boolean(auth.customer)} />
          {platformCheckoutActive && platformSession ? (
            <Card as="section" className="buyer-platform-checkout-success-followup">
              <p className="buyer-platform-checkout-kicker">Multi-store checkout</p>
              <h2>
                {allPlatformComplete
                  ? "All store orders are placed"
                  : `Continue checkout · ${platformSession.completed_store_ids.length} of ${platformSession.groups.length} stores complete`}
              </h2>
              <p>
                {allPlatformComplete
                  ? "Each store created its own order under the same platform checkout batch."
                  : pendingGroup
                    ? `Next up: pay ${pendingGroup.store_name}. Each store still completes its own payment.`
                    : "Return to platform checkout to review remaining stores."}
              </p>
              <div className="buyer-platform-checkout-actions">
                {!allPlatformComplete && pendingGroup ? (
                  <Button href={buildStoreCheckoutHref(pendingGroup, platformSession)}>
                    Continue to {pendingGroup.store_name}
                  </Button>
                ) : null}
                <Button variant={allPlatformComplete ? "primary" : "secondary"} href="/account/orders">
                  View all orders
                </Button>
                {!allPlatformComplete ? (
                  <Button variant="ghost" href="/checkout/platform">
                    Platform checkout overview
                  </Button>
                ) : (
                  <Button variant="ghost" href="/">
                    Continue shopping
                  </Button>
                )}
              </div>
            </Card>
          ) : null}
        </>
      ) : (
        <EmptyState
          title="No completed order found"
          message="This page only shows a real order returned by completed checkout."
          action={{ label: "Continue shopping", href: "/store" }}
        />
      )}
    </PageShell>
  )
}
