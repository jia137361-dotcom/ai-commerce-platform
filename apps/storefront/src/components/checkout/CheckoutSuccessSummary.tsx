import { useEffect, useState } from "react"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import {
  ensureSupplierCatalogBlank,
  fetchSupplierCatalog,
  formatBuyerMoney,
  type SupplierCatalogItem,
} from "../../lib/buyer-api"
import { navigateBuyer } from "../../lib/buyer-navigate"

export type CheckoutSuccessInfo = {
  orderId: string
  displayId?: string
  email?: string | null
  total?: number
  currencyCode?: string
  paymentProviderId?: string
  paymentMethodLabel?: string | null
  paymentStatus?: unknown
  platformCheckoutId?: string
  platformCheckoutIndex?: number
  platformCheckoutCount?: number
  storeId?: string
}

export function CheckoutSuccessSummary({
  info,
  isAuthenticated = false,
}: {
  info: CheckoutSuccessInfo
  isAuthenticated?: boolean
}) {
  const detailHref = isAuthenticated
    ? `/account/orders/${encodeURIComponent(info.orderId)}`
    : info.email
      ? `/account/orders/${encodeURIComponent(info.orderId)}?${new URLSearchParams({ email: info.email }).toString()}`
      : "/account/orders"
  const [recs, setRecs] = useState<SupplierCatalogItem[]>([])
  const [openingId, setOpeningId] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    void fetchSupplierCatalog({ page: 1, perPage: 4 }).then((result) => {
      if (!active) return
      setRecs(result.data.items.slice(0, 4))
    })
    return () => {
      active = false
    }
  }, [])

  const openItem = async (item: SupplierCatalogItem) => {
    if (openingId != null) return
    setOpeningId(item.id)
    try {
      const ensured = await ensureSupplierCatalogBlank({ basicProductId: item.id })
      navigateBuyer(`/products/${encodeURIComponent(ensured.productId)}`)
    } catch {
      navigateBuyer("/store")
    } finally {
      setOpeningId(null)
    }
  }

  return (
    <div className="buyer-checkout-success-temu">
      <Card as="section" className="buyer-checkout-success-card buyer-checkout-success-card--temu">
        <div className="buyer-checkout-success-icon" aria-hidden="true">
          ✓
        </div>
        <h1>Transaction successful</h1>
        <div className="buyer-checkout-success-actions">
          <Button variant="secondary" href="/store">
            Return homepage
          </Button>
          <Button href={detailHref}>View order</Button>
        </div>
        {info.displayId || info.total != null ? (
          <p className="buyer-checkout-success-meta">
            {info.displayId ? `Order #${info.displayId}` : null}
            {info.displayId && info.total != null ? " · " : null}
            {info.total != null ? formatBuyerMoney(info.total, info.currencyCode ?? undefined) : null}
          </p>
        ) : null}
      </Card>

      {recs.length ? (
        <section className="buyer-checkout-success-recs" aria-label="Recommended for you">
          <h2>Recommended for you</h2>
          <div className="buyer-checkout-success-recs-grid">
            {recs.map((item) => (
              <button
                key={item.id}
                type="button"
                className="buyer-checkout-success-rec-card"
                disabled={openingId === item.id}
                onClick={() => void openItem(item)}
              >
                <div className="buyer-checkout-success-rec-media">
                  {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" /> : <span />}
                </div>
                <strong>{item.name}</strong>
                <span>
                  {item.estimatedRetailUsd != null
                    ? formatBuyerMoney(item.estimatedRetailUsd, "usd")
                    : "View"}
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
