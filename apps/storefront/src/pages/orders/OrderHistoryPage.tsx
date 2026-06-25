import { useEffect, useState } from "react"
import { OrderHistoryAuthRequired } from "../../components/orders/OrderHistoryAuthRequired"
import { OrderHistoryCard } from "../../components/orders/OrderHistoryCard"
import { OrderHistoryEmptyState } from "../../components/orders/OrderHistoryEmptyState"
import { OrderHistoryHeader } from "../../components/orders/OrderHistoryHeader"
import { OrderHistoryTabs, orderHistoryFilters, type OrderHistoryFilter } from "../../components/orders/OrderHistoryTabs"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import { PageShell } from "../../components/layout/PageShell"
import { StoreFooter } from "../../components/layout/StoreFooter"
import { ErrorState, LoadingState } from "../../components/ui/States"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import { confirmOrderReceived, fetchStoreSettings, getMyOrders, type BuyerOrdersPage, type BuyerStoreSettings } from "../../lib/buyer-api"

type OrderHistoryPageProps = {
  cartCount: number
}

const fallbackSettings: BuyerStoreSettings = {
  storeId: "default_store",
  brandName: "Citigoo",
  metadata: {},
}

export function OrderHistoryPage({ cartCount }: OrderHistoryPageProps) {
  const [settings, setSettings] = useState<BuyerStoreSettings>(fallbackSettings)
  const [ordersPage, setOrdersPage] = useState<BuyerOrdersPage | null>(null)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState<string | undefined>()
  const [activeFilter, setActiveFilter] = useState<OrderHistoryFilter>(orderHistoryFilters[0])
  const auth = useBuyerAuth()

  useEffect(() => {
    let active = true
    void fetchStoreSettings().then((result) => {
      if (active) setSettings(result.data)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    const loadOrders = async () => {
      if (!auth.customer) {
        setOrdersPage(null)
        return
      }
      setOrdersLoading(true)
      setOrdersError(undefined)
      try {
        const page = await getMyOrders({
          limit: 100,
          offset: 0,
          bucket: activeFilter.bucket,
        })
        if (!active) return
        setOrdersPage(page)
      } catch (error) {
        if (!active) return
        setOrdersPage(null)
        setOrdersError(error instanceof Error ? error.message : "Unable to load authenticated orders.")
      } finally {
        if (active) setOrdersLoading(false)
      }
    }
    void loadOrders()
    return () => {
      active = false
    }
  }, [activeFilter, auth.customer])

  const changeFilter = (filter: OrderHistoryFilter) => {
    setActiveFilter(filter)
  }

  return (
    <PageShell
      className="buyer-orders-page"
      contentClassName="buyer-orders-main buyer-order-history-main"
      header={<StoreTopBar settings={settings} cartCount={cartCount} />}
      footer={<StoreFooter />}
    >
      <OrderHistoryHeader signedInEmail={auth.customer?.email} />
      <OrderHistoryTabs activeKey={activeFilter.key} onChange={changeFilter} />
      {auth.isLoading ? (
        <LoadingState label="Checking account session..." />
      ) : auth.customer ? (
        ordersLoading ? (
          <LoadingState label="Loading your orders..." />
        ) : ordersError ? (
          <ErrorState
            title="Orders unavailable"
            message={ordersError}
            action={{ label: "Retry", onClick: () => window.location.reload() }}
          />
        ) : ordersPage?.orders.length ? (
          <section className="buyer-order-history-list" aria-label="Authenticated order history">
            {ordersPage.orders.map((order) => (
              <div key={order.orderId}>
                <OrderHistoryCard
                  order={order}
                  customerEmail={auth.customer?.email}
                  customerName={[auth.customer?.firstName, auth.customer?.lastName].filter(Boolean).join(" ") || undefined}
                  onConfirmReceipt={async (orderId) => { await confirmOrderReceived(orderId) }}
                  onReviewSubmitted={() => window.location.reload()}
                  onRefundSubmitted={() => window.location.reload()}
                />
              </div>
            ))}
          </section>
        ) : (
          <OrderHistoryEmptyState />
        )
      ) : (
        <OrderHistoryAuthRequired />
      )}
    </PageShell>
  )
}
