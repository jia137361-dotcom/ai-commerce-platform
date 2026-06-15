import { useEffect, useMemo, useState } from "react"
import { ProductMediaGallery } from "../../components/product-detail/ProductMediaGallery"
import { ProductPurchasePanel } from "../../components/product-detail/ProductPurchasePanel"
import { ProductReviewSection } from "../../components/product-detail/ProductReviewSection"
import { ProductSharePanel } from "../../components/product-detail/ProductSharePanel"
import { StoreCategoryNav } from "../../components/store-home/StoreCategoryNav"
import { StoreHero } from "../../components/store-home/StoreHero"
import { StoreProductGrid } from "../../components/store-home/StoreProductGrid"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import {
  addCartLineItem,
  createCart,
  fetchProductCategories,
  fetchProductDetail,
  fetchProductReviews,
  fetchProducts,
  fetchProductShare,
  fetchStoreSettings,
  getBuyerCartStorageKey,
  type BuyerCategory,
  type BuyerReviewsSummary,
  type BuyerShareInfo,
  type BuyerStoreSettings,
  type DataSource,
} from "../../lib/buyer-api"
import type { StoreCart, StoreProduct } from "../../lib/mock-data"

type ProductDetailPageProps = {
  productId: string
  cartCount: number
  onCartUpdated: (cart: StoreCart) => void
}

type Notice = {
  label: string
  message: string
}

const fallbackSettings: BuyerStoreSettings = {
  storeId: "default_store",
  brandName: "Nespresso",
  metadata: {},
}

const defaultCategories: BuyerCategory[] = [{ id: "all", name: "All", slug: "all" }]

export function ProductDetailPage({ productId, cartCount, onCartUpdated }: ProductDetailPageProps) {
  const [settings, setSettings] = useState<BuyerStoreSettings>(fallbackSettings)
  const [categories, setCategories] = useState<BuyerCategory[]>(defaultCategories)
  const [product, setProduct] = useState<StoreProduct | null>(null)
  const [reviews, setReviews] = useState<BuyerReviewsSummary | null>(null)
  const [share, setShare] = useState<BuyerShareInfo | null>(null)
  const [recommendations, setRecommendations] = useState<StoreProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [notices, setNotices] = useState<Notice[]>([])
  const [reviewSource, setReviewSource] = useState<DataSource>("backend")
  const [shareSource, setShareSource] = useState<DataSource>("backend")
  const [shareError, setShareError] = useState<string | undefined>()
  const [query, setQuery] = useState("")
  const [activeCategoryId, setActiveCategoryId] = useState("all")
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const [addNotice, setAddNotice] = useState<string | undefined>()

  useEffect(() => {
    let active = true

    const load = async () => {
      setLoading(true)
      setAddNotice(undefined)
      const [productResult, reviewsResult, settingsResult, categoriesResult, productsResult] = await Promise.all([
        fetchProductDetail(productId),
        fetchProductReviews(productId),
        fetchStoreSettings(),
        fetchProductCategories(),
        fetchProducts(),
      ])
      const shareResult = await fetchProductShare(productResult.data)

      if (!active) return

      setProduct(productResult.data)
      setReviews(reviewsResult.data)
      setSettings(settingsResult.data)
      setCategories(categoriesResult.data)
      setRecommendations(productsResult.data.filter((item) => item.id !== productResult.data.id).slice(0, 3))
      setShare(shareResult.data)
      setReviewSource(reviewsResult.source)
      setShareSource(shareResult.source)
      setShareError(shareResult.error)
      setNotices(
        [
          { label: "product", result: productResult },
          { label: "reviews", result: reviewsResult },
          { label: "settings", result: settingsResult },
          { label: "categories", result: categoriesResult },
          { label: "recommendations", result: productsResult },
          { label: "share", result: shareResult },
        ]
          .filter((item) => item.result.error)
          .map((item) => ({ label: item.label, message: item.result.error ?? "" }))
      )
      setLoading(false)
    }

    void load()
    return () => {
      active = false
    }
  }, [productId])

  const galleryImages = useMemo(() => {
    if (!product) return []
    return [product.mockupImageUrl, product.imageUrl, product.designImageUrl].filter(Boolean) as string[]
  }, [product])

  const addToCart = async () => {
    if (!product?.medusaVariantId) {
      setAddNotice("This product is missing a Medusa variant id.")
      return
    }

    setAdding(true)
    setAddNotice(undefined)
    try {
      const storageKey = getBuyerCartStorageKey(settings.storeId)
      let cartId = window.localStorage.getItem(storageKey)
      if (!cartId) {
        const created = await createCart()
        cartId = created.id
        window.localStorage.setItem(storageKey, created.id)
      }

      let updated: StoreCart
      try {
        updated = await addCartLineItem(cartId, product.medusaVariantId, quantity)
      } catch (error) {
        console.warn("[buyer-api] add to cart failed, creating a fresh store-scoped cart", {
          message: error instanceof Error ? error.message : String(error),
          storageKey,
        })
        const created = await createCart()
        window.localStorage.setItem(storageKey, created.id)
        updated = await addCartLineItem(created.id, product.medusaVariantId, quantity)
      }
      window.localStorage.setItem(storageKey, updated.id)
      onCartUpdated(updated)
      setAddNotice("Added to cart.")
    } catch (error) {
      setAddNotice(error instanceof Error ? error.message : "Unable to add this product to cart.")
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="buyer-product-page">
      <StoreTopBar settings={settings} cartCount={cartCount} />
      <StoreHero brandName={settings.brandName} />
      <StoreCategoryNav
        categories={categories}
        activeCategoryId={activeCategoryId}
        onCategoryChange={setActiveCategoryId}
        query={query}
        onQueryChange={setQuery}
      />

      <main className="buyer-product-main">
        {notices.length > 0 && (
          <div className="buyer-product-api-notices" role="status">
            {notices.map((notice) => (
              <p key={`${notice.label}-${notice.message}`}>{notice.label}: {notice.message}</p>
            ))}
          </div>
        )}

        <p className="buyer-product-breadcrumb">Nespresso Samra Origins</p>

        {loading || !product ? (
          <section className="buyer-product-loading" role="status">Loading product detail...</section>
        ) : (
          <>
            <section className="buyer-product-campaign">
              <div className="buyer-product-campaign-hero">
                <strong>Nespresso</strong>
                <span>Samra Origins</span>
                <p>Experience a taste that moves you</p>
              </div>
              <div className="buyer-product-campaign-tiles">
                <article>Shop Machines</article>
                <article>Shop Coffee</article>
              </div>
            </section>

            <section className="buyer-product-detail-row">
              <ProductMediaGallery images={galleryImages} title={product.title} />
              <ProductPurchasePanel
                product={product}
                quantity={quantity}
                setQuantity={setQuantity}
                adding={adding}
                addNotice={addNotice}
                onAddToCart={() => void addToCart()}
              />
            </section>

            <section className="buyer-product-story buyer-product-story-flipped">
              <div>
                <h2>{product.title}</h2>
                <p>{product.description ?? "Nespresso Samra Origins brings a premium tasting ritual into a clear, commerce-ready product experience."}</p>
                <a href={`/products/${encodeURIComponent(product.id)}`}>See all details</a>
              </div>
              <ProductMediaGallery images={galleryImages} title={product.title} />
            </section>

            {recommendations.length > 0 && (
              <section className="buyer-product-recommendations">
                <div className="buyer-product-section-title">
                  <span>Recommendations from Nespresso</span>
                </div>
                <StoreProductGrid products={recommendations} />
              </section>
            )}

            <section className="buyer-product-wide-banner" aria-label="Nespresso Samra Origins banner">
              <strong>Nespresso</strong>
              <span>Samra Origins</span>
            </section>

            {reviews && <ProductReviewSection summary={reviews} source={reviewSource} error={notices.find((notice) => notice.label === "reviews")?.message} />}
            {share && <ProductSharePanel share={share} source={shareSource} error={shareError} />}
          </>
        )}
      </main>

      <footer className="buyer-product-footer">
        <section>
          <h2>Citigoo</h2>
          <p><strong>Hongkong:</strong> Citigoo Limited,<br />Rm 1805-06, 18/F, Hollywood<br />Plaza, 610 Nathan Road,<br />Kowloon, HK</p>
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
        <div className="buyer-product-legal">
          <span>© 2024 Citigoo Limited</span>
          <a href="/terms">Term of Service</a>
          <a href="/privacy">Privacy policy</a>
          <span>AMEX MC PayPal DISC Visa</span>
        </div>
      </footer>
    </div>
  )
}
