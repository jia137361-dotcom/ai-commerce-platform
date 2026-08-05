/**
 * Custom Product Designer — own UI, no S2BDIY branding.
 *
 * Uses Fabric.js for canvas editing, calls S2BDIY APIs via backend proxy.
 *
 * Flow:
 *   1. User selects size/color
 *   2. User uploads/adjusts design image on canvas
 *   3. Save → uploadDesignMaterial → quickCreateDesign → fetchS2bProductDetail (mockup)
 *   4. completeDesignSession → mc_product draft
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { Canvas, FabricImage, Rect, Textbox } from "fabric"
import { PageShell } from "../../components/layout/PageShell"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import { StoreFooter } from "../../components/layout/StoreFooter"
import { Button } from "../../components/ui/Button"
import { Card } from "../../components/ui/Card"
import { useBuyerPageSettings } from "../../lib/useBuyerPageSettings"
import {
  fetchProductDesignConfig,
  uploadDesignMaterial,
  quickCreateDesign,
  fetchS2bProductDetail,
  completeDesignSession,
  type DesignConfig,
  type DesignCompleteResult,
} from "../../lib/buyer-api"
import { buildAiDesignHref } from "../../lib/buyer-design-handoff"
import { getBuyerDesignGuestKey, upsertBuyerDesignDraft } from "../../lib/buyer-my-designs"
import { navigateBuyer } from "../../lib/buyer-navigate"
import { useBuyerLocale } from "../../lib/locale"
import { enterLegacyDefaultStoreContext } from "../../lib/buyer-store-context"
import { useBuyerAuth } from "../../auth/useBuyerAuth"

type Props = {
  productId: string
  cartCount: number
  onCartUpdated: (cart: any) => void
}

type DesignOption = { id: number; name: string }
type Status = "loading" | "config-error" | "unsupported" | "ready" | "uploading" | "saving" | "saved" | "error"

export function CustomDesignerPage({ productId, cartCount, onCartUpdated }: Props) {
  const { t } = useBuyerLocale()
  const auth = useBuyerAuth()
  const customerId = auth.customer?.id ?? null
  const designGuestKey = () => (customerId ? undefined : getBuyerDesignGuestKey())
  const { settings } = useBuyerPageSettings()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<Canvas | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [status, setStatus] = useState<Status>("loading")
  const [errorMessage, setErrorMessage] = useState("")
  const [config, setConfig] = useState<DesignConfig | null>(null)
  const [basicProduct, setBasicProduct] = useState<{
    name: string
    enName: string
    sizes: DesignOption[]
    colors: DesignOption[]
    views: DesignOption[]
    purchasePrice: number
  } | null>(null)

  const [selectedSizeId, setSelectedSizeId] = useState<number | null>(null)
  const [selectedColorId, setSelectedColorId] = useState<number | null>(null)
  const [selectedViewId, setSelectedViewId] = useState<number | null>(null)

  const [materialId, setMaterialId] = useState<number | null>(null)
  const [materialUrl, setMaterialUrl] = useState<string | null>(null)
  const [mockupUrls, setMockupUrls] = useState<string[]>([])
  const [savedResult, setSavedResult] = useState<DesignCompleteResult | null>(null)
  const [canvasReady, setCanvasReady] = useState(false)

  const designGuestKeyRef = useRef(designGuestKey())
  useEffect(() => {
    designGuestKeyRef.current = designGuestKey()
  }, [customerId])

  // Load product config + basic product details
  useEffect(() => {
    enterLegacyDefaultStoreContext()
    let active = true

    ;(async () => {
      try {
        const cfg = await fetchProductDesignConfig(productId)
        if (!active) return
        setConfig(cfg)
        if (cfg.viewId != null) setSelectedViewId(Number(cfg.viewId))

        // Fetch basic product detail from S2BDIY via our proxy
        const basicResp = await fetch(`/store/products/${productId}/basic-product-detail`)
        let sizes: DesignOption[] = []
        let colors: DesignOption[] = []
        let views: DesignOption[] = []
        let name = "Product"
        let enName = ""
        let purchasePrice = 0

        if (basicResp.ok) {
          const basic = await basicResp.json()
          name = basic.name ?? basic.en_name ?? "Product"
          enName = basic.en_name ?? ""
          purchasePrice = Number(basic.purchase_price) || 0

          if (Array.isArray(basic.sizes)) {
            sizes = basic.sizes.map((s: any) => ({
              id: Number(s.id),
              name: s.en_name ?? s.name ?? `Size ${s.id}`,
            })).filter((s: DesignOption) => Number.isFinite(s.id))
          }
          if (Array.isArray(basic.colors)) {
            colors = basic.colors.map((c: any) => ({
              id: Number(c.id),
              name: c.en_name ?? c.name ?? `Color ${c.id}`,
            })).filter((c: DesignOption) => Number.isFinite(c.id))
          }
          if (Array.isArray(basic.views)) {
            views = basic.views.map((v: any) => ({
              id: Number(v.id),
              name: v.en_name ?? v.name ?? `View ${v.id}`,
            })).filter((v: DesignOption) => Number.isFinite(v.id))
          }
        }

        // Fallback: if no data from API, use common POD values
        if (!sizes.length) {
          sizes = [
            { id: 20, name: "S" }, { id: 21, name: "M" }, { id: 22, name: "L" },
            { id: 23, name: "XL" }, { id: 24, name: "XXL" },
          ]
        }
        if (!colors.length) {
          colors = [
            { id: 5, name: "Black" }, { id: 6, name: "White" },
            { id: 7, name: "Red" }, { id: 9, name: "Blue" },
          ]
        }
        if (!views.length) {
          views = [{ id: 1, name: "Front" }]
        }

        if (active) {
          setBasicProduct({ name, enName, sizes, colors, views, purchasePrice })
          setSelectedSizeId(sizes[1]?.id ?? sizes[0]?.id ?? null)
          setSelectedColorId(colors[0]?.id ?? null)
          setStatus("ready")
        }
      } catch (error: any) {
        if (!active) return
        if (error?.message?.includes("does not support")) {
          setStatus("unsupported")
        } else {
          setErrorMessage(error instanceof Error ? error.message : "Failed to load designer")
          setStatus("config-error")
        }
      }
    })()

    return () => {
      active = false
    }
  }, [productId])

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (status !== "ready" || !canvasRef.current || canvasReady) return

    const canvas = new Canvas(canvasRef.current, {
      width: 500,
      height: 600,
      backgroundColor: "#f9fafb",
    })

    // Print area guide
    const guide = new Rect({
      left: 100,
      top: 100,
      width: 300,
      height: 400,
      fill: "rgba(59,130,246,0.03)",
      stroke: "#3b82f6",
      strokeDashArray: [6, 4],
      strokeWidth: 1,
      selectable: false,
      evented: false,
      excludeFromExport: true,
    })
    canvas.add(guide)

    // Print area label
    const label = new Textbox("Print Area", {
      left: 100,
      top: 72,
      fontSize: 11,
      fill: "#3b82f6",
      selectable: false,
      evented: false,
      excludeFromExport: true,
      width: 300,
      textAlign: "left",
    })
    canvas.add(label)

    fabricRef.current = canvas
    setCanvasReady(true)

    return () => {
      canvas.dispose()
      fabricRef.current = null
      setCanvasReady(false)
    }
  }, [status, canvasReady])

  // Handle image upload
  const handleImageUpload = useCallback(
    async (file: File) => {
      const canvas = fabricRef.current
      if (!canvas) return

      setStatus("uploading")
      setErrorMessage("")

      try {
        // Load image into canvas
        const img = await FabricImage.fromURL(
          URL.createObjectURL(file),
          { crossOrigin: "anonymous" }
        )

        // Scale to fit print area
        const maxWidth = 280
        const maxHeight = 380
        const scale = Math.min(maxWidth / (img.width ?? 1), maxHeight / (img.height ?? 1), 1)
        img.scale(scale)

        // Center in print area
        img.set({
          left: 100 + (300 - (img.width ?? 0) * scale) / 2,
          top: 100 + (400 - (img.height ?? 0) * scale) / 2,
          cornerStyle: "circle",
          cornerSize: 10,
          transparentCorners: false,
          borderColor: "#3b82f6",
          cornerColor: "#3b82f6",
        })

        canvas.add(img)
        canvas.setActiveObject(img)
        canvas.renderAll()

        // Upload to S2BDIY via proxy
        const reader = new FileReader()
        reader.onload = async () => {
          const base64 = reader.result as string
          try {
            const result = await uploadDesignMaterial(base64)
            setMaterialId(result.material_id)
            setMaterialUrl(result.material_url)
          } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Upload failed")
          } finally {
            setStatus("ready")
          }
        }
        reader.readAsDataURL(file)
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to load image")
        setStatus("ready")
      }
    },
    []
  )

  // Save design
  const handleSave = useCallback(async () => {
    if (!config || !materialId || !selectedSizeId || !selectedColorId) {
      setErrorMessage("Please upload a design and select size/color")
      return
    }

    setStatus("saving")
    setErrorMessage("")

    try {
      // Step 1: Create designed product on S2BDIY
      const quickResult = await quickCreateDesign({
        basicProductId: config.basicProductId,
        sizeId: selectedSizeId,
        colorId: selectedColorId,
        materialId,
        viewId: selectedViewId ?? 1,
        designType: config.designType ?? 1,
        name: basicProduct?.enName || basicProduct?.name || "Custom Design",
      })

      // Step 2: Get mockup URLs
      const productDetail = await fetchS2bProductDetail(quickResult.s2b_product_id)
      setMockupUrls(productDetail.mockup_urls)

      // Step 3: Create mc_product draft via our backend
      const result = await completeDesignSession({
        s2bProductId: quickResult.s2b_product_id,
        basicProductId: config.basicProductId,
        sizeId: selectedSizeId,
        colorId: selectedColorId,
        mockupUrl: productDetail.mockup_urls[0] ?? null,
        saveAs: "draft",
        blankProductId: productId,
        guestKey: designGuestKeyRef.current,
      })

      setSavedResult(result)
      setStatus("saved")

      // Persist to My Designs
      upsertBuyerDesignDraft(
        {
          mcProductId: result.mcProductId,
          variantId: result.variantId,
          title: result.title,
          mockupUrl: productDetail.mockup_urls[0] ?? null,
          price: result.price,
          s2bProductId: String(quickResult.s2b_product_id),
          basicProductId: String(config.basicProductId),
          blankProductId: productId,
          status: "draft",
          sizeId: String(selectedSizeId),
          colorId: String(selectedColorId),
          sizeName: basicProduct?.sizes.find((s) => s.id === selectedSizeId)?.name,
          colorName: basicProduct?.colors.find((c) => c.id === selectedColorId)?.name,
        },
        customerId
      )
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Save failed")
      setStatus("error")
    }
  }, [config, materialId, selectedSizeId, selectedColorId, selectedViewId, productId, basicProduct, customerId])

  // Place order
  const handlePlaceOrder = useCallback(async () => {
    if (!savedResult?.variantId) return
    navigateBuyer(`/checkout`)
  }, [savedResult])

  const handleRetry = () => {
    setStatus("loading")
    setErrorMessage("")
    setConfig(null)
    setBasicProduct(null)
    setSavedResult(null)
    setMaterialId(null)
    setMockupUrls([])
  }

  const selectedSizeName = basicProduct?.sizes.find((s) => s.id === selectedSizeId)?.name ?? ""
  const selectedColorName = basicProduct?.colors.find((c) => c.id === selectedColorId)?.name ?? ""

  return (
    <PageShell
      className="buyer-designer-page"
      header={<StoreTopBar settings={settings} cartCount={cartCount} />}
      footer={<StoreFooter />}
    >
      <nav className="buyer-product-breadcrumb" aria-label="Breadcrumb">
        <a href="/store">Store</a>
        <span>/</span>
        <a href="/studio">{t("navStudio")}</a>
        <span>/</span>
        <span>Custom Designer</span>
      </nav>

      {basicProduct && (
        <div className="designer-product-header">
          <h2>{basicProduct.enName || basicProduct.name}</h2>
          <a href={buildAiDesignHref({ productId, returnTo: `/design/${productId}` })} className="designer-ai-link">
            {t("designerAiCta")} →
          </a>
        </div>
      )}

      {status === "loading" && (
        <div className="designer-status">
          <div className="designer-spinner" />
          <p>Loading designer…</p>
        </div>
      )}

      {status === "config-error" && (
        <div className="designer-status">
          <p className="designer-error">{errorMessage || "Unable to load designer"}</p>
          <Button onClick={handleRetry}>Try again</Button>
        </div>
      )}

      {status === "unsupported" && (
        <div className="designer-status">
          <p>This product does not support online design.</p>
        </div>
      )}

      {(status === "ready" || status === "uploading" || status === "saving" || status === "saved") && (
        <div className="designer-workspace">
          {/* Left: Canvas */}
          <div className="designer-canvas-panel">
            <div className="designer-canvas-wrap">
              <canvas ref={canvasRef} className="designer-canvas" />
            </div>
            <div className="designer-canvas-tools">
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={status === "uploading"}
                variant="secondary"
              >
                {status === "uploading" ? "Uploading…" : "Upload Design"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void handleImageUpload(file)
                  e.target.value = ""
                }}
              />
              {materialId && (
                <span className="designer-material-status">✓ Image ready</span>
              )}
              <span className="designer-hint">PNG, JPG, SVG up to 50MB</span>
            </div>
          </div>

          {/* Right: Options + Actions */}
          <div className="designer-options-panel">
            <Card className="designer-option-card">
              <h3>Size</h3>
              <div className="designer-option-grid">
                {basicProduct?.sizes.map((size) => (
                  <button
                    key={size.id}
                    type="button"
                    className={`designer-option-btn ${selectedSizeId === size.id ? "active" : ""}`}
                    onClick={() => setSelectedSizeId(size.id)}
                  >
                    {size.name}
                  </button>
                ))}
              </div>
            </Card>

            <Card className="designer-option-card">
              <h3>Color</h3>
              <div className="designer-option-grid">
                {basicProduct?.colors.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    className={`designer-option-btn ${selectedColorId === color.id ? "active" : ""}`}
                    onClick={() => setSelectedColorId(color.id)}
                  >
                    {color.name}
                  </button>
                ))}
              </div>
            </Card>

            <Button
              onClick={() => void handleSave()}
              disabled={!materialId || status === "saving"}
              className="designer-save-btn"
            >
              {status === "saving" ? "Saving…" : "Save Design"}
            </Button>

            {errorMessage && ["error", "ready"].includes(status) && (
              <p className="designer-inline-error" role="alert">{errorMessage}</p>
            )}

            {status === "saved" && savedResult && (
              <div className="designer-saved-panel">
                <h3>✓ Design Saved</h3>
                {mockupUrls.length > 0 && (
                  <div className="designer-mockup-grid">
                    {mockupUrls.slice(0, 4).map((url, i) => (
                      <img key={i} src={url} alt={`Preview ${i + 1}`} loading="lazy" />
                    ))}
                  </div>
                )}
                <dl className="designer-summary">
                  {selectedSizeName && <div><dt>Size</dt><dd>{selectedSizeName}</dd></div>}
                  {selectedColorName && <div><dt>Color</dt><dd>{selectedColorName}</dd></div>}
                  {savedResult.price != null && <div><dt>Price</dt><dd>${savedResult.price.toFixed(2)}</dd></div>}
                </dl>
                <Button onClick={() => void handlePlaceOrder()} className="designer-order-btn">
                  Place Order
                </Button>
                <div className="designer-secondary-actions">
                  <a href="/my-designs">View My Designs</a>
                  <button
                    type="button"
                    className="designer-link-btn"
                    onClick={handleRetry}
                  >
                    New Design
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </PageShell>
  )
}
