import { useEffect, useState } from "react"
import { CheckoutAddressPanel, type CheckoutAddress } from "../../components/checkout/CheckoutAddressPanel"
import { CheckoutContactForm, type CheckoutContact } from "../../components/checkout/CheckoutContactForm"
import { CheckoutPaymentPanel } from "../../components/checkout/CheckoutPaymentPanel"
import { CheckoutSummary } from "../../components/checkout/CheckoutSummary"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import {
  completeCart,
  fetchCart,
  fetchStoreSettings,
  getCartShippingOptions,
  getBuyerCartStorageKey,
  getBuyerStoreId,
  selectCartShippingMethod,
  updateCartAddress,
  type CartShippingOption,
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
  const [addressSaving, setAddressSaving] = useState(false)
  const [addressSaved, setAddressSaved] = useState(false)
  const [addressError, setAddressError] = useState<string | undefined>()
  const [shippingLoading, setShippingLoading] = useState(false)
  const [shippingOptions, setShippingOptions] = useState<CartShippingOption[]>([])
  const [selectedShippingOptionId, setSelectedShippingOptionId] = useState("")
  const [requiresShippingMethod, setRequiresShippingMethod] = useState(true)
  const [shippingError, setShippingError] = useState<string | undefined>()
  const [shippingMethodSaved, setShippingMethodSaved] = useState(false)
  const [placingOrder, setPlacingOrder] = useState(false)
  const [completeError, setCompleteError] = useState<string | undefined>()

  const contactIsValid = contact.email.includes("@") && contact.phone.trim().length >= 4 && contact.name.trim().length > 1
  const addressIsValid = Boolean(address.address1.trim() && address.city.trim() && address.postalCode.trim() && address.country.trim())
  const completeEndpointConfirmed = false

  const placeOrderDisabledReason = (() => {
    if (!cart?.items.length) return "Cart is empty."
    if (!contactIsValid) return "Enter a valid email, phone, and receiver name."
    if (!addressIsValid) return "Enter a complete delivery address."
    if (!addressSaved) return "Save delivery address before placing the order."
    if (requiresShippingMethod && !shippingMethodSaved) return "Select and save a shipping method."
    if (!completeEndpointConfirmed) return "Complete cart runtime verification is still pending."
    return ""
  })()
  const canPlaceOrder = Boolean(cart?.items.length && contactIsValid && addressIsValid && addressSaved && (!requiresShippingMethod || shippingMethodSaved) && completeEndpointConfirmed)
  const selectedShippingOption = shippingOptions.find((option) => option.id === selectedShippingOptionId)

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

  useEffect(() => {
    setAddressSaved(false)
    setShippingOptions([])
    setSelectedShippingOptionId("")
    setShippingMethodSaved(false)
    setShippingError(undefined)
  }, [contact, address])

  const handleSaveAddress = async () => {
    if (!cart) return
    setAddressSaving(true)
    setAddressError(undefined)
    setShippingError(undefined)
    try {
      const [firstName, ...restName] = contact.name.trim().split(/\s+/)
      const updated = await updateCartAddress(cart.id, {
        email: contact.email.trim(),
        phone: contact.phone.trim(),
        shippingAddress: {
          firstName: firstName || contact.name.trim(),
          lastName: restName.join(" ") || ".",
          address1: address.address1.trim(),
          address2: address.address2.trim() || undefined,
          city: address.city.trim(),
          province: address.state.trim() || undefined,
          postalCode: address.postalCode.trim(),
          countryCode: address.country.trim().toLowerCase() === "united states" ? "us" : address.country.trim().toLowerCase(),
        },
      })
      setCart(updated)
      onCartUpdated(updated)
      setAddressSaved(true)
      setShippingLoading(true)
      const shipping = await getCartShippingOptions(updated.id)
      setShippingOptions(shipping.options)
      setRequiresShippingMethod(shipping.requiresShippingMethod)
      setSelectedShippingOptionId(shipping.options[0]?.id ?? "")
      setShippingMethodSaved(!shipping.requiresShippingMethod)
    } catch (saveError) {
      setAddressError(saveError instanceof Error ? saveError.message : "Unable to save delivery address.")
      setAddressSaved(false)
    } finally {
      setAddressSaving(false)
      setShippingLoading(false)
    }
  }

  const handleSelectShippingMethod = async (optionId: string) => {
    if (!cart) return
    setSelectedShippingOptionId(optionId)
    setShippingMethodSaved(false)
    setShippingLoading(true)
    setShippingError(undefined)
    try {
      const updated = await selectCartShippingMethod(cart.id, optionId)
      setCart(updated)
      onCartUpdated(updated)
      setShippingMethodSaved(true)
    } catch (selectError) {
      setShippingError(selectError instanceof Error ? selectError.message : "Unable to select shipping method.")
    } finally {
      setShippingLoading(false)
    }
  }

  const handlePlaceOrder = async () => {
    if (!cart || !canPlaceOrder) return
    setPlacingOrder(true)
    setCompleteError(undefined)
    try {
      const result = await completeCart(cart.id)
      if (!result.orderId) {
        throw new Error("Complete cart succeeded without an order_id.")
      }

      const storeId = getBuyerStoreId()
      const successPayload = {
        orderId: result.orderId,
        displayId: result.displayId,
        email: result.email ?? contact.email.trim(),
        total: result.total ?? cart.total,
        currencyCode: result.currencyCode ?? cart.currencyCode,
      }

      window.localStorage.removeItem(getBuyerCartStorageKey(storeId))
      window.sessionStorage.setItem(`citigoo:${storeId}:checkout_success`, JSON.stringify(successPayload))
      onCartUpdated(null)
      window.location.assign(`/checkout/success?order_id=${encodeURIComponent(result.orderId)}`)
    } catch (completeErrorValue) {
      const message = completeErrorValue instanceof Error ? completeErrorValue.message : "Unable to place order."
      console.error("[checkout] complete cart failed", completeErrorValue)
      setCompleteError(message)
    } finally {
      setPlacingOrder(false)
    }
  }

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
                <p>Review contact, delivery, payment, and order summary before placing the order.</p>
              </div>
              {completeError && <p className="buyer-checkout-inline-error">{completeError}</p>}
              <CheckoutContactForm value={contact} onChange={setContact} />
              <CheckoutAddressPanel
                value={address}
                onChange={setAddress}
                onSave={handleSaveAddress}
                saving={addressSaving}
                saved={addressSaved}
                error={addressError}
              />
              <section className="buyer-checkout-panel buyer-checkout-shipping">
                <header>
                  <span>3</span>
                  <div>
                    <h2>Shipping method</h2>
                    <p>{addressSaved ? "Choose an available delivery method." : "Save delivery address to load available shipping methods."}</p>
                  </div>
                </header>
                {shippingLoading ? (
                  <div><strong>Loading shipping options</strong><span>Please wait...</span></div>
                ) : shippingError ? (
                  <p className="buyer-checkout-inline-error">{shippingError}</p>
                ) : !addressSaved ? (
                  <div><strong>Address required</strong><span>Shipping options are loaded from the backend after address save.</span></div>
                ) : shippingOptions.length ? (
                  <div className="buyer-checkout-shipping-options">
                    {shippingOptions.map((option) => (
                      <button
                        className={selectedShippingOptionId === option.id && shippingMethodSaved ? "active" : ""}
                        key={option.id}
                        type="button"
                        onClick={() => void handleSelectShippingMethod(option.id)}
                      >
                        <strong>{option.name}</strong>
                        <span>{option.amount ? `$${option.amount.toFixed(2)} ${option.currencyCode.toUpperCase()}` : "Free"}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div><strong>No shipping option required</strong><span>The backend did not return selectable shipping methods for this cart.</span></div>
                )}
              </section>
              <CheckoutPaymentPanel />
            </div>
            <CheckoutSummary
              cart={cart}
              canPlaceOrder={canPlaceOrder}
              disabledReason={placeOrderDisabledReason}
              onPlaceOrder={() => void handlePlaceOrder()}
              placing={placingOrder}
              shippingAmount={shippingMethodSaved ? selectedShippingOption?.amount ?? 0 : undefined}
            />
          </section>
        )}
      </main>
    </div>
  )
}
