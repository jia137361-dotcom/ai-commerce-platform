import { useEffect, useState } from "react"
import { OrderHistoryAuthRequired } from "../../components/orders/OrderHistoryAuthRequired"
import { OrderHistoryGroupSection } from "../../components/orders/OrderHistoryGroupSection"
import { OrderHistoryEmptyState } from "../../components/orders/OrderHistoryEmptyState"
import { OrderHistoryHeader } from "../../components/orders/OrderHistoryHeader"
import { OrderHistoryTabs, orderHistoryFilters, type OrderHistoryFilter } from "../../components/orders/OrderHistoryTabs"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import { PageShell } from "../../components/layout/PageShell"
import { StoreFooter } from "../../components/layout/StoreFooter"
import { ErrorState, LoadingState } from "../../components/ui/States"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import { confirmOrderReceived, getMyOrders, type BuyerOrdersPage } from "../../lib/buyer-api"
import { useBuyerPageSettings } from "../../lib/useBuyerPageSettings"
import { groupOrdersForHistory } from "./order-history-groups"

type OrderHistoryPageProps = {
  cartCount: number
}

export function OrderHistoryPage({ cartCount }: OrderHistoryPageProps) {
  const { settings, marketplaceMode } = useBuyerPageSettings({ marketplace: true })
  const [ordersPage, setOrdersPage] = useState<BuyerOrdersPage | null>(null)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState<string | undefined>()
  const [activeFilter, setActiveFilter] = useState<OrderHistoryFilter>(orderHistoryFilters[0])
  const auth = useBuyerAuth()

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
          scope: "platform",
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

  const orderGroups = ordersPage?.orders ? groupOrdersForHistory(ordersPage.orders) : []

  return (
    <PageShell
      className="buyer-orders-page"
      contentClassName="buyer-orders-main buyer-order-history-main"
      header={<StoreTopBar settings={settings} cartCount={cartCount} marketplaceMode={marketplaceMode} />}
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
        ) : orderGroups.length ? (
          <section className="buyer-order-history-list" aria-label="Authenticated order history">
            {orderGroups.map((group) => (
              <div key={group.key}>
                <OrderHistoryGroupSection
                  group={group}
                  customerEmail={auth.customer?.email}
                  customerName={[auth.customer?.firstName, auth.customer?.lastName].filter(Boolean).join(" ") || undefined}
                  onConfirmReceipt={async (orderId, storeId) => {
                    await confirmOrderReceived(orderId, { storeId })
                  }}
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
