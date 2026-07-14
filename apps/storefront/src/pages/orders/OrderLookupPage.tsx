import { useState } from "react"
import { OrderLookupForm } from "../../components/orders/OrderLookupForm"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import { PageShell } from "../../components/layout/PageShell"
import { StoreFooter } from "../../components/layout/StoreFooter"
import { lookupOrder } from "../../lib/buyer-api"
import { useBuyerPageSettings } from "../../lib/useBuyerPageSettings"

type OrderLookupPageProps = {
  cartCount: number
}

export function OrderLookupPage({ cartCount }: OrderLookupPageProps) {
  const { settings, marketplaceMode } = useBuyerPageSettings()
  const [email, setEmail] = useState("")
  const [displayId, setDisplayId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const handleSubmit = async () => {
    setError(undefined)
    if (!email.includes("@")) {
      setError("Enter the email used at checkout.")
      return
    }
    if (!displayId.trim() || !/^\d+$/.test(displayId.trim())) {
      setError("Enter a positive numeric order display id.")
      return
    }

    setLoading(true)
    try {
      const order = await lookupOrder(email, displayId)
      if (!order.orderId) {
        throw new Error("Order lookup succeeded without an order_id.")
      }
      const params = new URLSearchParams({ email: email.trim().toLowerCase() })
      if (order.displayId) params.set("display_id", order.displayId)
      window.location.assign(`/account/orders/${encodeURIComponent(order.orderId)}?${params.toString()}`)
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : "Unable to find that order.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell
      className="buyer-orders-page"
      contentClassName="buyer-orders-main buyer-order-lookup-main"
      header={<StoreTopBar settings={settings} cartCount={cartCount} marketplaceMode={marketplaceMode} />}
      footer={<StoreFooter />}
    >
        <OrderLookupForm
          email={email}
          displayId={displayId}
          loading={loading}
          error={error}
          onEmailChange={setEmail}
          onDisplayIdChange={setDisplayId}
          onSubmit={handleSubmit}
        />
    </PageShell>
  )
}
