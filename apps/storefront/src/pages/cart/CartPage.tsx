import { useCallback, useEffect, useMemo, useState } from "react"
import { CartDeleteConfirm } from "../../components/cart/CartDeleteConfirm"
import { CartItemCard } from "../../components/cart/CartItemCard"
import { CartPageStatus } from "../../components/cart/CartPageStatus"
import { CartSummaryCard } from "../../components/cart/CartSummaryCard"
import { PageShell } from "../../components/layout/PageShell"
import { StoreFooter } from "../../components/layout/StoreFooter"
import { ProductCard } from "../../components/products/ProductCard"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import { Button } from "../../components/ui/Button"
import { Card } from "../../components/ui/Card"
import { normalizeBuyerCartItem } from "../../lib/buyer-cart"
import {
  addCartLineItem,
  createCart,
  deleteCartLineItem,
  fetchMarketplaceProducts,
  getBuyerCartStorageKey,
  preparePlatformCheckout,
  readBuyerPreferences,
  listStoreRegions,
  resolveStoreRegion,
  setActiveBuyerStoreId,
  updateCartLineItem,
} from "../../lib/buyer-api"
import {
  composePlatformLineKey,
  fetchPlatformCart,
  parsePlatformLineKey,
  registerStoreCart,
  unregisterStoreCart,
  type PlatformCartGroup,
} from "../../lib/buyer-platform-cart"
import type { StoreCart, StoreProduct } from "../../lib/mock-data"
import { writePlatformCheckoutSession } from "../../lib/platform-checkout-session"
import { removeCartItem, updateCartItemQuantity } from "./cart-actions"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import { getBuyerCartIdentity } from "../../lib/buyer-cart-storage"
import { getMyOrders } from "../../lib/buyer-api"
import { buildSettingsStoreHref } from "../../lib/storefront-links"
import { useBuyerPageSettings } from "../../lib/useBuyerPageSettings"
import { collectReservedCheckoutCartIds } from "./cart-reservations"

type CartPageProps = { onCartUpdated: (cart: StoreCart | null) => void }

const splitCheckoutKey = (storeId: string) => `citigoo:${storeId}:split_checkout`

const rememberSplitCheckout = (
  storeId: string,
  state: { sourceCartId: string; checkoutCartId: string; selectedLineIds: string[] }
) => {
  const serialized = JSON.stringify(state)
  window.localStorage.setItem(splitCheckoutKey(storeId), serialized)
  window.sessionStorage.setItem(splitCheckoutKey(storeId), serialized)
}

export function CartPage({ onCartUpdated }: CartPageProps) {
  const auth = useBuyerAuth()
  const { settings } = useBuyerPageSettings()
  const storeHref = buildSettingsStoreHref(settings)
  const cartIdentity = getBuyerCartIdentity(auth.customer?.id, window.localStorage)
  const [groups, setGroups] = useState<PlatformCartGroup[]>([])
  const [recommendations, setRecommendations] = useState<StoreProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | undefined>()
  const [lineErrors, setLineErrors] = useState<Record<string, string>>({})
  const [updatingLineKey, setUpdatingLineKey] = useState<string | undefined>()
  const [deleteTargetKey, setDeleteTargetKey] = useState<string | undefined>()
  const [deleteError, setDeleteError] = useState<string | undefined>()
  const [deleting, setDeleting] = useState(false)
  const [loadVersion, setLoadVersion] = useState(0)
  const [selectedLineKeys, setSelectedLineKeys] = useState<Set<string>>(new Set())
  const [preparingCheckoutStoreId, setPreparingCheckoutStoreId] = useState<string | undefined>()
  const [preparingPlatformCheckout, setPreparingPlatformCheckout] = useState(false)

  const loadCart = useCallback(async (isActive: () => boolean) => {
    setLoading(true)
    setLoadError(undefined)
    try {
      let platformCart = await fetchPlatformCart(window.localStorage, cartIdentity)
      const unpaidOrders = auth.customer
        ? await getMyOrders({ bucket: "unpaid", scope: "platform", limit: 100, offset: 0 }).catch(() => null)
        : null
      if (!isActive()) return
      const reservedCartIds = collectReservedCheckoutCartIds(unpaidOrders?.orders ?? [])
      for (const group of platformCart.groups) {
        if (reservedCartIds.has(group.cart.id)) {
          unregisterStoreCart(window.localStorage, cartIdentity, group.storeId)
        }
      }
      const targetRegion = resolveStoreRegion(
        await listStoreRegions(),
        readBuyerPreferences(auth.customer).countryCode
      )
      if (targetRegion) {
        const migratedGroups = await Promise.all(platformCart.groups.map(async (group) => {
          if (reservedCartIds.has(group.cart.id) || group.cart.currencyCode.toLowerCase() === targetRegion.currency_code.toLowerCase()) {
            return group
          }
          let replacement = await createCart({
            storeId: group.storeId,
            regionId: targetRegion.region_id,
          })
          for (const item of group.cart.items) {
            if (!item.variantId) throw new Error("A cart item cannot be repriced because its variant is unavailable.")
            replacement = await addCartLineItem(replacement.id, item.variantId, item.quantity, { storeId: group.storeId })
          }
          registerStoreCart(window.localStorage, cartIdentity, group.storeId, replacement.id, {
            storeName: group.storeName,
            storeSlug: group.storeSlug,
          })
          return { ...group, cart: replacement }
        }))
        platformCart = { ...platformCart, groups: migratedGroups }
      }
      const visibleGroups = platformCart.groups.filter((group) => !reservedCartIds.has(group.cart.id))
      setGroups(visibleGroups)
      const allLineKeys = visibleGroups.flatMap((group) =>
        group.cart.items.map((item) => composePlatformLineKey(group.storeId, item.id))
      )
      setSelectedLineKeys(new Set(allLineKeys))
      const aggregate = visibleGroups[0]?.cart ?? null
      onCartUpdated(
        aggregate
          ? {
              ...aggregate,
              items: visibleGroups.flatMap((group) => group.cart.items),
              subtotal: visibleGroups.reduce(
                (sum, group) => sum + (group.cart.hasSubtotal === false ? 0 : group.cart.subtotal),
                0
              ),
              total: visibleGroups.reduce(
                (sum, group) => sum + (group.cart.hasTotal === false ? 0 : group.cart.total),
                0
              ),
            }
          : null
      )
    } catch (error) {
      if (isActive()) {
        setLoadError(error instanceof Error ? error.message : "Unable to load cart.")
        setGroups([])
        onCartUpdated(null)
      }
    } finally {
      if (isActive()) setLoading(false)
    }
  }, [auth.customer, cartIdentity, onCartUpdated])

  useEffect(() => {
    let active = true
    void loadCart(() => active)
    void fetchMarketplaceProducts().then((result) => {
      if (active && result.source === "backend") setRecommendations(result.data.slice(0, 4))
    })
    return () => {
      active = false
    }
  }, [loadCart, loadVersion])

  useEffect(() => {
    const reloadForCountry = () => setLoadVersion((version) => version + 1)
    window.addEventListener("citigoo:buyer-country-changed", reloadForCountry)
    return () => window.removeEventListener("citigoo:buyer-country-changed", reloadForCountry)
  }, [])

  const itemCount = groups.reduce(
    (sum, group) => sum + group.cart.items.reduce((inner, item) => inner + item.quantity, 0),
    0
  )

  const deleteTarget = useMemo(() => {
    if (!deleteTargetKey) return null
    const parsed = parsePlatformLineKey(deleteTargetKey)
    if (!parsed) return null
    const group = groups.find((entry) => entry.storeId === parsed.storeId)
    const item = group?.cart.items.find((entry) => entry.id === parsed.lineId)
    if (!group || !item) return null
    return {
      key: deleteTargetKey,
      group,
      item: normalizeBuyerCartItem({ ...item, storeId: group.storeId }),
    }
  }, [deleteTargetKey, groups])

  const storeScopedDependencies = (storeId: string) => ({
    updateLineItem: (cartId: string, lineId: string, quantity: number) =>
      updateCartLineItem(cartId, lineId, quantity, { storeId }),
    deleteLineItem: (cartId: string, lineId: string) =>
      deleteCartLineItem(cartId, lineId, { storeId }),
  })

  const checkoutAllStores = async () => {
    if (preparingPlatformCheckout || preparingCheckoutStoreId || groups.length < 2) return
    const eligibleGroups = groups
      .map((group) => {
        const selectedItems = group.cart.items.filter((item) =>
          selectedLineKeys.has(composePlatformLineKey(group.storeId, item.id))
        )
        return selectedItems.length ? { group, selectedItems } : null
      })
      .filter(Boolean) as Array<{ group: PlatformCartGroup; selectedItems: PlatformCartGroup["cart"]["items"] }>
    if (eligibleGroups.length < 2) {
      setLoadError("Select items from at least two stores to use merged checkout.")
      return
    }
    setPreparingPlatformCheckout(true)
    setLoadError(undefined)
    try {
      const preparedGroups: Array<{ store_id: string; cart_id: string; store_name: string }> = []
      for (const entry of eligibleGroups) {
        let checkoutCartId = entry.group.cart.id
        if (entry.selectedItems.length !== entry.group.cart.items.length) {
          const checkoutCart = await createCart({
            storeId: entry.group.storeId,
            countryCode: readBuyerPreferences(auth.customer).countryCode,
          })
          let nextCart = checkoutCart
          let sourceCart = entry.group.cart
          for (const item of entry.selectedItems) {
            if (!item.variantId) throw new Error("A selected item has no purchasable variant.")
            nextCart = await addCartLineItem(nextCart.id, item.variantId, item.quantity, {
              storeId: entry.group.storeId,
            })
          }
          checkoutCartId = nextCart.id
          for (const item of entry.selectedItems) {
            sourceCart = await deleteCartLineItem(entry.group.cart.id, item.id, { storeId: entry.group.storeId })
          }
          rememberSplitCheckout(entry.group.storeId, {
            sourceCartId: entry.group.cart.id,
            checkoutCartId,
            selectedLineIds: [],
          })
          registerStoreCart(window.localStorage, cartIdentity, entry.group.storeId, sourceCart.id)
        }
        preparedGroups.push({
          store_id: entry.group.storeId,
          cart_id: checkoutCartId,
          store_name: entry.group.storeName,
        })
      }
      const prepared = await preparePlatformCheckout(
        preparedGroups.map((group) => ({ store_id: group.store_id, cart_id: group.cart_id }))
      )
      writePlatformCheckoutSession({
        platform_checkout_id: prepared.platform_checkout_id,
        completed_order_ids: [],
        completed_store_ids: [],
        grand_subtotal: prepared.grand_subtotal,
        grand_total: prepared.grand_total,
        currency_code: prepared.currency_code,
        groups: prepared.groups.map((group) => ({
          store_id: group.store_id,
          cart_id: group.cart_id,
          store_name: group.store_name,
          platform_checkout_index: group.platform_checkout_index,
          platform_checkout_count: group.platform_checkout_count,
          subtotal: group.subtotal,
          total: group.total,
          currency_code: group.currency_code,
        })),
      })
      for (const group of prepared.groups) {
        setActiveBuyerStoreId(group.store_id)
        const splitRaw =
          window.localStorage.getItem(splitCheckoutKey(group.store_id)) ??
          window.sessionStorage.getItem(splitCheckoutKey(group.store_id))
        if (!splitRaw) {
          window.localStorage.setItem(getBuyerCartStorageKey(group.store_id, cartIdentity), group.cart_id)
        }
      }
      window.location.assign("/checkout/platform")
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to prepare merged checkout.")
      setPreparingPlatformCheckout(false)
    }
  }

  const checkoutStoreGroup = async (group: PlatformCartGroup) => {
    if (preparingCheckoutStoreId) return
    const selectedItems = group.cart.items.filter((item) =>
      selectedLineKeys.has(composePlatformLineKey(group.storeId, item.id))
    )
    if (!selectedItems.length) {
      setLoadError("Select at least one item from this store to checkout.")
      return
    }
    setPreparingCheckoutStoreId(group.storeId)
    try {
      let checkoutCart = group.cart
      let checkoutHref = ""
      if (selectedItems.length !== group.cart.items.length) {
        let sourceCart = group.cart
        checkoutCart = await createCart({
          storeId: group.storeId,
          countryCode: readBuyerPreferences(auth.customer).countryCode,
        })
        for (const item of selectedItems) {
          if (!item.variantId) throw new Error("A selected item has no purchasable variant.")
          checkoutCart = await addCartLineItem(checkoutCart.id, item.variantId, item.quantity, {
            storeId: group.storeId,
          })
        }
        for (const item of selectedItems) {
          sourceCart = await deleteCartLineItem(group.cart.id, item.id, { storeId: group.storeId })
        }
        rememberSplitCheckout(group.storeId, {
          sourceCartId: group.cart.id,
          checkoutCartId: checkoutCart.id,
          selectedLineIds: [],
        })
        registerStoreCart(window.localStorage, cartIdentity, group.storeId, sourceCart.id)
        onCartUpdated(sourceCart)
      } else {
        window.localStorage.setItem(getBuyerCartStorageKey(group.storeId, cartIdentity), checkoutCart.id)
      }
      // Passing the cart id avoids a storage/auth race while the checkout page mounts.
      checkoutHref = `/checkout?store=${encodeURIComponent(group.storeId)}&cart_id=${encodeURIComponent(checkoutCart.id)}`
      setActiveBuyerStoreId(group.storeId)
      window.location.assign(checkoutHref)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to prepare checkout for this store.")
      setPreparingCheckoutStoreId(undefined)
    }
  }

  const updateQuantity = async (lineKey: string, quantity: number) => {
    const parsed = parsePlatformLineKey(lineKey)
    if (!parsed || updatingLineKey) return
    const group = groups.find((entry) => entry.storeId === parsed.storeId)
    if (!group) return
    setUpdatingLineKey(lineKey)
    setLineErrors((errors) => ({ ...errors, [lineKey]: "" }))
    try {
      await updateCartItemQuantity(group.cart.id, parsed.lineId, quantity, storeScopedDependencies(group.storeId))
      await loadCart(() => true)
    } catch (error) {
      setLineErrors((errors) => ({
        ...errors,
        [lineKey]: error instanceof Error ? error.message : "Unable to update quantity.",
      }))
    } finally {
      setUpdatingLineKey(undefined)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    setDeleteError(undefined)
    try {
      await removeCartItem(
        deleteTarget.group.cart.id,
        deleteTarget.item.id,
        storeScopedDependencies(deleteTarget.group.storeId)
      )
      setDeleteTargetKey(undefined)
      await loadCart(() => true)
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Unable to remove this item.")
    } finally {
      setDeleting(false)
    }
  }

  const empty = !groups.length
  return (
    <PageShell
      className="buyer-cart-page"
      contentClassName="buyer-cart-shell-content"
      header={<StoreTopBar settings={settings} cartCount={itemCount} />}
      footer={<StoreFooter />}
      cartCount={itemCount}
      storeHref={storeHref}
    >
      <header className="buyer-cart-page-header">
        <div>
          <p>Your basket</p>
          <h1>Shopping cart</h1>
          <small>{groups.length ? `${groups.length} store${groups.length === 1 ? "" : "s"}` : "Cross-store cart"}</small>
        </div>
        <a href="/">Continue shopping</a>
      </header>
      <CartPageStatus loading={loading} error={loadError} empty={empty} onRetry={() => setLoadVersion((version) => version + 1)} />

      {!loading && !loadError && groups.length >= 2 ? (
        <section className="buyer-platform-cart-merge">
          <Card as="aside" className="buyer-platform-cart-merge-card">
            <header>
              <p>Multi-store checkout</p>
              <h2>Checkout all selected stores</h2>
            </header>
            <p>Complete one shared checkout flow, then pay each store separately. Orders will be linked under the same platform checkout batch.</p>
            <Button
              onClick={() => void checkoutAllStores()}
              disabled={preparingPlatformCheckout || Boolean(preparingCheckoutStoreId)}
            >
              {preparingPlatformCheckout ? "Preparing merged checkout…" : "Checkout all stores"}
            </Button>
          </Card>
        </section>
      ) : null}

      {!loading && !loadError && groups.length ? (
        <div className="buyer-platform-cart-groups">
          {groups.map((group) => {
            const visibleItems = group.cart.items.map((item) => ({
              key: composePlatformLineKey(group.storeId, item.id),
              item: normalizeBuyerCartItem({ ...item, storeId: group.storeId }),
            }))
            const selectedItems = group.cart.items.filter((item) =>
              selectedLineKeys.has(composePlatformLineKey(group.storeId, item.id))
            )
            const selectedCart: StoreCart = {
              ...group.cart,
              items: selectedItems,
              subtotal: selectedItems.reduce((sum, item) => sum + item.total, 0),
              total: selectedItems.reduce((sum, item) => sum + item.total, 0),
            }

            return (
              <section key={group.storeId} className="buyer-platform-cart-group">
                <header className="buyer-platform-cart-group-header">
                  <div>
                    <p>Store</p>
                    <h2>
                      {group.storeSlug ? (
                        <a href={`/shops/${encodeURIComponent(group.storeSlug)}`}>{group.storeName}</a>
                      ) : (
                        group.storeName
                      )}
                    </h2>
                  </div>
                  <span>{group.cart.items.length} item{group.cart.items.length === 1 ? "" : "s"}</span>
                </header>
                <div className="buyer-cart-layout">
                  <div className="buyer-cart-list" aria-label={`Cart items from ${group.storeName}`}>
                    {visibleItems.map(({ key, item }) => (
                      <div key={key}>
                        <CartItemCard
                          item={item}
                          currencyCode={group.cart.currencyCode}
                          updating={updatingLineKey === key}
                          error={lineErrors[key] || undefined}
                          onQuantityChange={(_, quantity) => void updateQuantity(key, quantity)}
                          onDeleteRequest={() => {
                            setDeleteTargetKey(key)
                            setDeleteError(undefined)
                          }}
                          selected={selectedLineKeys.has(key)}
                          onSelectedChange={(selected) =>
                            setSelectedLineKeys((current) => {
                              const next = new Set(current)
                              if (selected) next.add(key)
                              else next.delete(key)
                              return next
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                  {selectedItems.length ? (
                    <CartSummaryCard
                      cart={selectedCart}
                      onCheckout={() => void checkoutStoreGroup(group)}
                      preparing={preparingCheckoutStoreId === group.storeId}
                      checkoutLabel={`Checkout ${group.storeName}`}
                    />
                  ) : null}
                </div>
              </section>
            )
          })}
        </div>
      ) : null}

      {recommendations.length && !loading ? (
        <section className="buyer-cart-recommendations-new">
          <header>
            <p>More to discover</p>
            <h2>Recommended for you</h2>
          </header>
          <div>
            {recommendations.map((product) => (
              <div key={`${product.storeId ?? "store"}-${product.id}`}>
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <CartDeleteConfirm
        item={deleteTarget?.item ?? null}
        deleting={deleting}
        error={deleteError}
        onCancel={() => {
          if (!deleting) setDeleteTargetKey(undefined)
        }}
        onConfirm={() => void confirmDelete()}
      />
    </PageShell>
  )
}
