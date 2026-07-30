import { useCallback, useEffect, useMemo, useState } from "react"
import { PageShell } from "../../components/layout/PageShell"
import { ProductCard } from "../../components/products/ProductCard"
import { ProductDetailStatus } from "../../components/product-detail/ProductDetailStatus"
import { ProductDetailsSection } from "../../components/product-detail/ProductDetailsSection"
import { ProductDetailTabs } from "../../components/product-detail/ProductDetailTabs"
import { ProductMediaGallery } from "../../components/product-detail/ProductMediaGallery"
import { ProductPurchasePanel } from "../../components/product-detail/ProductPurchasePanel"
import { ProductReviewSection } from "../../components/product-detail/ProductReviewSection"
import { ProductStoreCard } from "../../components/product-detail/ProductStoreCard"
import { ProductDetailPopups } from "../../components/product-detail/ProductDetailPopups"
import { StickyDesignBar } from "../../components/product-detail/StickyDesignBar"
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
  getScopedBuyerStoreId,
  readBuyerPreferences,
  setActiveBuyerStoreId,
  checkProductFavorite,
  toggleProductFavorite,
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
import { buildStudioEditorHref } from "../../lib/buyer-design-handoff"
import { pushBrowseHistory } from "../../lib/buyer-browse-history"
import { buildProductDetailHref, buildProductStoreHref } from "../../lib/storefront-links"

type ProductDetailPageProps = { productId: string; cartCount: number; onCartUpdated: (cart: StoreCart) => void }
type Notice = { label: string; message: string }

const fallbackSettings: BuyerStoreSettings = { storeId: "default_store", brandName: "Store", metadata: {} }
const CLOTHING_KEYWORDS = [
  "apparel",
  "beach shorts",
  "blouse",
  "cap",
  "clothing",
  "dress",
  "hoodie",
  "jacket",
  "pants",
  "shirt",
  "shorts",
  "skirt",
  "socks",
  "sweater",
  "sweatshirt",
  "t-shirt",
  "tee",
  "underwear",
  "vest",
]
const hasClothingKeyword = (value?: string | null) => {
  const normalized = value?.toLowerCase() ?? ""
  return CLOTHING_KEYWORDS.some((keyword) => normalized.includes(keyword))
}
const APPAREL_SIZES = new Set(["xs", "s", "m", "l", "xl", "xxl", "2xl", "3xl", "4xl", "5xl"])
const shouldShowProductSizeGuide = (product: StoreProduct) => {
  if (product.metadata?.show_size_guide === false) return false
  if (product.metadata?.show_size_guide === true) return true
  const categoryValues = [
    product.category,
    product.metadata?.category_level_1,
    product.metadata?.category_level_2,
    product.metadata?.product_type,
  ].filter((value): value is string => typeof value === "string")
  const hasApparelSize = (product.variants ?? []).some((variant) => APPAREL_SIZES.has((variant.size ?? "").trim().toLowerCase()))
  return hasApparelSize && (hasClothingKeyword(product.title) || categoryValues.some(hasClothingKeyword))
}

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
  const [isFavorited, setIsFavorited] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"item" | "size" | "package" | "review" | "detail" | "recommend">("item")
  const reviewOrderNumber = new URLSearchParams(window.location.search).get("reviewOrder")
  const viewReviewOrderNumber = new URLSearchParams(window.location.search).get("viewReviewOrder")
  const storeFromQuery = new URLSearchParams(window.location.search).get("store")
  const productStoreId = useMemo(() => getScopedBuyerStoreId(storeFromQuery), [storeFromQuery])

  const loadProduct = useCallback(
    async (isActive: () => boolean) => {
      setLoading(true)
      setFatalError(undefined)
      setAddNotice(undefined)
      if (storeFromQuery) {
        setActiveBuyerStoreId(storeFromQuery)
      }
      const [productResult, reviewsResult, settingsResult, productsResult] = await Promise.all([
        fetchProductDetail(productId, { storeId: productStoreId }),
        fetchProductReviews(productId),
        fetchStoreSettings({ storeId: productStoreId }),
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
      pushBrowseHistory({
        id: realProduct.id,
        title: realProduct.title,
        imageUrl: realProduct.mockupImageUrl || realProduct.imageUrl,
        price: realProduct.numericPrice,
        href: buildProductDetailHref(realProduct),
      }, {
        customerId: auth.customer?.id,
        email: auth.customer?.email,
      })

      if (auth.customer) {
        const favResult = await checkProductFavorite(productId)
        if (isActive()) {
          setIsFavorited(favResult.is_favorited)
        }
      }

      setRecommendations(productsResult.data.filter((item) => item.id !== realProduct.id).slice(0, 4))
      setShare(shareResult.data)
      setShareError(shareResult.error)
      setNotices(
        [
          ...(productResult.source !== "backend"
            ? [{ label: "product", message: productResult.error ?? "Showing fallback product data." }]
            : []),
          { label: "reviews", message: reviewsResult.error },
          { label: "store", message: settingsResult.error },
          { label: "recommendations", message: productsResult.error },
          { label: "share", message: shareResult.error },
        ].filter((notice): notice is Notice => Boolean(notice.message))
      )
      setLoading(false)
    },
    [auth.customer, productId, productStoreId, storeFromQuery]
  )

  useEffect(() => {
    let active = true
    void loadProduct(() => active)
    return () => {
      active = false
    }
  }, [loadProduct, loadVersion])

  const variants = product?.variants ?? []
  const selectedVariant = product ? resolveSelectedProductVariant(product, selectedVariantId) : undefined
  const galleryImages = useMemo(() => {
    if (!product) return []
    const selectedImage = selectedVariant?.imageUrl
    return [
      selectedImage,
      ...(product.galleryImageUrls ?? []),
      product.mockupImageUrl,
      product.imageUrl,
      product.designImageUrl,
      ...variants.map((variant) => variant.imageUrl),
    ].filter((url, index, list): url is string => Boolean(url) && list.indexOf(url) === index)
  }, [product, selectedVariant?.imageUrl, variants])
  const purchaseState = product
    ? resolveProductPurchaseState(product, selectedVariant)
    : { canAdd: false, availabilityLabel: "Unavailable", availabilityTone: "neutral" as const }
  const designHref = product?.id ? buildStudioEditorHref(product.id) : undefined
  const showSizeGuide = product ? shouldShowProductSizeGuide(product) : false
  const storeHref = buildProductStoreHref(product, settings)

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
      const cartStoreId = product.storeId ?? storeFromQuery ?? settings.storeId
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
            countryCode: readBuyerPreferences(auth.customer).countryCode,
          }),
        addLineItem: (cartId, variantId, qty) => addCartLineItem(cartId, variantId, qty, { storeId: cartStoreId }),
      })
      onCartUpdated(updated)
      setAddNotice({ tone: "success", message: "Added to cart." })
    } catch (error) {
      setAddNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Unable to add this product to cart.",
      })
    } finally {
      setAdding(false)
    }
  }

  const toggleFavorite = async () => {
    if (!auth.customer) {
      const returnTo = `${window.location.pathname}${window.location.search}`
      window.location.assign(buildProductSignInHref(returnTo))
      return
    }
    setFavoriteLoading(true)
    try {
      const result = await toggleProductFavorite(productId, isFavorited)
      setIsFavorited(result.is_favorited)
    } catch (error) {
      setAddNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Unable to update favorite.",
      })
    } finally {
      setFavoriteLoading(false)
    }
  }

  return (
    <PageShell
      className="buyer-product-page"
      contentClassName="buyer-product-shell-content"
      header={<StoreTopBar settings={settings} cartCount={cartCount} storeHref={storeHref} />}
      footer={<StoreFooter />}
    >
      <nav className="buyer-product-breadcrumb" aria-label="Breadcrumb">
        <a href={storeHref}>Store</a>
        <span>/</span>
        <span>{product?.title ?? "Product"}</span>
      </nav>
      {notices.length ? (
        <aside className="buyer-product-api-notices" role="status">
          {notices.map((notice) => (
            <p key={`${notice.label}-${notice.message}`}>
              {notice.label} fallback: {notice.message}
            </p>
          ))}
        </aside>
      ) : null}

      <ProductDetailStatus loading={loading} error={fatalError} onRetry={() => setLoadVersion((version) => version + 1)} />

      {!loading && product ? (
        <>
          <ProductDetailPopups
            share={share}
            productTitle={product.title}
            storeHref={storeHref}
            isFavorited={isFavorited}
            onToggleFavorite={() => void toggleFavorite()}
          />
          <ProductDetailTabs active={activeTab} onChange={setActiveTab} showSizeGuide={showSizeGuide} />
          <section className="buyer-product-logistics-row">
            <button type="button" onClick={() => document.getElementById(showSizeGuide ? "pdp-size" : "pdp-package")?.scrollIntoView({ behavior: "smooth" })}>
              Shipping: 9–15 days · Production 3–4 days
            </button>
          </section>
          <section className="buyer-product-primary" id="pdp-item">
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
              isFavorited={isFavorited}
              onToggleFavorite={() => void toggleFavorite()}
              favoriteLoading={favoriteLoading}
              designHref={designHref}
            />
          </section>
          {showSizeGuide ? (
          <section id="pdp-size" className="buyer-product-size-guide">
            <h2>Size guide</h2>
            <table>
              <thead>
                <tr>
                  <th>Size</th>
                  <th>Chest (in)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>S</td>
                  <td>34–36</td>
                </tr>
                <tr>
                  <td>M</td>
                  <td>38–40</td>
                </tr>
                <tr>
                  <td>L</td>
                  <td>42–44</td>
                </tr>
                <tr>
                  <td>XL</td>
                  <td>46–48</td>
                </tr>
              </tbody>
            </table>
          </section>
          ) : null}
          <section id="pdp-package" className="buyer-product-package">
            <h2>Package</h2>
            <p>Production time: 3–4 business days. Shipping: 9–15 days.</p>
          </section>
          <ProductStoreCard settings={settings} storeHref={storeHref} />
          <div id="pdp-detail">
            <ProductDetailsSection product={product} />
          </div>

          {recommendations.length ? (
            <section className="buyer-product-recommendations" id="pdp-recommend">
              <header>
                <p>More from this store</p>
                <h2>You may also like</h2>
              </header>
              <div className="buyer-product-recommendation-grid">
                {recommendations.map((item) => (
                  <div key={item.id}>
                    <ProductCard product={item} />
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          <div id="pdp-review">
            <ProductReviewSection
              summary={reviews}
              source={reviewSource}
              error={notices.find((notice) => notice.label === "reviews")?.message}
              review={
                reviewOrderNumber && auth.customer?.email
                  ? {
                      productId: product.id,
                      orderNumber: reviewOrderNumber,
                      email: auth.customer.email,
                      customerName: [auth.customer.firstName, auth.customer.lastName].filter(Boolean).join(" ") || undefined,
                    }
                  : undefined
              }
              viewReviewOrderNumber={viewReviewOrderNumber}
              onSubmitted={() => setLoadVersion((version) => version + 1)}
            />
          </div>
          {designHref ? (
            <StickyDesignBar amount={product.numericPrice} designHref={designHref} disabled={!product.hasDesigner} />
          ) : null}
        </>
      ) : null}
    </PageShell>
  )
}
