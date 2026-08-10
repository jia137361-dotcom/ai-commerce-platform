import { useEffect, useState } from "react"
import { PageShell } from "../../components/layout/PageShell"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import { StoreFooter } from "../../components/layout/StoreFooter"
import type { StoreCart } from "../../lib/mock-data"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import { getBuyerCartIdentity } from "../../lib/buyer-cart-storage"
import { addProductSelectionToCart } from "../product/product-cart-action"
import { buildProductSignInHref } from "../product/product-auth"
import { useBuyerLocale } from "../../lib/locale"
import { enterLegacyDefaultStoreContext } from "../../lib/buyer-store-context"
import { MoneyText } from "../../components/ui/MoneyText"
import {
  addCartLineItem,
  createCart,
  fetchBuyerMyDesigns,
  getMyOrders,
  getBuyerCartStorageKey,
  setActiveBuyerStoreId,
  type BuyerStoreSettings,
} from "../../lib/buyer-api"
import {
  getBuyerDesignGuestKey,
  listBuyerDesignDrafts,
  removeBuyerDesignDraft,
  upsertBuyerDesignDraft,
} from "../../lib/buyer-my-designs"
import { isReservedCheckoutCartId } from "../../lib/buyer-checkout-reservations"
import { useBuyerPageSettings } from "../../lib/useBuyerPageSettings"
import { buildSettingsStoreHref } from "../../lib/storefront-links"

type MyDesignsPageProps = {
  cartCount: number
  onCartUpdated: (cart: StoreCart | null) => void
}

type UnifiedDesign = {
  key: string
  mcProductId: string
  variantId?: string | null
  title: string
  mockupUrl?: string | null
  price?: number | null
  editorPath: string
  status: string
  source: "local" | "server"
}

export function MyDesignsPage({ cartCount, onCartUpdated }: MyDesignsPageProps) {
  const { t } = useBuyerLocale()
  const auth = useBuyerAuth()
  const { settings } = useBuyerPageSettings()
  const storeHref = buildSettingsStoreHref(settings)
  const [designs, setDesigns] = useState<UnifiedDesign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orderingId, setOrderingId] = useState<string | null>(null)
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  const customerId = auth.customer?.id ?? null

  const load = async () => {
    if (auth.isLoading) return
    setLoading(true)
    enterLegacyDefaultStoreContext()
    // Always send guest_key so signed-in buyers can still claim guest-only drafts
    // from this browser. Backend never returns another customer's designs via guest_key.
    const remote = await fetchBuyerMyDesigns(getBuyerDesignGuestKey())
    for (const item of remote.data) {
      upsertBuyerDesignDraft(
        {
          mcProductId: item.mcProductId,
          variantId: item.variantId ?? null,
          title: item.title,
          mockupUrl: item.mockupUrl,
          price: item.price,
          s2bProductId: item.s2bProductId,
          basicProductId: item.basicProductId,
          blankProductId: item.blankProductId,
          status: "draft",
        },
        customerId
      )
    }
    const mergedLocal = listBuyerDesignDrafts(customerId)
    const byId = new Map<string, UnifiedDesign>()
    for (const item of remote.data) {
      byId.set(item.mcProductId, {
        key: item.mcProductId,
        mcProductId: item.mcProductId,
        variantId: item.variantId,
        title: item.title,
        mockupUrl: item.mockupUrl,
        price: item.price,
        editorPath: item.editorPath,
        status: item.status || "draft",
        source: "server",
      })
    }
    for (const item of mergedLocal) {
      const existing = byId.get(item.mcProductId)
      if (existing) {
        if (!existing.variantId && item.variantId) existing.variantId = item.variantId
        if (!existing.mockupUrl && item.mockupUrl) existing.mockupUrl = item.mockupUrl
        continue
      }
      byId.set(item.mcProductId, {
        key: item.mcProductId,
        mcProductId: item.mcProductId,
        variantId: item.variantId,
        title: item.title,
        mockupUrl: item.mockupUrl,
        price: item.price,
        editorPath: item.blankProductId
          ? `/design/${encodeURIComponent(item.blankProductId)}`
          : `/design/${encodeURIComponent(item.mcProductId)}`,
        status: item.status,
        source: "local",
      })
    }
    const ordered: UnifiedDesign[] = []
    for (const item of mergedLocal) {
      const row = byId.get(item.mcProductId)
      if (row && !ordered.some((entry) => entry.mcProductId === row.mcProductId)) {
        ordered.push(row)
      }
    }
    for (const row of byId.values()) {
      if (!ordered.some((entry) => entry.mcProductId === row.mcProductId)) ordered.push(row)
    }
    setDesigns(ordered)
    setError(remote.error ?? null)
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [auth.isLoading, customerId])

  const brand = settings.brandName?.trim() || "Store"

  const handleOrder = async (design: UnifiedDesign) => {
    if (!design.variantId || orderingId) return
    if (!auth.customer) {
      const returnTo = `${window.location.pathname}${window.location.search}`
      window.location.assign(buildProductSignInHref(returnTo))
      return
    }
    setOrderingId(design.key)
    setError(null)
    try {
      const qty = Math.max(1, Math.min(99, quantities[design.key] ?? 1))
      const cartIdentity = getBuyerCartIdentity(auth.customer.id, window.localStorage)
      setActiveBuyerStoreId(settings.storeId)
      const result = await addProductSelectionToCart({
        storeId: settings.storeId,
        storeName: settings.brandName,
        cartIdentity,
        variantId: design.variantId,
        quantity: qty,
        storageKey: getBuyerCartStorageKey(settings.storeId, cartIdentity),
        storage: window.localStorage,
        createCart: () => createCart({ storeId: settings.storeId }),
        addLineItem: (cartId, variantId, quantity) =>
          addCartLineItem(cartId, variantId, quantity, { storeId: settings.storeId }),
        isCartReservedForCheckout: async (cartId) => {
          const unpaid = await getMyOrders({ bucket: "unpaid", scope: "platform", limit: 100, offset: 0 }).catch(() => null)
          return isReservedCheckoutCartId(unpaid?.orders ?? [], cartId)
        },
      })
      onCartUpdated(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setOrderingId(null)
    }
  }

  return (
    <PageShell
      className="buyer-my-designs-page"
      contentClassName="buyer-my-designs-content"
      header={<StoreTopBar settings={settings as BuyerStoreSettings} cartCount={cartCount} />}
      footer={<StoreFooter />}
      cartCount={cartCount}
      storeHref={storeHref}
    >
      <header className="buyer-my-designs-hero">
        <p className="buyer-studio-landing-kicker">{t("navMyDesigns")}</p>
        <h1>{t("myDesignsTitle")}</h1>
        <p>{t("myDesignsDescription")}</p>
      </header>

      {loading ? <p>{t("myDesignsLoading")}</p> : null}
      {error ? <p className="buyer-ai-studio-error">{error}</p> : null}
      {!loading && !designs.length ? (
        <div className="buyer-my-designs-empty">
          <p>{t("myDesignsEmpty")}</p>
          <a className="buyer-ui-button buyer-ui-button--primary" href="/studio">
            {t("navStudio")}
          </a>
        </div>
      ) : null}

      <div className="buyer-my-designs-grid">
        {designs.map((design) => (
          <article key={design.key} className="buyer-my-designs-card">
            {design.mockupUrl ? (
              <img src={design.mockupUrl} alt="" />
            ) : (
              <div className="buyer-my-designs-thumb-empty" />
            )}
            <div className="buyer-my-designs-body">
              <h2>{design.title}</h2>
              <MoneyText amount={design.price} currencyCode="USD" unavailableLabel="—" />
              <p className="buyer-my-designs-status">{design.status}</p>
              <label className="designer-qty">
                <span>{t("designerQuantity")}</span>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={quantities[design.key] ?? 1}
                  onChange={(event) =>
                    setQuantities((current) => ({
                      ...current,
                      [design.key]: Math.max(1, Math.min(99, Number(event.target.value) || 1)),
                    }))
                  }
                />
              </label>
              <div className="buyer-my-designs-actions">
                <a className="buyer-ui-button buyer-ui-button--ghost" href={design.editorPath}>
                  {t("myDesignsContinue")}
                </a>
                <button
                  type="button"
                  className="buyer-ui-button buyer-ui-button--primary"
                  disabled={!design.variantId || orderingId === design.key}
                  onClick={() => void handleOrder(design)}
                >
                  {orderingId === design.key ? "…" : t("designerOrderNow")}
                </button>
                <button
                  type="button"
                  className="buyer-my-designs-remove"
                  onClick={() => {
                    removeBuyerDesignDraft(design.mcProductId, customerId)
                    setDesigns((current) => current.filter((item) => item.key !== design.key))
                  }}
                >
                  {t("myDesignsRemove")}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  )
}
