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
  fetchMarketplaceStores,
  fetchProductShare,
  fetchShipToRegions,
  fetchStoreSettings,
  getBuyerCartStorageKey,
  getScopedBuyerStoreId,
  readBuyerPreferences,
  setActiveBuyerStoreId,
  type BuyerReviewsSummary,
  type BuyerShareInfo,
  type BuyerShipToRegion,
  type BuyerStoreSettings,
  type DataSource,
  type MarketplaceStore,
} from "../../lib/buyer-api"
import type { StoreCart, StoreProduct } from "../../lib/mock-data"
import { addProductSelectionToCart } from "./product-cart-action"
import { resolveProductPurchaseState, resolveSelectedProductVariant } from "./product-detail-state"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import { buildProductSignInHref } from "./product-auth"
import { getBuyerCartIdentity } from "../../lib/buyer-cart-storage"
import { resolveProductRegionAvailability, type ProductRegionAvailability } from "./product-sales-region-availability"

type ProductDetailPageProps = { productId: string; cartCount: number; onCartUpdated: (cart: StoreCart) => void }
type Notice = { label: string; message: string }

const fallbackSettings: BuyerStoreSettings = { storeId: "", brandName: "Store", metadata: {} }

export function ProductDetailPage({ productId, cartCount, onCartUpdated }: ProductDetailPageProps) {
  const auth = useBuyerAuth()
  const [settings, setSettings] = useState<BuyerStoreSettings>(fallbackSettings)
  const [product, setProduct] = useState<StoreProduct | null>(null)
  const [reviews, setReviews] = useState<BuyerReviewsSummary | null>(null)
  const [share, setShare] = useState<BuyerShareInfo | null>(null)
  const [shipToRegions, setShipToRegions] = useState<BuyerShipToRegion[]>([])
  const [recommendations, setRecommendations] = useState<StoreProduct[]>([])
  const [productStore, setProductStore] = useState<MarketplaceStore | null>(null)
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
  const storeFromQuery = new URLSearchParams(window.location.search).get("store")
  const productStoreId = useMemo(
    () => getScopedBuyerStoreId(storeFromQuery),
    [storeFromQuery]
  )

  const loadProduct = useCallback(async (isActive: () => boolean) => {
    setLoading(true)
    setFatalError(undefined)
    setAddNotice(undefined)
    if (storeFromQuery) {
      setActiveBuyerStoreId(storeFromQuery)
    }
    const [productResult, reviewsResult, settingsResult, productsResult, shipToRegionsResult] = await Promise.all([
      fetchProductDetail(productId, { storeId: productStoreId }),
      fetchProductReviews(productId),
      fetchStoreSettings({ storeId: productStoreId }),
      fetchProducts({ storeId: productStoreId }),
      fetchShipToRegions(),
    ])
    if (!isActive()) return

    setSettings(settingsResult.data)
    setReviewSource(reviewsResult.source)
    setReviews(reviewsResult.data)
    setShipToRegions(shipToRegionsResult.data)

    if (!productResult.data) {
      setProduct(null)
      setProductStore(null)
      setShare(null)
      setRecommendations([])
      setFatalError(productResult.error ?? "Product not found")
      setNotices([])
      setLoading(false)
      return
    }

    const realProduct = productResult.data
    const storeProfileResult =
      realProduct.storeSlug || !realProduct.storeId
        ? null
        : await fetchMarketplaceStores()
    const shareResult =
      productResult.source === "backend"
        ? await fetchProductShare(realProduct)
        : { data: null as BuyerShareInfo | null, source: productResult.source as DataSource, error: undefined }
    if (!isActive()) return
    const resolvedStoreProfile = storeProfileResult?.data.find((store) => store.storeId === realProduct.storeId) ?? null
    setProduct(realProduct)
    setProductStore(resolvedStoreProfile)
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
      { label: "shipping regions", message: shipToRegionsResult.error },
      { label: "store directory", message: storeProfileResult?.error },
      { label: "share", message: shareResult.error },
    ].filter((notice): notice is Notice => Boolean(notice.message)))
    setLoading(false)
  }, [productId, productStoreId, storeFromQuery])

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
  const buyerPreferences = readBuyerPreferences(auth.customer)
  const buyerCountryCodes = buyerPreferences.countryCodes
  const storeHref = product?.storeSlug
    ? `/shops/${encodeURIComponent(product.storeSlug)}`
    : productStore?.slug
      ? `/shops/${encodeURIComponent(productStore.slug)}`
      : "/"
  const regionAvailability = useMemo<ProductRegionAvailability | undefined>(() => {
    if (!product || !shipToRegions.length) return undefined
    return resolveProductRegionAvailability(product, shipToRegions, buyerCountryCodes)
  }, [buyerCountryCodes, product, shipToRegions])

  const addToCart = async () => {
    if (!product || !selectedVariant?.id || !purchaseState.canAdd || adding) return
    if (regionAvailability?.available === false) {
      setAddNotice({ tone: "error", message: "This item does not ship to your selected region." })
      return
    }
    if (!auth.customer) {
      const returnTo = `${window.location.pathname}${window.location.search}`
      window.location.assign(buildProductSignInHref(returnTo))
      return
    }
    setAdding(true)
    setAddNotice(undefined)
    try {
      const cartStoreId =
        product.storeId ??
        storeFromQuery ??
        settings.storeId
      const cartIdentity = getBuyerCartIdentity(auth.customer.id, window.localStorage)
      setActiveBuyerStoreId(cartStoreId)
      const updated = await addProductSelectionToCart({
        storeId: cartStoreId,
        storeName: product.storeName ?? settings.brandName,
        storeSlug: product.storeSlug,
        cartIdentity,
        variantId: selectedVariant.id,
        quantity,
        storageKey: getBuyerCartStorageKey(cartStoreId, cartIdentity),
        storage: window.localStorage,
        createCart: () =>
          createCart({
            storeId: cartStoreId,
            countryCode: regionAvailability?.countryCode ?? buyerCountryCodes[0],
          }),
        addLineItem: (cartId, variantId, qty) =>
          addCartLineItem(cartId, variantId, qty, { storeId: cartStoreId }),
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
      <nav className="buyer-product-breadcrumb" aria-label="Breadcrumb"><a href={storeHref}>Store</a><span>/</span><span>{product?.title ?? "Product"}</span></nav>
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
            regionAvailability={regionAvailability}
            addNotice={addNotice}
            onAddToCart={() => void addToCart()}
            share={share}
          />
        </section>
        <ProductStoreCard settings={settings} storeHref={storeHref} />
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
