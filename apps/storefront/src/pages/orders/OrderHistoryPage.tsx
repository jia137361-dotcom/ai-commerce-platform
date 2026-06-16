import { useEffect, useState } from "react"
import { OrderHistoryAuthRequired } from "../../components/orders/OrderHistoryAuthRequired"
import { OrderHistoryCard } from "../../components/orders/OrderHistoryCard"
import { OrderHistoryEmptyState } from "../../components/orders/OrderHistoryEmptyState"
import { OrderHistoryHeader } from "../../components/orders/OrderHistoryHeader"
import { OrderHistoryPagination } from "../../components/orders/OrderHistoryPagination"
import { OrderHistoryTabs, orderHistoryFilters, type OrderHistoryFilter } from "../../components/orders/OrderHistoryTabs"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import { fetchStoreSettings, getMyOrders, type BuyerOrdersPage, type BuyerStoreSettings } from "../../lib/buyer-api"

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
  const [offset, setOffset] = useState(0)
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
          limit: 10,
          offset,
          status: activeFilter.status,
          paymentStatus: activeFilter.paymentStatus,
          fulfillmentStatus: activeFilter.fulfillmentStatus,
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
  }, [activeFilter, auth.customer, offset])

  const changeFilter = (filter: OrderHistoryFilter) => {
    setActiveFilter(filter)
    setOffset(0)
  }

  return (
    <div className="buyer-orders-page">
      <StoreTopBar settings={settings} cartCount={cartCount} />
      <main className="buyer-orders-main buyer-order-history-main">
        <OrderHistoryHeader signedInEmail={auth.customer?.email} />
        <OrderHistoryTabs activeKey={activeFilter.key} onChange={changeFilter} />
        {auth.isLoading ? (
          <section className="buyer-order-history-auth-card" role="status">Checking account session...</section>
        ) : auth.customer ? (
          ordersLoading ? (
            <section className="buyer-order-history-auth-card" role="status">Loading your orders...</section>
          ) : ordersError ? (
            <OrderHistoryEmptyState title="Orders unavailable" message={ordersError} />
          ) : ordersPage?.orders.length ? (
            <>
              <section className="buyer-order-history-list" aria-label="Authenticated order history">
                {ordersPage.orders.map((order) => (
                  <div key={order.orderId}>
                    <OrderHistoryCard order={order} />
                  </div>
                ))}
              </section>
              <OrderHistoryPagination count={ordersPage.count} limit={ordersPage.limit} offset={ordersPage.offset} onPage={setOffset} />
            </>
          ) : (
            <OrderHistoryEmptyState />
          )
        ) : (
          <OrderHistoryAuthRequired />
        )}
      </main>
    </div>
  )
}
