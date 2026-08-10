import { useEffect, useMemo, useState } from "react"
import { PageShell } from "../../components/layout/PageShell"
import { StoreFooter } from "../../components/layout/StoreFooter"
import { SectionHeader } from "../../components/layout/SectionHeader"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import { marketplaceBuyerSettings } from "../../lib/buyer-api"
import { enterLegacyDefaultStoreContext } from "../../lib/buyer-store-context"
import { readBrowseHistory, type BrowseHistoryItem } from "../../lib/buyer-browse-history"
import { buildSettingsStoreHref } from "../../lib/storefront-links"

type MarketplaceHomePageProps = {
  cartCount: number
}

export function MarketplaceHomePage({ cartCount }: MarketplaceHomePageProps) {
  const auth = useBuyerAuth()
  const [history, setHistory] = useState<BrowseHistoryItem[]>([])
  const [query, setQuery] = useState("")

  useEffect(() => {
    // History uses marketplace chrome; keep cart/messages on the default store.
    enterLegacyDefaultStoreContext()
  }, [])

  useEffect(() => {
    setHistory(
      readBrowseHistory({
        customerId: auth.customer?.id,
        email: auth.customer?.email,
      })
    )
  }, [auth.customer?.id, auth.customer?.email])

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return history
    return history.filter((item) => item.title.toLowerCase().includes(normalized))
  }, [history, query])

  const storeHref = buildSettingsStoreHref(marketplaceBuyerSettings)

  return (
    <PageShell
      className="buyer-store-page buyer-marketplace-page"
      contentClassName="buyer-shop-shell-content"
      header={<StoreTopBar settings={marketplaceBuyerSettings} cartCount={cartCount} marketplaceMode />}
      footer={<StoreFooter />}
      cartCount={cartCount}
      storeHref={storeHref}
    >
      <section className="buyer-marketplace-hero">
        <p className="buyer-marketplace-eyebrow">History</p>
        <h1>Browsing history</h1>
        <p>
          {auth.customer
            ? "Products you recently viewed while signed in."
            : "Products you recently viewed on this device."}
        </p>
      </section>

      <section className="buyer-marketplace-section">
        <SectionHeader
          eyebrow="Recently viewed"
          title="Your history"
          description={`${visible.length} ${visible.length === 1 ? "item" : "items"}`}
        />
        <div className="buyer-marketplace-search-row">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search history"
            aria-label="Search browsing history"
          />
        </div>
        {!visible.length ? (
          <p className="buyer-marketplace-status">
            No browsing history yet. Open a product in{" "}
            <a href="/store?store_id=default_store">ciiverse</a> to start building it.
          </p>
        ) : (
          <div className="buyer-marketplace-store-grid buyer-marketplace-history-grid">
            {visible.map((item) => (
              <a key={item.id} className="buyer-marketplace-store-card" href={item.href}>
                <div className="buyer-marketplace-store-media">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" loading="lazy" />
                  ) : (
                    <span>{item.title.slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
                <div className="buyer-marketplace-store-body">
                  <h3>{item.title}</h3>
                  {item.price != null ? <p>${item.price.toFixed(2)}</p> : <p>View product</p>}
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  )
}
