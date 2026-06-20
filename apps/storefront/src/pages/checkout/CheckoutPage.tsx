import { useEffect, useState } from "react"
import type { CheckoutAddress } from "../../components/checkout/CheckoutAddressPanel"
import { CheckoutAddressCard } from "../../components/checkout/CheckoutAddressCard"
import { CheckoutContactForm, type CheckoutContact } from "../../components/checkout/CheckoutContactForm"
import { CheckoutCompleteError } from "../../components/checkout/CheckoutCompleteError"
import { CheckoutPageStatus } from "../../components/checkout/CheckoutPageStatus"
import { CheckoutPaymentPanel } from "../../components/checkout/CheckoutPaymentPanel"
import { CheckoutShippingCard } from "../../components/checkout/CheckoutShippingCard"
import { CheckoutSummaryCard } from "../../components/checkout/CheckoutSummaryCard"
import { PageShell } from "../../components/layout/PageShell"
import { StoreFooter } from "../../components/layout/StoreFooter"
import { StoreTopBar } from "../../components/store-home/StoreTopBar"
import { useBuyerAuth } from "../../auth/useBuyerAuth"
import {
  attachCustomerToCart,
  completeCart,
  fetchCart,
  fetchStoreSettings,
  getCartShippingOptions,
  getBuyerCartStorageKey,
  getBuyerStoreId,
  selectCartShippingMethod,
  updateCartAddress,
  updateCartContact,
  type CartShippingOption,
  type BuyerStoreSettings,
} from "../../lib/buyer-api"
import type { StoreCart } from "../../lib/mock-data"
import { completeCheckoutOrder, completeGuestCheckoutOrder } from "./checkout-action"
import { resolveCheckoutState } from "./checkout-state"

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
  const auth = useBuyerAuth()
  const [settings, setSettings] = useState<BuyerStoreSettings>(fallbackSettings)
  const [cart, setCart] = useState<StoreCart | null>(null)
  const [contact, setContact] = useState(initialContact)
  const [contactTouched, setContactTouched] = useState(false)
  const [address, setAddress] = useState(initialAddress)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | undefined>()
  const [addressSaving, setAddressSaving] = useState(false)
  const [addressSaved, setAddressSaved] = useState(false)
  const [addressError, setAddressError] = useState<string | undefined>()
  const [contactStatus, setContactStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [contactError, setContactError] = useState<string | undefined>()
  const [shippingLoading, setShippingLoading] = useState(false)
  const [shippingOptions, setShippingOptions] = useState<CartShippingOption[]>([])
  const [selectedShippingOptionId, setSelectedShippingOptionId] = useState("")
  const [requiresShippingMethod, setRequiresShippingMethod] = useState(true)
  const [shippingError, setShippingError] = useState<string | undefined>()
  const [shippingMethodSaved, setShippingMethodSaved] = useState(false)
  const [placingOrder, setPlacingOrder] = useState(false)
  const [completeError, setCompleteError] = useState<string | undefined>()
  const [loadVersion, setLoadVersion] = useState(0)

  const contactIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim()) && contact.phone.trim().length >= 4 && contact.name.trim().length > 1
  const addressIsValid = Boolean(address.address1.trim() && address.city.trim() && address.postalCode.trim() && address.country.trim())
  const checkoutState = resolveCheckoutState({ cart, authLoading: auth.isLoading, authenticated: Boolean(auth.customer), contactValid: contactIsValid, requiresShippingMethod, addressValid: addressIsValid, addressSaved, shippingMethodSaved, placingOrder })
  const { canPlaceOrder, disabledReason: placeOrderDisabledReason } = checkoutState
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
        let activeCart = loaded
        if (auth.customer) {
          try {
            activeCart = await attachCustomerToCart(loaded.id)
          } catch (attachError) {
            console.warn("[checkout] unable to attach authenticated customer to cart", attachError)
          }
        }
        if (!active) return
        setCart(activeCart)
        onCartUpdated(activeCart)
        try {
          const shipping = await getCartShippingOptions(activeCart.id)
          if (!active) return
          setShippingOptions(shipping.options)
          setRequiresShippingMethod(shipping.requiresShippingMethod)
          setSelectedShippingOptionId(shipping.options[0]?.id ?? "")
          setShippingMethodSaved(!shipping.requiresShippingMethod)
        } catch (shippingProbeError) {
          console.warn("[checkout] shipping requirement probe failed", shippingProbeError)
          if (!active) return
          setRequiresShippingMethod(true)
          setShippingMethodSaved(false)
        }
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
  }, [auth.customer, loadVersion, onCartUpdated])

  useEffect(() => {
    setContactStatus("idle")
    setContactError(undefined)
    setAddressSaved(false)
    setShippingOptions([])
    setSelectedShippingOptionId("")
    setShippingMethodSaved(false)
    setShippingError(undefined)
  }, [contact, address])

  useEffect(() => {
    if (!auth.customer || contactTouched || contact.email || contact.name || contact.phone) return
    setContact({
      email: auth.customer?.email ?? "",
      phone: auth.customer.phone ?? "",
      name: [auth.customer.firstName, auth.customer.lastName].filter(Boolean).join(" "),
    })
  }, [auth.customer, contact.email, contact.name, contact.phone, contactTouched])

  const saveContactForCart = async (targetCart: StoreCart) => {
    setContactStatus("saving")
    setContactError(undefined)
    try {
      const updated = await updateCartContact(targetCart.id, {
        email: contact.email.trim(),
        phone: contact.phone.trim() || undefined,
      })
      setCart(updated)
      onCartUpdated(updated)
      setContactStatus("saved")
      return updated
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to save contact information."
      setContactStatus("error")
      setContactError(message)
      throw new Error(message)
    }
  }

  const handleSaveContact = async () => {
    if (!cart) throw new Error("Checkout cart is unavailable.")
    return saveContactForCart(cart)
  }

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
      const result = auth.customer
        ? (
            await completeCheckoutOrder({
              cart,
              customerId: auth.customer.id,
              bindCustomer: attachCustomerToCart,
              saveContact: saveContactForCart,
              complete: completeCart,
            })
          ).result
        : (await completeGuestCheckoutOrder({
            cart,
            saveContact: saveContactForCart,
            complete: completeCart,
          })).result
      if (!result.email) {
        console.warn("[checkout] complete cart returned an order without email", result)
      }

      const storeId = getBuyerStoreId()
      const successPayload = {
        order_id: result.orderId,
        display_id: result.displayId,
        currency_code: result.currencyCode ?? cart.currencyCode,
        orderId: result.orderId,
        displayId: result.displayId,
        email: result.email ?? null,
        total: result.total ?? (cart.hasTotal === false ? undefined : cart.total),
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
    <PageShell className="buyer-checkout-page" contentClassName="buyer-checkout-shell-content" header={<StoreTopBar settings={settings} cartCount={cartCount} />} footer={<StoreFooter />}>
      <header className="buyer-checkout-page-header"><div><p>Secure checkout</p><h1>Checkout</h1><span>Review your contact, delivery, and order summary.</span></div><a href="/cart">Back to cart</a></header>
      <CheckoutPageStatus loading={loading} error={error} empty={!cart || !cart.items.length} onRetry={() => setLoadVersion((version) => version + 1)} />
      {!loading && !error && cart?.items.length ? (
          <section className="buyer-checkout-layout">
            <div className="buyer-checkout-left">
              {completeError ? <CheckoutCompleteError message={completeError} /> : null}
              <CheckoutContactForm
                value={contact}
                onChange={(nextContact) => {
                  setContactTouched(true)
                  setContact(nextContact)
                }}
                onSave={() => { void handleSaveContact().catch(() => undefined) }}
                status={contactStatus}
                error={contactError}
              />
              <CheckoutAddressCard
                value={address}
                onChange={setAddress}
                onSave={handleSaveAddress}
                required={requiresShippingMethod}
                saving={addressSaving}
                saved={addressSaved}
                error={addressError}
              />
              <CheckoutShippingCard required={requiresShippingMethod} addressSaved={addressSaved} loading={shippingLoading} error={shippingError} options={shippingOptions} selectedId={selectedShippingOptionId} methodSaved={shippingMethodSaved} onSelect={(id) => void handleSelectShippingMethod(id)} />
              <CheckoutPaymentPanel />
            </div>
            <CheckoutSummaryCard
              cart={cart}
              canPlaceOrder={canPlaceOrder}
              disabledReason={placeOrderDisabledReason}
              onPlaceOrder={() => void handlePlaceOrder()}
              placing={placingOrder}
              shippingAmount={shippingMethodSaved ? selectedShippingOption?.amount ?? 0 : undefined}
            />
          </section>
      ) : null}
    </PageShell>
  )
}
