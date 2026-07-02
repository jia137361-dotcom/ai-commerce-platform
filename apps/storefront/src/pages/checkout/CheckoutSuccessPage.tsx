import { useEffect, useState } from "react"
import { CheckoutSuccessSummary, type CheckoutSuccessInfo } from "../../components/checkout/CheckoutSuccessSummary"
import { PageShell } from "../../components/layout/PageShell"
import { StoreFooter } from "../../components/layout/StoreFooter"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import { EmptyState } from "../../components/ui/States"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import { fetchStoreSettings, getBuyerStoreId, type BuyerStoreSettings } from "../../lib/buyer-api"

type CheckoutSuccessPageProps = { cartCount: number }
const fallbackSettings: BuyerStoreSettings = { storeId: "default_store", brandName: "Citigoo", metadata: {} }
const successStorageKey = () => `citigoo:${getBuyerStoreId()}:checkout_success`

const readSuccessInfo = (): CheckoutSuccessInfo | null => {
  const params = new URLSearchParams(window.location.search)
  const orderId = params.get("order_id") ?? ""
  const raw = window.sessionStorage.getItem(successStorageKey())
  if (!raw) return orderId ? { orderId } : null
  try {
    const parsed = JSON.parse(raw) as Partial<CheckoutSuccessInfo> & { order_id?: string; display_id?: string; currency_code?: string }
    const storedOrderId = parsed.orderId ?? parsed.order_id
    if (storedOrderId && (!orderId || storedOrderId === orderId)) return {
      orderId: storedOrderId,
      displayId: parsed.displayId ?? parsed.display_id,
      email: parsed.email,
      total: parsed.total,
      currencyCode: parsed.currencyCode ?? parsed.currency_code,
      paymentProviderId: parsed.paymentProviderId,
      paymentMethodLabel: parsed.paymentMethodLabel ?? null,
      paymentStatus: parsed.paymentStatus,
    }
  } catch (error) {
    console.warn("[checkout-success] unable to parse checkout success data", error)
  }
  return orderId ? { orderId } : null
}

export function CheckoutSuccessPage({ cartCount }: CheckoutSuccessPageProps) {
  const auth = useBuyerAuth()
  const [settings, setSettings] = useState<BuyerStoreSettings>(fallbackSettings)
  const [successInfo] = useState(() => readSuccessInfo())
  useEffect(() => {
    let active = true
    void fetchStoreSettings().then((result) => { if (active) setSettings(result.data) })
    return () => { active = false }
  }, [])
  return (
    <PageShell className="buyer-checkout-page buyer-checkout-success-page" contentClassName="buyer-checkout-success-shell" header={<StoreTopBar settings={settings} cartCount={cartCount} />} footer={<StoreFooter />}>
      {successInfo?.orderId ? <CheckoutSuccessSummary info={successInfo} isAuthenticated={Boolean(auth.customer)} /> : <EmptyState title="No completed order found" message="This page only shows a real order returned by completed checkout." action={{ label: "Continue shopping", href: "/store" }} />}
    </PageShell>
  )
}
