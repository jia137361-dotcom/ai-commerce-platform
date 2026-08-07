/**
 * Full-featured custom product designer — S2D-equivalent, no branding.
 * Matches S2D SDK editor layout: left canvas, right properties.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Canvas, FabricImage, Rect, Circle, Triangle, Line, Textbox,
  type FabricObject,
} from "fabric"
import { PageShell } from "../../components/layout/PageShell"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import { StoreFooter } from "../../components/layout/StoreFooter"
import { Button } from "../../components/ui/Button"
import { Card } from "../../components/ui/Card"
import { useBuyerPageSettings } from "../../lib/useBuyerPageSettings"
import {
  uploadDesignMaterial, quickCreateDesign, fetchS2bProductDetail,
  completeDesignSession, type DesignCompleteResult,
} from "../../lib/buyer-api"
import { buildAiDesignHref } from "../../lib/buyer-design-handoff"
import { getBuyerDesignGuestKey, upsertBuyerDesignDraft } from "../../lib/buyer-my-designs"
import { navigateBuyer } from "../../lib/buyer-navigate"
import { useBuyerLocale } from "../../lib/locale"
import { enterLegacyDefaultStoreContext } from "../../lib/buyer-store-context"
import { useBuyerAuth } from "../../auth/useBuyerAuth"

type Props = { productId: string; cartCount: number; onCartUpdated: (cart: any) => void }
type Option = { id: number; name: string }
type Status = "loading" | "ready" | "saving" | "saved" | "error"
type ToolType = "select" | "text" | "rect" | "circle" | "triangle" | "line"

interface LayerItem { id: string; name: string; visible: boolean; object: FabricObject }

const FONTS = ["Arial", "Times New Roman", "Courier New", "Georgia", "Verdana", "Impact", "Comic Sans MS", "Trebuchet MS"]
const COLORS = ["#000000","#ffffff","#ef4444","#f97316","#eab308","#22c55e","#3b82f6","#8b5cf6","#ec4899","#6b7280","#14b8a6","#f59e0b"]

export function CustomDesignerPage({ productId, cartCount, onCartUpdated }: Props) {
  const { t } = useBuyerLocale()
  const auth = useBuyerAuth()
  const customerId = auth.customer?.id ?? null
  const { settings } = useBuyerPageSettings()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<Canvas | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const historyRef = useRef<string[]>([])
  const historyIndexRef = useRef(-1)

  const [status, setStatus] = useState<Status>("loading")
  const [errorMessage, setErrorMessage] = useState("")
  const [demoMode, setDemoMode] = useState(false)
  const [canvasReady, setCanvasReady] = useState(false)

  // Product
  const [basicProductId, setBasicProductId] = useState("")
  const [productImages, setProductImages] = useState<Array<{ colorId: number; colorName: string; tone: string; src: string }>>([])
  const [sizes, setSizes] = useState<Option[]>([])
  const [colors, setColors] = useState<Option[]>([])
  const [views, setViews] = useState<Option[]>([])
  const [printArea, setPrintArea] = useState({ x: 80, y: 80, w: 340, h: 420 })
  const [productInfo, setProductInfo] = useState({ name: "", enName: "", desc: "", material: "", technology: "", delivery: "", price: 0 })

  // Selection
  const [selectedSizeId, setSelectedSizeId] = useState<number | null>(null)
  const [selectedColorId, setSelectedColorId] = useState<number | null>(null)
  const [selectedViewId, setSelectedViewId] = useState<number>(1)

  // Tools
  const [activeTool, setActiveTool] = useState<ToolType>("select")
  const [activeColor, setActiveColor] = useState("#000000")
  const [fontSize, setFontSize] = useState(24)
  const [fontFamily, setFontFamily] = useState("Arial")
  const [layers, setLayers] = useState<LayerItem[]>([])
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)

  // Result
  const [materialId, setMaterialId] = useState<number | null>(null)
  const [mockupUrls, setMockupUrls] = useState<string[]>([])
  const [savedResult, setSavedResult] = useState<DesignCompleteResult | null>(null)

  const guestKeyRef = useRef(customerId ? undefined : getBuyerDesignGuestKey())
  useEffect(() => { guestKeyRef.current = customerId ? undefined : getBuyerDesignGuestKey() }, [customerId])

  // ─── Sync layers (defined first for undo/redo) ───
  const syncLayers = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    const objs = canvas.getObjects().filter((o) => !o.excludeFromExport)
    setLayers(objs.reverse().map((o, i) => ({
      id: (o as any).name || `layer_${i}`,
      name: o.type === "textbox" ? `Text: ${(o as Textbox).text?.slice(0, 15) || "Empty"}` :
            o.type === "image" ? `Image ${i + 1}` :
            o.type === "rect" ? `Rectangle ${i + 1}` :
            o.type === "circle" ? `Circle ${i + 1}` :
            o.type === "triangle" ? `Triangle ${i + 1}` :
            o.type === "line" ? `Line ${i + 1}` : `${o.type} ${i + 1}`,
      visible: o.visible !== false,
      object: o,
    })))
  }, [])

  // ─── History ───
  const saveHistory = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    const json = JSON.stringify(canvas.toJSON())
    const hist = historyRef.current.slice(0, historyIndexRef.current + 1)
    hist.push(json)
    if (hist.length > 50) hist.shift()
    historyRef.current = hist
    historyIndexRef.current = hist.length - 1
  }, [])

  const undo = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas || historyIndexRef.current <= 0) return
    historyIndexRef.current--
    canvas.loadFromJSON(historyRef.current[historyIndexRef.current]).then(() => {
      canvas.renderAll()
      syncLayers()
    })
  }, [syncLayers])

  const redo = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas || historyIndexRef.current >= historyRef.current.length - 1) return
    historyIndexRef.current++
    canvas.loadFromJSON(historyRef.current[historyIndexRef.current]).then(() => {
      canvas.renderAll()
      syncLayers()
    })
  }, [syncLayers])

  // ─── Load product ───
  useEffect(() => {
    enterLegacyDefaultStoreContext()
    let active = true
    ;(async () => {
      try {
        const resp = await fetch(`/store/products/${productId}/basic-product-detail`)
        if (resp.ok && active) {
          const data = await resp.json()
          if (data && active) {
            setBasicProductId(String(data.id || ""))
            setProductInfo({
              name: data.name || "", enName: data.en_name || data.name || "",
              desc: data.en_desc || data.desc || "", material: data.en_product_material_text || "",
              technology: data.en_product_technology_text || "", delivery: data.deliver_goods_text || "",
              price: Number(data.purchase_price) || 0,
            })
            setSizes(data.sizes?.length ? data.sizes : [])
            setColors(data.colors?.length ? data.colors : [])
            setViews(data.views?.length ? data.views : [{ id: 1, name: "Front" }])
            setSelectedSizeId(data.sizes?.[1]?.id ?? data.sizes?.[0]?.id ?? null)
            setSelectedColorId(data.colors?.[0]?.id ?? null)
            setSelectedViewId(data.views?.[0]?.id ?? 1)
            const pa = data.print_areas?.[0]
            if (pa) setPrintArea({ x: Number(pa.x ?? 80), y: Number(pa.y ?? 80), w: Number(pa.width ?? 340), h: Number(pa.height ?? 420) })
            // Parse product images
            const imgs: Array<{ colorId: number; colorName: string; tone: string; src: string }> = []
            if (Array.isArray(data.product_show_images)) {
              for (const item of data.product_show_images) {
                if (item && Array.isArray(item.images) && item.images[0]?.src) {
                  imgs.push({
                    colorId: Number(item.color_id),
                    colorName: item.en_name || item.name || `Color ${item.color_id}`,
                    tone: item.tone || "#cccccc",
                    src: item.images[0].src,
                  })
                }
              }
            }
            setProductImages(imgs)
            setDemoMode(false)
            setStatus("ready")
            return
          }
        }
      } catch { /* fall through */ }
      if (!active) return
      setDemoMode(true); setBasicProductId("1672")
      setProductImages([
        { colorId: 5, colorName: "Black", tone: "#000000", src: "https://placehold.co/500x600/333/fff?text=Black+T-Shirt" },
        { colorId: 6, colorName: "White", tone: "#ffffff", src: "https://placehold.co/500x600/eee/333?text=White+T-Shirt" },
      ])
      setSizes([{id:20,name:"S"},{id:21,name:"M"},{id:22,name:"L"},{id:23,name:"XL"}])
      setColors([{id:5,name:"Black"},{id:6,name:"White"},{id:7,name:"Red"},{id:9,name:"Navy"}])
      setViews([{id:1,name:"Front"},{id:2,name:"Back"}])
      setSelectedSizeId(21); setSelectedColorId(5)
      setStatus("ready")
    })()
    return () => { active = false }
  }, [productId])

  // ─── Init canvas ───
  useEffect(() => {
    if (status !== "ready" || !canvasRef.current || canvasReady) return
    const canvas = new Canvas(canvasRef.current, { width: 500, height: 620, backgroundColor: "#f8f8f8" })

    // Product background image
    const bgImg = productImages.find((img) => img.colorId === selectedColorId)?.src ||
                  productImages[0]?.src || ""
    if (bgImg) {
      FabricImage.fromURL(bgImg, { crossOrigin: "anonymous" }).then((img) => {
        if (!fabricRef.current) return
        img.scaleToWidth(500)
        img.set({ left: 0, top: 0, selectable: false, evented: false })
        canvas.backgroundImage = img
        canvas.renderAll()
      }).catch(() => {})
    }

    // Print area guide
    const guide = new Rect({
      left: printArea.x, top: printArea.y, width: printArea.w, height: printArea.h,
      fill: "rgba(255,255,255,0.15)", stroke: "#3b82f6", strokeDashArray: [6, 4],
      strokeWidth: 1.5, selectable: false, evented: false, excludeFromExport: true, name: "guide",
    })
    canvas.add(guide)

    canvas.on("object:added", () => { syncLayers(); saveHistory() })
    canvas.on("object:modified", () => { syncLayers(); saveHistory() })
    canvas.on("object:removed", () => { syncLayers(); saveHistory() })
    canvas.on("selection:created", (e) => {
      if (e.selected?.[0]) {
        setSelectedLayerId((e.selected[0] as any).name || null)
      }
    })
    canvas.on("selection:updated", (e) => {
      if (e.selected?.[0]) {
        setSelectedLayerId((e.selected[0] as any).name || null)
      }
    })

    fabricRef.current = canvas
    setCanvasReady(true)
    saveHistory()

    return () => { canvas.dispose(); fabricRef.current = null; setCanvasReady(false) }
  }, [status, canvasReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update background image when color changes
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas || !canvasReady) return
    const src = productImages.find((img) => img.colorId === selectedColorId)?.src || productImages[0]?.src || ""
    if (!src) return
    FabricImage.fromURL(src, { crossOrigin: "anonymous" }).then((img) => {
      img.scaleToWidth(500)
      img.set({ left: 0, top: 0, selectable: false, evented: false })
      canvas.backgroundImage = img
      canvas.renderAll()
    }).catch(() => {})
  }, [selectedColorId, canvasReady, productImages])

  // ─── Image upload ───
  const handleImageUpload = useCallback(async (file: File) => {
    const canvas = fabricRef.current
    if (!canvas) return
    try {
      const url = URL.createObjectURL(file)
      const img = await FabricImage.fromURL(url, { crossOrigin: "anonymous" })
      const scale = Math.min((printArea.w * 0.85) / (img.width ?? 1), (printArea.h * 0.85) / (img.height ?? 1), 1)
      img.scale(scale)
      img.set({
        name: `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        left: printArea.x + (printArea.w - (img.width ?? 0) * scale) / 2,
        top: printArea.y + (printArea.h - (img.height ?? 0) * scale) / 2,
        cornerStyle: "circle", cornerSize: 10, transparentCorners: false,
        borderColor: "#3b82f6", cornerColor: "#3b82f6",
      })
      canvas.add(img); canvas.setActiveObject(img); canvas.renderAll()

      if (demoMode) { setMaterialId(Math.floor(Math.random() * 90000) + 10000); return }
      const reader = new FileReader()
      reader.onload = async () => {
        try { const res = await uploadDesignMaterial(reader.result as string); setMaterialId(res.material_id) }
        catch (e) { setErrorMessage(e instanceof Error ? e.message : "Upload failed") }
      }
      reader.readAsDataURL(file)
    } catch (e) { setErrorMessage(e instanceof Error ? e.message : "Failed") }
  }, [printArea, demoMode, uploadDesignMaterial])

  // ─── Tools ───
  const addText = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    const text = new Textbox("Your text here", {
      name: `text_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, left: printArea.x + 30, top: printArea.y + 30,
      width: printArea.w - 60, fontSize, fontFamily, fill: activeColor,
      cornerStyle: "circle" as const, cornerSize: 8, transparentCorners: false,
      borderColor: "#3b82f6", cornerColor: "#3b82f6", editable: true,
    })
    canvas.add(text); canvas.setActiveObject(text); canvas.renderAll()
  }, [printArea, fontSize, fontFamily, activeColor])

  const addShape = useCallback((type: ToolType) => {
    const canvas = fabricRef.current
    if (!canvas) return
    let obj: FabricObject
    const o = {
      name: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, left: printArea.x + 60, top: printArea.y + 60,
      fill: type === "line" ? "transparent" : activeColor, stroke: activeColor,
      strokeWidth: type === "line" ? 3 : 2, cornerStyle: "circle" as const,
      cornerSize: 8, transparentCorners: false, borderColor: "#3b82f6", cornerColor: "#3b82f6",
    }
    switch (type) {
      case "rect": obj = new Rect({ ...o, width: 120, height: 80 }); break
      case "circle": obj = new Circle({ ...o, radius: 50 }); break
      case "triangle": obj = new Triangle({ ...o, width: 100, height: 100 }); break
      case "line": obj = new Line([0, 0, 120, 0], { ...o }); break
      default: return
    }
    canvas.add(obj); canvas.setActiveObject(obj); canvas.renderAll()
  }, [printArea, activeColor])

  const toggleLayer = useCallback((layerId: string) => {
    const layer = layers.find((l) => l.id === layerId)
    if (layer) { layer.object.visible = !layer.object.visible; fabricRef.current?.renderAll(); setLayers([...layers]) }
  }, [layers])

  const deleteLayer = useCallback((layerId: string) => {
    const layer = layers.find((l) => l.id === layerId)
    if (layer && fabricRef.current) { fabricRef.current.remove(layer.object); fabricRef.current.renderAll() }
  }, [layers])

  const handleZoom = useCallback((delta: number) => {
    const canvas = fabricRef.current
    if (!canvas) return
    const z = Math.max(0.3, Math.min(3, zoom + delta))
    canvas.setZoom(z); canvas.renderAll(); setZoom(z)
  }, [zoom])

  // ─── Save ───
  const handleSave = useCallback(async () => {
    if (!selectedSizeId || !selectedColorId) { setErrorMessage("Select size and color"); return }
    if (!materialId && !demoMode) { setErrorMessage("Upload a design first"); return }
    setStatus("saving"); setErrorMessage("")
    if (demoMode) {
      await new Promise((r) => setTimeout(r, 1200))
      setMockupUrls(productImages.filter((img) => img.colorId === selectedColorId).map((img) => img.src).slice(0, 2)
        .length > 0 ? productImages.filter((img) => img.colorId === selectedColorId).map((img) => img.src).slice(0, 2)
        : ["https://placehold.co/400x400/3b82f6/fff?text=Front+Mockup"])
      setSavedResult({
        mcProductId: `demo_${Date.now()}`, variantId: `var_${selectedSizeId}_${selectedColorId}`,
        title: "Custom Design", mockupUrl: null, price: 29.99,
        s2bProductId: null, basicProductId: null, blankProductId: productId,
        status: "draft", saveAs: "draft", editorPath: `/design/${productId}`,
        sizes, colors, variants: [], selectedSizeId, selectedColorId,
      }); setStatus("saved"); return
    }
    try {
      if (!basicProductId || !materialId) throw new Error("Missing data")
      const quick = await quickCreateDesign({
        basicProductId, sizeId: selectedSizeId, colorId: selectedColorId,
        materialId, viewId: selectedViewId, designType: 1, name: "Custom Design",
      })
      const detail = await fetchS2bProductDetail(quick.s2b_product_id)
      setMockupUrls(detail.mockup_urls)
      const result = await completeDesignSession({
        s2bProductId: quick.s2b_product_id, basicProductId,
        sizeId: selectedSizeId, colorId: selectedColorId,
        mockupUrl: detail.mockup_urls[0] ?? null, saveAs: "draft",
        blankProductId: productId, guestKey: guestKeyRef.current,
      })
      setSavedResult(result); setStatus("saved")
      upsertBuyerDesignDraft({
        mcProductId: result.mcProductId, variantId: result.variantId,
        title: result.title, mockupUrl: detail.mockup_urls[0] ?? null,
        price: result.price, s2bProductId: String(quick.s2b_product_id),
        basicProductId, blankProductId: productId, status: "draft",
        sizeId: String(selectedSizeId), colorId: String(selectedColorId),
        sizeName: sizes.find((s) => s.id === selectedSizeId)?.name,
        colorName: colors.find((c) => c.id === selectedColorId)?.name,
      }, customerId)
    } catch (e) { setErrorMessage(e instanceof Error ? e.message : "Save failed"); setStatus("error") }
  }, [basicProductId, materialId, selectedSizeId, selectedColorId, selectedViewId, productId, sizes, colors, customerId, demoMode, productImages])

  const handleOrder = useCallback(() => { if (savedResult?.variantId) navigateBuyer("/checkout") }, [savedResult])
  const handleReset = () => { setStatus("loading"); setErrorMessage(""); setSavedResult(null); setMaterialId(null); setMockupUrls([]); setDemoMode(false) }

  const sizeName = sizes.find((s) => s.id === selectedSizeId)?.name ?? ""
  const colorName = colors.find((c) => c.id === selectedColorId)?.name ?? ""

  return (
    <PageShell className="buyer-designer-page"
      header={<StoreTopBar settings={settings} cartCount={cartCount} />}
      footer={<StoreFooter />}
    >
      <nav className="buyer-product-breadcrumb" aria-label="Breadcrumb">
        <a href="/store">Store</a><span>/</span>
        <a href="/studio">{t("navStudio")}</a><span>/</span><span>Custom Designer</span>
      </nav>

      <div className="designer-product-header">
        <div>
          <h2>{productInfo.enName || "Design Your Product"}</h2>
          <p className="designer-product-desc">{productInfo.material && `Material: ${productInfo.material}`}{productInfo.technology && ` | Print: ${productInfo.technology}`}{productInfo.delivery && ` | Delivery: ${productInfo.delivery}`}</p>
        </div>
        <div className="designer-header-actions">
          {demoMode && <span className="designer-demo-badge">Demo</span>}
          <a href={buildAiDesignHref({ productId, returnTo: `/design/${productId}` })} className="designer-ai-link">AI Design →</a>
        </div>
      </div>

      {status === "loading" && (
        <div className="designer-status"><div className="designer-spinner" /><p>Loading designer…</p></div>
      )}

      {(status === "ready" || status === "saving" || status === "saved") && (
        <div className="designer-workspace">
          {/* Left: Canvas + Toolbar */}
          <div className="designer-main-panel">
            {/* Toolbar */}
            <div className="designer-toolbar">
              <button type="button" className={activeTool === "select" ? "active" : ""} onClick={() => setActiveTool("select")} title="Select">↖</button>
              <button type="button" className={activeTool === "text" ? "active" : ""} onClick={() => { setActiveTool("text"); addText() }} title="Add Text">T</button>
              <button type="button" onClick={() => { setActiveTool("rect"); addShape("rect") }} title="Rectangle">▭</button>
              <button type="button" onClick={() => { setActiveTool("circle"); addShape("circle") }} title="Circle">○</button>
              <button type="button" onClick={() => { setActiveTool("triangle"); addShape("triangle") }} title="Triangle">△</button>
              <button type="button" onClick={() => { setActiveTool("line"); addShape("line") }} title="Line">／</button>
              <span className="designer-divider" />
              <button type="button" onClick={undo} title="Undo">↶</button>
              <button type="button" onClick={redo} title="Redo">↷</button>
              <span className="designer-divider" />
              <button type="button" onClick={() => handleZoom(0.15)} title="Zoom in">+</button>
              <span className="designer-zoom">{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={() => handleZoom(-0.15)} title="Zoom out">−</button>
              <div style={{ flex: 1 }} />
              <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="designer-upload-btn">
                Upload Design
              </Button>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleImageUpload(f); e.target.value = "" }}
              />
            </div>

            {/* Canvas */}
            <div className="designer-canvas-wrap">
              <canvas ref={canvasRef} className="designer-canvas" />
            </div>

            {/* Properties */}
            <div className="designer-properties">
              <div className="designer-prop">
                <label>Color</label>
                <div className="designer-colors">
                  {COLORS.map((c) => (
                    <button key={c} type="button"
                      className={`designer-swatch ${activeColor === c ? "active" : ""}`}
                      style={{ background: c, border: c === "#ffffff" ? "1px solid #d1d5db" : "none" }}
                      onClick={() => setActiveColor(c)} />
                  ))}
                  <input type="color" value={activeColor} onChange={(e) => setActiveColor(e.target.value)} className="designer-color-input" />
                </div>
              </div>
              <div className="designer-prop">
                <label>Font</label>
                <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="designer-select">
                  {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="designer-prop">
                <label>Size: {fontSize}px</label>
                <input type="range" min="10" max="80" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="designer-range" />
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="designer-side-panel">
            {/* Layers */}
            <Card className="designer-card">
              <h3>Layers</h3>
              <div className="designer-layers">
                {layers.length === 0 && <p className="designer-empty">No layers. Add text, shapes, or upload an image.</p>}
                {layers.map((layer) => (
                  <div key={layer.id} className={`designer-layer ${selectedLayerId === layer.id ? "active" : ""}`}>
                    <button type="button" className="designer-layer-vis" onClick={() => toggleLayer(layer.id)}>
                      {layer.visible ? "👁" : "—"}
                    </button>
                    <span className="designer-layer-name" onClick={() => {
                      setSelectedLayerId(layer.id)
                      fabricRef.current?.setActiveObject(layer.object); fabricRef.current?.renderAll()
                    }}>{layer.name}</span>
                    <button type="button" className="designer-layer-del" onClick={() => deleteLayer(layer.id)}>✕</button>
                  </div>
                ))}
              </div>
            </Card>

            {/* Size */}
            <Card className="designer-card">
              <h3>Size</h3>
              <div className="designer-grid">
                {sizes.map((s) => (
                  <button key={s.id} type="button"
                    className={`designer-btn ${selectedSizeId === s.id ? "active" : ""}`}
                    onClick={() => setSelectedSizeId(s.id)}>{s.name}</button>
                ))}
              </div>
            </Card>

            {/* Color */}
            <Card className="designer-card">
              <h3>Color</h3>
              <div className="designer-color-options">
                {colors.map((c) => {
                  const tone = productImages.find((img) => img.colorId === c.id)?.tone || "#ccc"
                  return (
                    <button key={c.id} type="button"
                      className={`designer-color-opt ${selectedColorId === c.id ? "active" : ""}`}
                      onClick={() => setSelectedColorId(c.id)} title={c.name}>
                      <span className="designer-color-circle" style={{ background: tone }} />
                      <span>{c.name}</span>
                    </button>
                  )
                })}
              </div>
            </Card>

            {/* View */}
            {views.length > 1 && (
              <Card className="designer-card">
                <h3>View</h3>
                <div className="designer-grid">
                  {views.map((v) => (
                    <button key={v.id} type="button"
                      className={`designer-btn ${selectedViewId === v.id ? "active" : ""}`}
                      onClick={() => setSelectedViewId(v.id)}>{v.name}</button>
                  ))}
                </div>
              </Card>
            )}

            <Button onClick={() => void handleSave()} disabled={!materialId || status === "saving"} className="designer-save">
              {status === "saving" ? "Saving…" : "Save Design"}
            </Button>

            {errorMessage && ["error", "ready"].includes(status) && (
              <p className="designer-error" role="alert">{errorMessage}</p>
            )}

            {status === "saved" && savedResult && (
              <div className="designer-saved">
                <h3>✓ Design Saved</h3>
                {mockupUrls.length > 0 && (
                  <div className="designer-mockups">
                    {mockupUrls.slice(0, 4).map((url, i) => (
                      <img key={i} src={url} alt={`Preview ${i + 1}`} loading="lazy" />
                    ))}
                  </div>
                )}
                <dl className="designer-summary">
                  {sizeName && <div><dt>Size</dt><dd>{sizeName}</dd></div>}
                  {colorName && <div><dt>Color</dt><dd>{colorName}</dd></div>}
                  {savedResult.price != null && <div><dt>Price</dt><dd>${savedResult.price.toFixed(2)}</dd></div>}
                </dl>
                <Button onClick={() => void handleOrder()} className="designer-order">Place Order</Button>
                <div className="designer-links">
                  <a href="/my-designs">My Designs</a>
                  <button type="button" className="designer-link-btn" onClick={handleReset}>New Design</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </PageShell>
  )
}