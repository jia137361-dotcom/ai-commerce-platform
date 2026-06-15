import { useEffect, useState } from "react"
import { CheckoutAddressPanel, type CheckoutAddress } from "../../components/checkout/CheckoutAddressPanel"
import { CheckoutContactForm, type CheckoutContact } from "../../components/checkout/CheckoutContactForm"
import { CheckoutPaymentPanel } from "../../components/checkout/CheckoutPaymentPanel"
import { CheckoutSummary } from "../../components/checkout/CheckoutSummary"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import {
  fetchCart,
  fetchStoreSettings,
  getBuyerCartStorageKey,
  getBuyerStoreId,
  type BuyerStoreSettings,
} from "../../lib/buyer-api"
import type { StoreCart } from "../../lib/mock-data"

type CheckoutPageProps = {
  cartCount: number
  onCartUpdated: (cart: StoreCart | null) => void
}

const fallbackSettings: BuyerStoreSettings = {
  storeId: "default_store",
  brandName: "Citigoo",
  metadata: {},
}

const initialContact: CheckoutContact = {
  email: "",
  phone: "",
  name: "",
}

const initialAddress: CheckoutAddress = {
  country: "United States",
  state: "",
  city: "",
  address1: "",
  address2: "",
  postalCode: "",
  label: "Home",
}

export function CheckoutPage({ cartCount, onCartUpdated }: CheckoutPageProps) {
  const [settings, setSettings] = useState<BuyerStoreSettings>(fallbackSettings)
  const [cart, setCart] = useState<StoreCart | null>(null)
  const [contact, setContact] = useState(initialContact)
  const [address, setAddress] = useState(initialAddress)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | undefined>()

  useEffect(() => {
    let active = true

    const load = async () => {
      setLoading(true)
      setError(undefined)
      const settingsResult = await fetchStoreSettings()
      if (active) {
        setSettings(settingsResult.data)
      }

      const cartId = window.localStorage.getItem(getBuyerCartStorageKey(getBuyerStoreId()))
      if (!cartId) {
        if (active) {
          setCart(null)
          onCartUpdated(null)
          setLoading(false)
        }
        return
      }

      try {
        const loaded = await fetchCart(cartId)
        if (!active) return
        setCart(loaded)
        onCartUpdated(loaded)
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : "Unable to load checkout cart.")
        setCart(null)
        onCartUpdated(null)
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [onCartUpdated])

  return (
    <div className="buyer-checkout-page">
      <StoreTopBar settings={settings} cartCount={cartCount} />
      <main className="buyer-checkout-main">
        {loading ? (
          <section className="buyer-checkout-state" role="status">Loading checkout...</section>
        ) : !cart || !cart.items.length ? (
          <section className="buyer-checkout-state">
            {error ? (
              <>
                <strong>Checkout cart unavailable</strong>
                <p>{error}</p>
              </>
            ) : (
              <>
                <strong>Your cart is empty</strong>
                <p>Add products before continuing to checkout.</p>
              </>
            )}
            <div>
              <a href="/cart">Back to cart</a>
              <a href="/store">Shop products</a>
            </div>
          </section>
        ) : (
          <section className="buyer-checkout-layout">
            <div className="buyer-checkout-left">
              <div className="buyer-checkout-title">
                <a href="/cart">Back to cart</a>
                <h1>Checkout</h1>
                <p>Review contact, delivery, payment, and order summary before the final backend checkout flow is enabled.</p>
              </div>
              <CheckoutContactForm value={contact} onChange={setContact} />
              <CheckoutAddressPanel value={address} onChange={setAddress} />
              <section className="buyer-checkout-panel buyer-checkout-shipping">
                <header>
                  <span>3</span>
                  <div>
                    <h2>Shipping method</h2>
                    <p>Shipping options API is pending.</p>
                  </div>
                </header>
                <div>
                  <strong>Standard shipping</strong>
                  <span>Calculated after shipping options backend is available.</span>
                </div>
              </section>
              <CheckoutPaymentPanel />
            </div>
            <CheckoutSummary cart={cart} />
          </section>
        )}
      </main>
    </div>
  )
}
