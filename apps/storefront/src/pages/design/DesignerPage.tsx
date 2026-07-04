import { useCallback, useEffect, useRef, useState } from "react"
import { PageShell } from "../../components/layout/PageShell"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import { StoreFooter } from "../../components/layout/StoreFooter"
import {
  fetchProductDesignConfig,
  completeDesignSession,
  addCartLineItem,
  createCart,
  fetchStoreSettings,
  getBuyerCartStorageKey,
  type BuyerStoreSettings,
  type DesignConfig,
  type DesignCompleteResult,
} from "../../lib/buyer-api"
import type { StoreCart } from "../../lib/mock-data"
import { addProductSelectionToCart } from "../product/product-cart-action"

type DesignerPageProps = {
  productId: string
  cartCount: number
  onCartUpdated: (cart: StoreCart) => void
}

type DesignerStatus = "loading" | "config-error" | "unsupported" | "iframe-loading" | "designing" | "saved" | "save-error"

const S2BDIY_ORIGINS = [
  "https://opensdk.s2bdiy.com",
  "https://opensdktest.s2bdiy.com",
]

export function DesignerPage({ productId, cartCount, onCartUpdated }: DesignerPageProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [settings, setSettings] = useState<BuyerStoreSettings>({ storeId: "default_store", brandName: "Store", metadata: {} })
  const [status, setStatus] = useState<DesignerStatus>("loading")
  const [config, setConfig] = useState<DesignConfig | null>(null)
  const [savedResult, setSavedResult] = useState<DesignCompleteResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [adding, setAdding] = useState(false)
  const [addNotice, setAddNotice] = useState<{ tone: "success" | "error"; message: string } | undefined>()

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const [configResult, settingsResult] = await Promise.all([
          fetchProductDesignConfig(productId),
          fetchStoreSettings(),
        ])
        if (!active) return
        setConfig(configResult)
        setSettings(settingsResult.data)
        setStatus("iframe-loading")
      } catch (error) {
        if (!active) return
        const message = error instanceof Error ? error.message : "Failed to load designer"
        if (message.includes("does not support")) {
          setStatus("unsupported")
        } else {
          setErrorMessage(message)
          setStatus("config-error")
        }
      }
    })()
    return () => { active = false }
  }, [productId])

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!S2BDIY_ORIGINS.some((origin) => e.origin === origin)) return
      const data = e.data as Record<string, unknown> | undefined
      if (!data) return
      if (data.type === "s2bdiy:product-saved" && data.product_id) {
        setSavedResult({
          mcProductId: "",
          title: "Custom Design",
          mockupUrl: (typeof data.mockup_url === "string" ? data.mockup_url : null) ?? null,
        })
        setStatus("saved")
      }
      if (data.type === "s2bdiy:product-saved" && data.product_id) {
        void handleDesignComplete(Number(data.product_id))
      }
    }
    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [config])

  const handleDesignComplete = useCallback(async (s2bProductId: number) => {
    if (!config) return
    try {
      const result = await completeDesignSession({
        s2bProductId,
        basicProductId: config.basicProductId,
        quantity: 1,
      })
      setSavedResult(result)
      setStatus("saved")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save design")
      setStatus("save-error")
    }
  }, [config])

  const handleAddToCart = async () => {
    if (!savedResult?.mcProductId || adding) return
    setAdding(true)
    setAddNotice(undefined)
    try {
      const result = await addProductSelectionToCart({
        variantId: savedResult.mcProductId,
        quantity: 1,
        storageKey: getBuyerCartStorageKey(settings.storeId, "guest:anonymous"),
        storage: window.localStorage,
        createCart: () => createCart(),
        addLineItem: addCartLineItem,
      })
      onCartUpdated(result)
      setAddNotice({ tone: "success", message: "Added to cart." })
    } catch (error) {
      setAddNotice({ tone: "error", message: error instanceof Error ? error.message : "Unable to add to cart." })
    } finally {
      setAdding(false)
    }
  }

  const handleRetry = () => {
    setStatus("loading")
    setErrorMessage("")
    setConfig(null)
  }

  const sdkUrl = config ? `${config.sdkBaseUrl}/index.html?token=${encodeURIComponent(config.token)}&basic_product_id=${encodeURIComponent(config.basicProductId)}${config.viewId ? `&view_id=${encodeURIComponent(config.viewId)}` : ""}` : ""

  return (
    <PageShell className="buyer-designer-page" contentClassName="designer-content" header={<StoreTopBar settings={settings} cartCount={cartCount} />} footer={<StoreFooter />}>
      <nav className="buyer-product-breadcrumb" aria-label="Breadcrumb">
        <a href="/store">Store</a><span>/</span>
        <a href={`/products/${productId}`}>Product</a><span>/</span>
        <span>Designer</span>
      </nav>

      {status === "loading" && <div className="designer-status"><p>Loading designer...</p></div>}

      {status === "config-error" && (
        <div className="designer-status">
          <p className="designer-error">{errorMessage || "Unable to load designer"}</p>
          <button className="designer-retry-btn" onClick={handleRetry}>Try again</button>
          <a href={`/products/${productId}`} className="designer-back-link">Back to product</a>
        </div>
      )}

      {status === "unsupported" && (
        <div className="designer-status">
          <p>This product does not support online design.</p>
          <a href={`/products/${productId}`} className="designer-back-link">Back to product</a>
        </div>
      )}

      {(status === "iframe-loading" || status === "designing") && sdkUrl && (
        <div className="designer-iframe-container">
          <iframe
            ref={iframeRef}
            src={sdkUrl}
            className="designer-iframe"
            sandbox="allow-scripts allow-same-origin allow-popups"
            title="Product Designer"
            onLoad={() => setStatus("designing")}
          />
        </div>
      )}

      {status === "saved" && savedResult && (
        <div className="designer-complete-panel">
          <h2>Design Saved</h2>
          {savedResult.mockupUrl && (
            <img src={savedResult.mockupUrl} alt="Design preview" className="designer-preview-image" />
          )}
          <p className="designer-product-title">{savedResult.title}</p>
          {addNotice && (
            <p className={`designer-add-notice ${addNotice.tone}`} role={addNotice.tone === "error" ? "alert" : "status"}>
              {addNotice.message}
              {addNotice.tone === "success" && <a href="/cart"> View cart</a>}
            </p>
          )}
          <div className="designer-actions">
            <button className="designer-add-btn" onClick={() => void handleAddToCart()} disabled={adding}>
              {adding ? "Adding..." : "Add to cart"}
            </button>
            <button className="designer-continue-btn" onClick={() => { setStatus("iframe-loading") }}>
              Continue designing
            </button>
          </div>
          <a href="/cart" className="designer-cart-link">Go to cart</a>
        </div>
      )}

      {status === "save-error" && (
        <div className="designer-status">
          <p className="designer-error">{errorMessage || "Failed to save design"}</p>
          <button className="designer-retry-btn" onClick={() => setStatus("iframe-loading")}>Try again</button>
        </div>
      )}
    </PageShell>
  )
}
