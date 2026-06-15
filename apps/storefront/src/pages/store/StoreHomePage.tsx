import { useEffect, useMemo, useState } from "react"
import {
  fetchProductCategories,
  fetchProducts,
  fetchStoreSettings,
  type BuyerCategory,
  type BuyerStoreSettings,
  type DataSource,
} from "../../lib/buyer-api"
import type { StoreProduct } from "../../lib/mock-data"
import { StoreCategoryNav } from "../../components/store-home/StoreCategoryNav"
import { StoreHero } from "../../components/store-home/StoreHero"
import { StoreProductGrid } from "../../components/store-home/StoreProductGrid"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"

type StoreHomePageProps = {
  cartCount: number
}

type Notice = {
  key: string
  message: string
}

const fallbackSettings: BuyerStoreSettings = {
  storeId: "default_store",
  brandName: "Nespresso",
  metadata: {},
}

const defaultCategories: BuyerCategory[] = [{ id: "all", name: "All", slug: "all" }]

const policies = [
  "Shipping",
  "Payment",
  "Returns & exchanges",
  "Cancellations",
  "Frequently asked questions",
]

export function StoreHomePage({ cartCount }: StoreHomePageProps) {
  const [settings, setSettings] = useState<BuyerStoreSettings>(fallbackSettings)
  const [categories, setCategories] = useState<BuyerCategory[]>(defaultCategories)
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [notices, setNotices] = useState<Notice[]>([])
  const [activeCategoryId, setActiveCategoryId] = useState("all")
  const [query, setQuery] = useState("")
  const [productSource, setProductSource] = useState<DataSource>("backend")

  useEffect(() => {
    let active = true

    const load = async () => {
      setLoading(true)
      const [settingsResult, categoriesResult, productsResult] = await Promise.all([
        fetchStoreSettings(),
        fetchProductCategories(),
        fetchProducts(),
      ])

      if (!active) return

      setSettings(settingsResult.data)
      setCategories(categoriesResult.data)
      setProducts(productsResult.data)
      setProductSource(productsResult.source)
      setNotices(
        [settingsResult, categoriesResult, productsResult]
          .filter((result) => result.error)
          .map((result, index) => ({
            key: `${result.source}-${index}-${result.error}`,
            message: `${result.source === "mock" ? "Mock" : "Static"} fallback: ${result.error}`,
          }))
      )
      setLoading(false)
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return products.filter((product) => {
      const categoryMatch =
        activeCategoryId === "all" ||
        product.categoryIds?.includes(activeCategoryId) ||
        product.category.toLowerCase() === categories.find((category) => category.id === activeCategoryId)?.name.toLowerCase()
      const queryMatch =
        !normalizedQuery ||
        `${product.title} ${product.description ?? ""} ${product.category}`.toLowerCase().includes(normalizedQuery)

      return categoryMatch && queryMatch
    })
  }, [activeCategoryId, categories, products, query])

  return (
    <div className="buyer-store-page">
      <StoreTopBar settings={settings} cartCount={cartCount} />
      <StoreHero brandName={settings.brandName} />
      <StoreCategoryNav
        categories={categories}
        activeCategoryId={activeCategoryId}
        onCategoryChange={setActiveCategoryId}
        query={query}
        onQueryChange={setQuery}
      />

      <main className="buyer-store-main">
        {notices.length > 0 && (
          <div className="buyer-store-fallback" role="status">
            {notices.map((notice) => (
              <p key={notice.key}>{notice.message}</p>
            ))}
          </div>
        )}

        <p className="buyer-store-breadcrumb">Nespresso Samra Origins</p>

        {loading ? (
          <section className="buyer-store-state" role="status">
            <strong>Loading store products...</strong>
          </section>
        ) : filteredProducts.length ? (
          <>
            {productSource === "mock" && (
              <div className="buyer-store-source">Showing fallback products because the Store API is unavailable or empty.</div>
            )}
            <StoreProductGrid products={filteredProducts} />
            <button className="buyer-store-see-more" type="button">See more</button>
          </>
        ) : (
          <section className="buyer-store-state">
            <strong>No products found</strong>
            <span>Try another category or search term.</span>
          </section>
        )}

        <section className="buyer-store-policies" aria-label="Shop policies">
          <h1>Shop policies</h1>
          {policies.map((policy) => (
            <button key={policy} type="button">
              <span>{policy}</span>
              <span aria-hidden="true">⌄</span>
            </button>
          ))}
          <p>Last updated on Sep 17, 2025</p>
        </section>
      </main>

      <footer className="buyer-store-footer">
        <section>
          <h2>Citigoo</h2>
          <p>
            <strong>Hongkong:</strong> Citigoo Limited,<br />
            Rm 1805-06, 18/F, Hollywood<br />
            Plaza, 610 Nathan Road,<br />
            Kowloon, HK
          </p>
        </section>
        <section>
          <h2>Information</h2>
          <a href="/about">About Us</a>
          <a href="/store/about">Policies</a>
          <a href="/store">Affiliate & Influencer Program</a>
        </section>
        <section>
          <h2>Customer Service</h2>
          <a href="/help">Refund And Replacement</a>
          <a href="/help">Shipping Information</a>
          <a href="/help">Payment Method</a>
          <a href="/account/orders">Order Status</a>
        </section>
        <section>
          <h2>Help</h2>
          <a href="/help">Help Center</a>
          <a href="/help">Contact Us</a>
          <a href="/help">Citigoo Purchase Protection</a>
        </section>
        <div className="buyer-store-legal">
          <span>© 2024 Citigoo Limited</span>
          <a href="/terms">Term of Service</a>
          <a href="/privacy">Privacy policy</a>
          <span className="buyer-store-payments">▰ ▰ ▰ ▰ ▰</span>
        </div>
      </footer>
    </div>
  )
}
