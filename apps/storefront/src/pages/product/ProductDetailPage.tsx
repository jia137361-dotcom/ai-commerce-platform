import { useCallback, useEffect, useMemo, useState } from "react"
import { PageShell } from "../../components/layout/PageShell"
import { ProductCard } from "../../components/products/ProductCard"
import { ProductDetailStatus } from "../../components/product-detail/ProductDetailStatus"
import { ProductDetailsSection } from "../../components/product-detail/ProductDetailsSection"
import { ProductMediaGallery } from "../../components/product-detail/ProductMediaGallery"
import { ProductPurchasePanel } from "../../components/product-detail/ProductPurchasePanel"
import { ProductReviewSection } from "../../components/product-detail/ProductReviewSection"
import { ProductStoreCard } from "../../components/product-detail/ProductStoreCard"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import { StoreFooter } from "../../components/layout/StoreFooter"
import {
  addCartLineItem,
  createCart,
  fetchProductDetail,
  fetchProductReviews,
  fetchProducts,
  fetchProductShare,
  fetchStoreSettings,
  getBuyerCartStorageKey,
  readBuyerPreferences,
  type BuyerReviewsSummary,
  type BuyerShareInfo,
  type BuyerStoreSettings,
  type DataSource,
} from "../../lib/buyer-api"
import type { StoreCart, StoreProduct } from "../../lib/mock-data"
import { addProductSelectionToCart } from "./product-cart-action"
import { resolveProductPurchaseState, resolveSelectedProductVariant } from "./product-detail-state"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import { buildProductSignInHref } from "./product-auth"
import { getBuyerCartIdentity } from "../../lib/buyer-cart-storage"

type ProductDetailPageProps = { productId: string; cartCount: number; onCartUpdated: (cart: StoreCart) => void }
type Notice = { label: string; message: string }

const fallbackSettings: BuyerStoreSettings = { storeId: "default_store", brandName: "Citigoo Official Store", metadata: {} }

export function ProductDetailPage({ productId, cartCount, onCartUpdated }: ProductDetailPageProps) {
  const auth = useBuyerAuth()
  const [settings, setSettings] = useState<BuyerStoreSettings>(fallbackSettings)
  const [product, setProduct] = useState<StoreProduct | null>(null)
  const [reviews, setReviews] = useState<BuyerReviewsSummary | null>(null)
  const [share, setShare] = useState<BuyerShareInfo | null>(null)
  const [recommendations, setRecommendations] = useState<StoreProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [fatalError, setFatalError] = useState<string | undefined>()
  const [notices, setNotices] = useState<Notice[]>([])
  const [reviewSource, setReviewSource] = useState<DataSource>("backend")
  const [shareError, setShareError] = useState<string | undefined>()
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>()
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const [addNotice, setAddNotice] = useState<{ tone: "success" | "error"; message: string } | undefined>()
  const [loadVersion, setLoadVersion] = useState(0)
  const reviewOrderNumber = new URLSearchParams(window.location.search).get("reviewOrder")
  const viewReviewOrderNumber = new URLSearchParams(window.location.search).get("viewReviewOrder")

  const loadProduct = useCallback(async (isActive: () => boolean) => {
    setLoading(true)
    setFatalError(undefined)
    setAddNotice(undefined)
    const [productResult, reviewsResult, settingsResult, productsResult] = await Promise.all([
      fetchProductDetail(productId),
      fetchProductReviews(productId),
      fetchStoreSettings(),
      fetchProducts(),
    ])
    if (!isActive()) return

    setSettings(settingsResult.data)
    setReviewSource(reviewsResult.source)
    setReviews(reviewsResult.data)

    if (!productResult.data) {
      setProduct(null)
      setShare(null)
      setRecommendations([])
      setFatalError(productResult.error ?? "Product not found")
      setNotices([])
      setLoading(false)
      return
    }

    const realProduct = productResult.data
    const shareResult =
      productResult.source === "backend"
        ? await fetchProductShare(realProduct)
        : { data: null as BuyerShareInfo | null, source: productResult.source as DataSource, error: undefined }
    if (!isActive()) return
    setProduct(realProduct)
    setSelectedVariantId(realProduct.variants?.[0]?.id ?? realProduct.medusaVariantId)
    setRecommendations(
      productsResult.data.filter((item) => item.id !== realProduct.id).slice(0, 4)
    )
    setShare(shareResult.data)
    setShareError(shareResult.error)
    setNotices([
      ...(productResult.source !== "backend"
        ? [{ label: "product", message: productResult.error ?? "Showing fallback product data." }]
        : []),
      { label: "reviews", message: reviewsResult.error },
      { label: "store", message: settingsResult.error },
      { label: "recommendations", message: productsResult.error },
      { label: "share", message: shareResult.error },
    ].filter((notice): notice is Notice => Boolean(notice.message)))
    setLoading(false)
  }, [productId])

  useEffect(() => {
    let active = true
    void loadProduct(() => active)
    return () => {
      active = false
    }
  }, [loadProduct, loadVersion])

  const galleryImages = useMemo(() => product ? [product.mockupImageUrl, product.imageUrl, product.designImageUrl].filter(Boolean) as string[] : [], [product])
  const variants = product?.variants ?? []
  const selectedVariant = product ? resolveSelectedProductVariant(product, selectedVariantId) : undefined
  const purchaseState = product ? resolveProductPurchaseState(product, selectedVariant) : { canAdd: false, availabilityLabel: "Unavailable", availabilityTone: "neutral" as const }

  const addToCart = async () => {
    if (!product || !selectedVariant?.id || !purchaseState.canAdd || adding) return
    if (!auth.customer) {
      const returnTo = `${window.location.pathname}${window.location.search}`
      window.location.assign(buildProductSignInHref(returnTo))
      return
    }
    setAdding(true)
    setAddNotice(undefined)
    try {
      const updated = await addProductSelectionToCart({
        variantId: selectedVariant.id,
        quantity,
        storageKey: getBuyerCartStorageKey(
          settings.storeId,
          getBuyerCartIdentity(auth.customer.id, window.localStorage)
        ),
        storage: window.localStorage,
        createCart: () =>
          createCart({ countryCode: readBuyerPreferences(auth.customer).countryCode }),
        addLineItem: addCartLineItem,
      })
      onCartUpdated(updated)
      setAddNotice({ tone: "success", message: "Added to cart." })
    } catch (error) {
      setAddNotice({ tone: "error", message: error instanceof Error ? error.message : "Unable to add this product to cart." })
    } finally {
      setAdding(false)
    }
  }

  return (
    <PageShell className="buyer-product-page" contentClassName="buyer-product-shell-content" header={<StoreTopBar settings={settings} cartCount={cartCount} />} footer={<StoreFooter />}>
      <nav className="buyer-product-breadcrumb" aria-label="Breadcrumb"><a href="/store">Store</a><span>/</span><span>{product?.title ?? "Product"}</span></nav>
      {notices.length ? <aside className="buyer-product-api-notices" role="status">{notices.map((notice) => <p key={`${notice.label}-${notice.message}`}>{notice.label} fallback: {notice.message}</p>)}</aside> : null}

      <ProductDetailStatus loading={loading} error={fatalError} onRetry={() => setLoadVersion((version) => version + 1)} />

      {!loading && product ? <>
        <section className="buyer-product-primary">
          <ProductMediaGallery images={galleryImages} title={product.title} />
          <ProductPurchasePanel
            product={product}
            variants={variants}
            selectedVariantId={selectedVariant?.id}
            onVariantChange={setSelectedVariantId}
            purchaseState={purchaseState}
            quantity={quantity}
            setQuantity={setQuantity}
            adding={adding}
            authLoading={auth.isLoading}
            requiresSignIn={!auth.isLoading && !auth.customer}
            addNotice={addNotice}
            onAddToCart={() => void addToCart()}
            share={share}
          />
        </section>
        <ProductStoreCard settings={settings} />
        <ProductDetailsSection product={product} />

        {recommendations.length ? <section className="buyer-product-recommendations"><header><p>More from this store</p><h2>You may also like</h2></header><div className="buyer-product-recommendation-grid">{recommendations.map((item) => <div key={item.id}><ProductCard product={item} /></div>)}</div></section> : null}
        <ProductReviewSection
          summary={reviews}
          source={reviewSource}
          error={notices.find((notice) => notice.label === "reviews")?.message}
          review={reviewOrderNumber && auth.customer?.email ? { productId: product.id, orderNumber: reviewOrderNumber, email: auth.customer.email, customerName: [auth.customer.firstName, auth.customer.lastName].filter(Boolean).join(" ") || undefined } : undefined}
          viewReviewOrderNumber={viewReviewOrderNumber}
          onSubmitted={() => setLoadVersion((version) => version + 1)}
        />
      </> : null}
    </PageShell>
  )
}
