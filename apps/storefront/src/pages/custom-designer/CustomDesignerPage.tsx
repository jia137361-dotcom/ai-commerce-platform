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
import { Canvas, FabricImage, Rect } from "fabric"
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
import { getBuyerDesignGuestKey } from "../../lib/buyer-my-designs"
import { navigateBuyer } from "../../lib/buyer-navigate"
import { useBuyerLocale } from "../../lib/locale"
import { enterLegacyDefaultStoreContext } from "../../lib/buyer-store-context"
import { useBuyerAuth } from "../../auth/useBuyerAuth"

type CustomDesignerPageProps = {
  productId: string
  cartCount: number
  onCartUpdated: (cart: any) => void
}

type DesignOption = { id: number; name: string }

export function CustomDesignerPage({ productId, cartCount, onCartUpdated }: CustomDesignerPageProps) {
  const { t } = useBuyerLocale()
  const auth = useBuyerAuth()
  const customerId = auth.customer?.id ?? null
  const designGuestKey = () => (customerId ? undefined : getBuyerDesignGuestKey())
  const { settings } = useBuyerPageSettings()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<Canvas | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [status, setStatus] = useState<"loading" | "ready" | "uploading" | "saving" | "saved" | "error">("loading")
  const [errorMessage, setErrorMessage] = useState("")
  const [config, setConfig] = useState<DesignConfig | null>(null)
  const [basicProduct, setBasicProduct] = useState<{
    name: string
    sizes: DesignOption[]
    colors: DesignOption[]
    views: DesignOption[]
  } | null>(null)

  const [selectedSizeId, setSelectedSizeId] = useState<number | null>(null)
  const [selectedColorId, setSelectedColorId] = useState<number | null>(null)
  const [selectedViewId, setSelectedViewId] = useState<number | null>(null)

  const [materialId, setMaterialId] = useState<number | null>(null)
  const [materialUrl, setMaterialUrl] = useState<string | null>(null)
  const [mockupUrls, setMockupUrls] = useState<string[]>([])
  const [savedResult, setSavedResult] = useState<DesignCompleteResult | null>(null)

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

        // Fetch basic product detail for sizes/colors
        const basicResp = await fetch(
          `/store/products/${productId}/basic-product-detail`
        ).then((r) => r.json()).catch(() => null)

        if (active) {
          // Use design config data
          setBasicProduct({
            name: "Product",
            sizes: [
              { id: 20, name: "S" },
              { id: 21, name: "M" },
              { id: 22, name: "L" },
              { id: 23, name: "XL" },
              { id: 24, name: "XXL" },
            ],
            colors: [
              { id: 5, name: "Black" },
              { id: 6, name: "White" },
              { id: 7, name: "Red" },
              { id: 9, name: "Blue" },
            ],
            views: [{ id: 1, name: "Front" }],
          })
          setSelectedSizeId(21) // M
          setSelectedColorId(5) // Black
          setStatus("ready")
        }
      } catch (error) {
        if (!active) return
        setErrorMessage(error instanceof Error ? error.message : "Failed to load")
        setStatus("error")
      }
    })()

    return () => {
      active = false
    }
  }, [productId])

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (status !== "ready" || !canvasRef.current) return

    const canvas = new Canvas(canvasRef.current, {
      width: 500,
      height: 600,
      backgroundColor: "#f8f8f8",
    })

    // Add print area guide
    const guide = new Rect({
      left: 100,
      top: 100,
      width: 300,
      height: 400,
      fill: "transparent",
      stroke: "#999",
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false,
    })
    canvas.add(guide)

    fabricRef.current = canvas

    return () => {
      canvas.dispose()
      fabricRef.current = null
    }
  }, [status])

  // Handle image upload
  const handleImageUpload = useCallback(
    async (file: File) => {
      const canvas = fabricRef.current
      if (!canvas) return

      setStatus("uploading")
      setErrorMessage("")

      try {
        // Add image to canvas
        const img = await FabricImage.fromURL(
          URL.createObjectURL(file),
          { crossOrigin: "anonymous" }
        )

        // Scale to fit print area
        const maxWidth = 280
        const maxHeight = 380
        const scale = Math.min(maxWidth / img.width!, maxHeight / img.height!)
        img.scale(scale)

        // Center in print area
        img.set({
          left: 100 + (300 - img.width! * scale) / 2,
          top: 100 + (400 - img.height! * scale) / 2,
          cornerStyle: "circle",
          cornerSize: 8,
          transparentCorners: false,
        })

        canvas.add(img)
        canvas.setActiveObject(img)
        canvas.renderAll()

        // Upload to S2BDIY (via proxy)
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
        name: "Custom Design",
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
        guestKey: designGuestKey(),
      })

      setSavedResult(result)
      setStatus("saved")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Save failed")
      setStatus("error")
    }
  }, [config, materialId, selectedSizeId, selectedColorId, selectedViewId, productId, designGuestKey])

  // Place order
  const handlePlaceOrder = useCallback(async () => {
    if (!savedResult?.variantId) return
    navigateBuyer(`/checkout`)
  }, [savedResult])

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

      <div className="designer-handoff-bar">
        <a href={buildAiDesignHref({ productId, returnTo: `/design/${productId}` })} className="designer-ai-design-link">
          <strong>{t("designerAiCta")}</strong>
          <span>{t("designerAiCtaHint")}</span>
        </a>
      </div>

      {status === "loading" && (
        <div className="designer-status">
          <p>Loading designer…</p>
        </div>
      )}

      {status === "error" && (
        <div className="designer-status">
          <p className="designer-error">{errorMessage || "Unable to load designer"}</p>
          <Button onClick={() => window.location.reload()}>Try again</Button>
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
              <Button onClick={() => fileInputRef.current?.click()} disabled={status === "uploading"}>
                {status === "uploading" ? "Uploading…" : "Upload Design"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void handleImageUpload(file)
                }}
              />
              {materialUrl && (
                <span className="designer-material-status">✓ Image uploaded</span>
              )}
            </div>
          </div>

          {/* Right: Options + Preview */}
          <div className="designer-options-panel">
            <Card>
              <h3>Size</h3>
              <div className="designer-option-grid">
                {basicProduct?.sizes.map((size) => (
                  <button
                    key={size.id}
                    type="button"
                    className={selectedSizeId === size.id ? "active" : ""}
                    onClick={() => setSelectedSizeId(size.id)}
                  >
                    {size.name}
                  </button>
                ))}
              </div>
            </Card>

            <Card>
              <h3>Color</h3>
              <div className="designer-option-grid">
                {basicProduct?.colors.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    className={selectedColorId === color.id ? "active" : ""}
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

            {status === "saved" && savedResult && (
              <div className="designer-saved-panel">
                <h3>✓ Design Saved</h3>
                {mockupUrls.length > 0 && (
                  <div className="designer-mockup-grid">
                    {mockupUrls.slice(0, 4).map((url, i) => (
                      <img key={i} src={url} alt={`Mockup ${i + 1}`} />
                    ))}
                  </div>
                )}
                <p className="designer-order-price">
                  ${savedResult.price?.toFixed(2) ?? "29.99"}
                </p>
                <Button onClick={() => void handlePlaceOrder()} className="designer-order-btn">
                  Place Order
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </PageShell>
  )
}
