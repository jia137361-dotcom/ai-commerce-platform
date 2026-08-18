import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { PageShell } from "../../components/layout/PageShell"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import { StoreFooter } from "../../components/layout/StoreFooter"
import {
  fetchProductDesignConfig,
  completeDesignSession,
  claimLatestDesignSession,
  addCartLineItem,
  createCart,
  fetchStoreSettings,
  getMyOrders,
  getBuyerCartStorageKey,
  getScopedBuyerStoreId,
  setActiveBuyerStoreId,
  type BuyerStoreSettings,
  type DesignConfig,
  type DesignCompleteResult,
} from "../../lib/buyer-api"
import { buildAiDesignHref } from "../../lib/buyer-design-handoff"
import { isReservedCheckoutCartId } from "../../lib/buyer-checkout-reservations"
import {
  getBuyerDesignGuestKey,
  removeBuyerDesignDraft,
  upsertBuyerDesignDraft,
} from "../../lib/buyer-my-designs"
import {
  extractMockupUrlsFromMessage,
  isS2bdiyOrigin,
  parseS2bdiyMessageData,
  resolveSavedProductId,
  shouldAutoPersistDesign,
} from "../../lib/s2bdiy-editor-messages"
import type { StoreCart } from "../../lib/mock-data"
import { addProductSelectionToCart } from "../product/product-cart-action"
import { getBuyerCartIdentity } from "../../lib/buyer-cart-storage"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import { buildProductSignInHref } from "../product/product-auth"
import { navigateBuyer } from "../../lib/buyer-navigate"
import { useBuyerLocale } from "../../lib/locale"

type DesignerPageProps = {
  productId: string
  cartCount: number
  onCartUpdated: (cart: StoreCart) => void
}

type DesignerStatus =
  | "loading"
  | "config-error"
  | "unsupported"
  | "iframe-loading"
  | "designing"
  | "saving"
  | "saved"
  | "save-error"

const ZOOM_STEPS = [0.75, 0.85, 1, 1.15, 1.35, 1.6]

export function DesignerPage({ productId, cartCount, onCartUpdated }: DesignerPageProps) {
  const { t } = useBuyerLocale()
  const auth = useBuyerAuth()
  const customerId = auth.customer?.id ?? null
  const designGuestKey = () => (customerId ? undefined : getBuyerDesignGuestKey())
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const savingRef = useRef(false)
  const completedS2bIdsRef = useRef<Set<number>>(new Set())
  /** S2B designed-product ids that existed before this editor session (claim polling). */
  const baselineS2bIdsRef = useRef<Set<string>>(new Set())
  const baselineReadyRef = useRef(false)
  const [settings, setSettings] = useState<BuyerStoreSettings>({
    storeId: "default_store",
    brandName: "Store",
    metadata: {},
  })
  const [status, setStatus] = useState<DesignerStatus>("loading")
  const [config, setConfig] = useState<DesignConfig | null>(null)
  const [savedResult, setSavedResult] = useState<DesignCompleteResult | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [adding, setAdding] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [addNotice, setAddNotice] = useState<{ tone: "success" | "error"; message: string }>()
  const [fullscreen, setFullscreen] = useState(false)
  const [zoomIndex, setZoomIndex] = useState(2)
  const [lastS2bProductId, setLastS2bProductId] = useState<number | null>(null)
  const [lastMockupUrl, setLastMockupUrl] = useState<string | null>(null)
  const materialId =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("materialId") : null
  const aiDesignHref = buildAiDesignHref({
    productId,
    returnTo: `/design/${encodeURIComponent(productId)}`,
  })
  const zoom = ZOOM_STEPS[zoomIndex] ?? 1
  const configRef = useRef<DesignConfig | null>(null)
  configRef.current = config

  useEffect(() => {
    let active = true
    baselineReadyRef.current = false
    baselineS2bIdsRef.current = new Set()
    completedS2bIdsRef.current = new Set()
    setSavedResult(null)
    ;(async () => {
      try {
        const storeFromQuery = new URLSearchParams(window.location.search).get("store")
        const materialFromQuery = new URLSearchParams(window.location.search).get("materialId")
        const storeId = getScopedBuyerStoreId(storeFromQuery)
        const [configResult, settingsResult] = await Promise.all([
          fetchProductDesignConfig(productId, { materialId: materialFromQuery }),
          fetchStoreSettings({ storeId }),
        ])
        if (!active) return
        setConfig(configResult)
        setSettings(settingsResult.data)

        // Continue editing: restore order panel under the redesign editor.
        if (configResult.savedDesign) {
          const existing = configResult.savedDesign
          const s2bId = Number(existing.s2bProductId)
          if (Number.isFinite(s2bId)) {
            completedS2bIdsRef.current.add(s2bId)
            baselineS2bIdsRef.current.add(String(s2bId))
            setLastS2bProductId(s2bId)
          }
          if (existing.mockupUrl) setLastMockupUrl(existing.mockupUrl)
          setSavedResult(existing)
          upsertBuyerDesignDraft(
            {
              mcProductId: existing.mcProductId,
              variantId: existing.variantId,
              title: existing.title,
              mockupUrl: existing.mockupUrl,
              price: existing.price,
              s2bProductId: existing.s2bProductId,
              basicProductId: existing.basicProductId,
              blankProductId: existing.blankProductId ?? productId,
              status: "draft",
            },
            customerId
          )
          setStatus("saved")
          return
        }

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
    return () => {
      active = false
    }
  }, [productId, materialId, customerId])

  const applySavedResult = useCallback(
    (result: DesignCompleteResult, mockupUrl?: string | null, options?: { quiet?: boolean }) => {
      const s2bId = Number(result.s2bProductId)
      if (Number.isFinite(s2bId)) {
        completedS2bIdsRef.current.add(s2bId)
        baselineS2bIdsRef.current.add(String(s2bId))
        setLastS2bProductId(s2bId)
      }
      upsertBuyerDesignDraft(
        {
          mcProductId: result.mcProductId,
          variantId: result.variantId,
          title: result.title,
          mockupUrl: result.mockupUrl ?? mockupUrl ?? lastMockupUrl,
          price: result.price,
          s2bProductId: result.s2bProductId,
          basicProductId: result.basicProductId,
          blankProductId: result.blankProductId ?? productId,
          status: "draft",
        },
        customerId
      )
      setSavedResult(result)
      setQuantity(1)
      setStatus("saved")
      if (!options?.quiet) {
        setAddNotice({
          tone: "success",
          message: t("designerSavedTitle"),
        })
      }
    },
    [productId, lastMockupUrl, t, customerId]
  )

  const handleDesignComplete = useCallback(
    async (s2bProductId: number, mockupUrl?: string | null, options?: { force?: boolean }) => {
      const activeConfig = configRef.current
      if (!activeConfig) {
        setErrorMessage("Designer is still loading. Save again in a moment.")
        setStatus("save-error")
        return
      }

      // Redesign / already-saved: keep the same My Design row; only refresh preview.
      if (
        !options?.force &&
        (activeConfig.editorMode === "redesign" || completedS2bIdsRef.current.has(s2bProductId)) &&
        savedResult
      ) {
        const next = {
          ...savedResult,
          mockupUrl: mockupUrl ?? savedResult.mockupUrl,
        }
        if (mockupUrl) setLastMockupUrl(mockupUrl)
        applySavedResult(next, mockupUrl, { quiet: true })
        setAddNotice({ tone: "success", message: t("designerAlreadySaved") })
        return
      }

      if (savingRef.current) return
      if (!options?.force && completedS2bIdsRef.current.has(s2bProductId)) {
        return
      }
      savingRef.current = true
      setStatus("saving")
      setAddNotice(undefined)
      setErrorMessage("")
      setLastS2bProductId(s2bProductId)
      if (mockupUrl) setLastMockupUrl(mockupUrl)

      const pendingId = `pending_s2b_${s2bProductId}`
      upsertBuyerDesignDraft(
        {
          id: pendingId,
          mcProductId: pendingId,
          variantId: null,
          title: `Design ${s2bProductId}`,
          mockupUrl: mockupUrl ?? lastMockupUrl,
          s2bProductId: String(s2bProductId),
          basicProductId: String(activeConfig.basicProductId),
          blankProductId: productId,
          status: "pending",
        },
        customerId
      )

      const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))
      let lastError: unknown = null
      try {
        // S2B product detail may lag a moment after in-editor save.
        for (let attempt = 0; attempt < 4; attempt += 1) {
          try {
            const result = await completeDesignSession({
              s2bProductId,
              basicProductId: activeConfig.basicProductId,
              quantity: 1,
              mockupUrl: mockupUrl ?? lastMockupUrl,
              saveAs: "draft",
              blankProductId: productId,
              guestKey: designGuestKey(),
            })
            removeBuyerDesignDraft(pendingId, customerId)
            applySavedResult(result, mockupUrl)
            return
          } catch (error) {
            lastError = error
            if (attempt < 3) await sleep(900 * (attempt + 1))
          }
        }
        throw lastError instanceof Error ? lastError : new Error("Failed to save design")
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to save design")
        setStatus("save-error")
      } finally {
        savingRef.current = false
      }
    },
    [productId, lastMockupUrl, applySavedResult, savedResult, t, customerId]
  )

  const handleClaimLatest = useCallback(
    async (options?: { force?: boolean; silent?: boolean }) => {
      const activeConfig = configRef.current
      if (!activeConfig || savingRef.current) return
      if (!options?.force && (status === "saved" || status === "saving")) return

      // Continue editing uses the same S2B product id — there is no "new" product to claim.
      if (activeConfig.editorMode === "redesign" || savedResult) {
        if (!options?.silent) {
          if (savedResult) {
            applySavedResult(savedResult, savedResult.mockupUrl, { quiet: true })
            setAddNotice({ tone: "success", message: t("designerAlreadySaved") })
          } else {
            setErrorMessage(t("designerAlreadyInMyDesign"))
            setStatus("save-error")
          }
        }
        return
      }

      savingRef.current = true
      if (!options?.silent) {
        setStatus("saving")
        setErrorMessage("")
        setAddNotice(undefined)
      }

      try {
        const exclude = [
          ...baselineS2bIdsRef.current,
          ...[...completedS2bIdsRef.current].map(String),
        ]
        const result = await claimLatestDesignSession({
          basicProductId: activeConfig.basicProductId,
          blankProductId: productId,
          guestKey: designGuestKey(),
          excludeS2bIds: exclude,
          saveAs: "draft",
        })
        for (const id of result.knownS2bIds) baselineS2bIdsRef.current.add(id)
        if (!result.claimed) {
          if (!options?.silent) {
            setErrorMessage(t("designerClaimWaiting"))
            setStatus("save-error")
          }
          return
        }
        applySavedResult(result)
      } catch (error) {
        if (!options?.silent) {
          setErrorMessage(error instanceof Error ? error.message : "Failed to save design")
          setStatus("save-error")
        }
      } finally {
        savingRef.current = false
      }
    },
    [applySavedResult, productId, status, savedResult, t]
  )

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const fromIframe =
        Boolean(iframeRef.current?.contentWindow) && e.source === iframeRef.current?.contentWindow
      if (!isS2bdiyOrigin(e.origin) && !fromIframe) return

      const data = parseS2bdiyMessageData(e.data)
      if (!data || !shouldAutoPersistDesign(data)) return

      const s2bProductId = resolveSavedProductId(data)
      if (!s2bProductId) return
      const mockupUrl = extractMockupUrlsFromMessage(data)[0] ?? null
      // One step: editor save → My Design automatically.
      void handleDesignComplete(s2bProductId, mockupUrl)
    }
    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [handleDesignComplete])

  // Baseline + poll: only for first-time "new" designs. Redesign keeps the same S2B product id.
  useEffect(() => {
    if (!config?.basicProductId) return
    if (config.editorMode === "redesign" || savedResult) return
    if (!["iframe-loading", "designing", "save-error"].includes(status)) return

    let cancelled = false
    const boot = async () => {
      if (baselineReadyRef.current) return
      try {
        const snapshot = await claimLatestDesignSession({
          basicProductId: config.basicProductId,
          snapshotOnly: true,
        })
        if (cancelled) return
        for (const id of snapshot.knownS2bIds) baselineS2bIdsRef.current.add(id)
        baselineReadyRef.current = true
      } catch {
        baselineReadyRef.current = true
      }
    }
    void boot()

    const timer = window.setInterval(() => {
      if (cancelled || savingRef.current || status === "saved") return
      if (!baselineReadyRef.current) return
      void handleClaimLatest({ silent: true })
    }, 2800)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [config?.basicProductId, config?.editorMode, status, handleClaimLatest, savedResult])

  useEffect(() => {
    if (!fullscreen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [fullscreen])

  const handleRetrySave = () => {
    if (lastS2bProductId) {
      void handleDesignComplete(lastS2bProductId, lastMockupUrl, { force: true })
      return
    }
    void handleClaimLatest({ force: true })
  }

  const selectedVariantId = savedResult?.variantId || null

  const lockedSizeLabel = useMemo(() => {
    if (!savedResult) return null
    const fromSizes = savedResult.sizes.find((row) => row.id === savedResult.selectedSizeId)?.name
    if (fromSizes) return fromSizes
    const fromVariant = savedResult.variants.find((row) => row.sizeId === savedResult.selectedSizeId)
    return fromVariant?.sizeName ?? null
  }, [savedResult])

  const lockedColorLabel = useMemo(() => {
    if (!savedResult) return null
    const fromColors = savedResult.colors.find((row) => row.id === savedResult.selectedColorId)?.name
    if (fromColors) return fromColors
    const fromVariant = savedResult.variants.find((row) => row.colorId === savedResult.selectedColorId)
    return fromVariant?.colorName ?? null
  }, [savedResult])

  const handlePlaceOrder = async () => {
    if (!selectedVariantId || adding) return
    if (!auth.customer) {
      const returnTo = `${window.location.pathname}${window.location.search}`
      window.location.assign(buildProductSignInHref(returnTo))
      return
    }
    setAdding(true)
    setAddNotice(undefined)
    try {
      const cartIdentity = getBuyerCartIdentity(auth.customer.id, window.localStorage)
      setActiveBuyerStoreId(settings.storeId)
      const result = await addProductSelectionToCart({
        storeId: settings.storeId,
        storeName: settings.brandName,
        cartIdentity,
        variantId: selectedVariantId,
        quantity: Math.max(1, Math.min(99, quantity)),
        storageKey: getBuyerCartStorageKey(settings.storeId, cartIdentity),
        storage: window.localStorage,
        createCart: () => createCart({ storeId: settings.storeId }),
        addLineItem: (cartId, variantId, qty) =>
          addCartLineItem(cartId, variantId, qty, { storeId: settings.storeId }),
        isCartReservedForCheckout: async (cartId) => {
          const unpaid = await getMyOrders({ bucket: "unpaid", scope: "platform", limit: 100, offset: 0 }).catch(() => null)
          return isReservedCheckoutCartId(unpaid?.orders ?? [], cartId)
        },
      })
      onCartUpdated(result)
      if (savedResult) {
        upsertBuyerDesignDraft(
          {
            mcProductId: savedResult.mcProductId,
            variantId: selectedVariantId,
            title: savedResult.title,
            mockupUrl: savedResult.mockupUrl,
            price: savedResult.price,
            s2bProductId: savedResult.s2bProductId,
            basicProductId: savedResult.basicProductId,
            blankProductId: productId,
            status: "draft",
          },
          customerId
        )
      }
      navigateBuyer(`/checkout?store=${encodeURIComponent(settings.storeId)}`)
    } catch (error) {
      setAddNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Unable to place order.",
      })
    } finally {
      setAdding(false)
    }
  }

  const handleAddToCart = async () => {
    if (!selectedVariantId || adding) return
    if (!auth.customer) {
      const returnTo = `${window.location.pathname}${window.location.search}`
      window.location.assign(buildProductSignInHref(returnTo))
      return
    }
    setAdding(true)
    setAddNotice(undefined)
    try {
      const cartIdentity = getBuyerCartIdentity(auth.customer.id, window.localStorage)
      setActiveBuyerStoreId(settings.storeId)
      const result = await addProductSelectionToCart({
        storeId: settings.storeId,
        storeName: settings.brandName,
        cartIdentity,
        variantId: selectedVariantId,
        quantity: Math.max(1, Math.min(99, quantity)),
        storageKey: getBuyerCartStorageKey(settings.storeId, cartIdentity),
        storage: window.localStorage,
        createCart: () => createCart({ storeId: settings.storeId }),
        addLineItem: (cartId, variantId, qty) =>
          addCartLineItem(cartId, variantId, qty, { storeId: settings.storeId }),
        isCartReservedForCheckout: async (cartId) => {
          const unpaid = await getMyOrders({ bucket: "unpaid", scope: "platform", limit: 100, offset: 0 }).catch(() => null)
          return isReservedCheckoutCartId(unpaid?.orders ?? [], cartId)
        },
      })
      onCartUpdated(result)
      setAddNotice({ tone: "success", message: t("designerAddedToCart") })
    } catch (error) {
      setAddNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Unable to add to cart.",
      })
    } finally {
      setAdding(false)
    }
  }

  const handleRetry = () => {
    setStatus("loading")
    setErrorMessage("")
    setConfig(null)
    setSavedResult(null)
  }

  const sdkUrl = config?.designerUrl ?? ""
  const showStudio =
    Boolean(sdkUrl) &&
    ["iframe-loading", "designing", "saving", "saved", "save-error"].includes(status)
  const editorPath =
    savedResult?.editorPath ||
    (savedResult ? `/design/${encodeURIComponent(savedResult.mcProductId)}` : null)

  return (
    <PageShell
      className={["buyer-designer-page", fullscreen ? "buyer-designer-page--fullscreen" : ""]
        .filter(Boolean)
        .join(" ")}
      contentClassName="designer-content"
      header={fullscreen ? null : <StoreTopBar settings={settings} cartCount={cartCount} />}
      footer={fullscreen ? null : <StoreFooter />}
      cartCount={cartCount}
      showMobileBottomNav={false}
    >
      {!fullscreen ? (
        <>
          <nav className="buyer-product-breadcrumb" aria-label="Breadcrumb">
            <a href="/store">Store</a>
            <span>/</span>
            <a href="/ai-design">AI design</a>
            <span>/</span>
            <span>Editor</span>
          </nav>
          <div className="designer-handoff-bar">
            <a href={aiDesignHref} className="designer-ai-design-link">
              <strong>{t("designerAiCta")}</strong>
              <span>{t("designerAiCtaHint")}</span>
            </a>
            {materialId ? <span className="designer-material-chip">material: {materialId}</span> : null}
          </div>
        </>
      ) : null}

      {status === "loading" && (
        <div className="designer-status">
          <p>Loading Studio…</p>
        </div>
      )}

      {status === "config-error" && (
        <div className="designer-status">
          <p className="designer-error">{errorMessage || "Unable to load designer"}</p>
          <button className="designer-retry-btn" onClick={handleRetry}>
            Try again
          </button>
        </div>
      )}

      {status === "unsupported" && (
        <div className="designer-status">
          <p>This product does not support online design.</p>
        </div>
      )}

      {showStudio ? (
        <div
          className={["designer-workspace", fullscreen ? "designer-workspace--fullscreen" : ""]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="designer-toolbar" role="toolbar" aria-label="Studio controls">
            <div className="designer-toolbar-group">
              <button type="button" onClick={() => setZoomIndex((i) => Math.max(0, i - 1))} disabled={zoomIndex <= 0}>
                −
              </button>
              <span>{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))}
                disabled={zoomIndex >= ZOOM_STEPS.length - 1}
              >
                +
              </button>
              <button type="button" onClick={() => setZoomIndex(2)}>
                {t("designerZoomReset")}
              </button>
            </div>
            <div className="designer-toolbar-group">
              <span className="designer-autosave-hint">{t("designerSaveHint")}</span>
              <button
                type="button"
                onClick={() => void handleClaimLatest({ force: true })}
                disabled={status === "saving" || status === "saved"}
              >
                {t("designerSyncMyDesign")}
              </button>
              <button type="button" onClick={() => setFullscreen((value) => !value)}>
                {fullscreen ? t("designerExitFullscreen") : t("designerFullscreen")}
              </button>
              <a href="/my-designs">{t("navMyDesigns")}</a>
            </div>
          </div>
          <div className="designer-iframe-viewport">
            <div className="designer-iframe-scaler" style={{ transform: `scale(${zoom})` }}>
              <iframe
                ref={iframeRef}
                src={sdkUrl}
                className="designer-iframe"
                title="Product Designer"
                allow="clipboard-read; clipboard-write"
                onLoad={() => {
                  if (status === "iframe-loading") setStatus("designing")
                }}
              />
            </div>
            {status === "saving" ? (
              <div className="designer-saving-overlay" role="status">
                {t("designerSavingDraft")}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {status === "save-error" ? (
        <div className="designer-status designer-status--inline">
          <p className="designer-error">{errorMessage || "Failed to save design"}</p>
          <button className="designer-retry-btn" onClick={handleRetrySave}>
            {t("designerRetrySave")}
          </button>
        </div>
      ) : null}

      {status === "saved" && savedResult && !fullscreen ? (
        <section className="designer-order-panel" aria-label="Order your design">
          <div className="designer-order-panel__media">
            {savedResult.mockupUrl ? (
              <img src={savedResult.mockupUrl} alt="" className="designer-preview-image" />
            ) : (
              <div className="designer-preview-empty" />
            )}
          </div>
          <div className="designer-order-panel__body">
            <p className="designer-order-kicker">{t("designerSavedTitle")}</p>
            <h2 className="designer-product-title">{savedResult.title}</h2>
            <p className="designer-saved-hint">{t("designerSavedHint")}</p>
            {typeof savedResult.price === "number" ? (
              <p className="designer-order-price">${savedResult.price.toFixed(2)}</p>
            ) : null}

            <dl className="designer-locked-attrs">
              {lockedSizeLabel ? (
                <div>
                  <dt>{t("designerSize")}</dt>
                  <dd>{lockedSizeLabel}</dd>
                </div>
              ) : null}
              {lockedColorLabel ? (
                <div>
                  <dt>{t("designerColor")}</dt>
                  <dd>{lockedColorLabel}</dd>
                </div>
              ) : null}
            </dl>

            <label className="designer-qty">
              <span>{t("designerQuantity")}</span>
              <input
                type="number"
                min={1}
                max={99}
                value={quantity}
                onChange={(event) =>
                  setQuantity(Math.max(1, Math.min(99, Number(event.target.value) || 1)))
                }
              />
            </label>

            {addNotice ? (
              <p
                className={`designer-add-notice ${addNotice.tone}`}
                role={addNotice.tone === "error" ? "alert" : "status"}
              >
                {addNotice.message}
                {addNotice.tone === "success" ? <a href="/cart"> View cart</a> : null}
              </p>
            ) : null}

            <div className="designer-actions">
              <button
                className="designer-add-btn"
                onClick={() => void handlePlaceOrder()}
                disabled={adding || !selectedVariantId || auth.isLoading}
              >
                {adding
                  ? "…"
                  : !auth.customer
                    ? t("designerSignInToOrder")
                    : t("designerPlaceOrder")}
              </button>
              <button
                className="designer-continue-btn"
                onClick={() => void handleAddToCart()}
                disabled={adding || !selectedVariantId || auth.isLoading}
              >
                {!auth.customer ? t("designerSignInToCart") : t("designerOrderNow")}
              </button>
            </div>
            <div className="designer-secondary-actions">
              <a href="/my-designs">{t("designerViewMyDesigns")}</a>
              {editorPath ? (
                <button
                  type="button"
                  className="designer-link-btn"
                  onClick={() => navigateBuyer(editorPath)}
                >
                  {t("designerOpenDraft")}
                </button>
              ) : null}
              <button
                type="button"
                className="designer-link-btn"
                onClick={() => {
                  setAddNotice(undefined)
                  setFullscreen(false)
                  iframeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                }}
              >
                {t("designerKeepEditing")}
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </PageShell>
  )
}
