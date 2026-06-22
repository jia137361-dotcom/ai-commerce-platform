import { useEffect, useState } from "react"
import type { CheckoutAddress } from "../../components/checkout/CheckoutAddressPanel"
import { CheckoutAddressCard } from "../../components/checkout/CheckoutAddressCard"
import type { CheckoutContact } from "../../components/checkout/CheckoutContactForm"
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
  deleteCartLineItem,
  fetchCart,
  fetchStoreSettings,
  getCartShippingOptions,
  getBuyerCartStorageKey,
  getBuyerStoreId,
  getStripePublishableKey,
  initializeCartPaymentSession,
  listCartPaymentProviders,
  listCustomerAddresses,
  readBuyerPreferences,
  selectCartShippingMethod,
  updateCartAddress,
  updateCartContact,
  type CartShippingOption,
  type BuyerPaymentProvider,
  type BuyerPaymentSession,
  type BuyerStoreSettings,
  type BuyerCustomerAddress,
} from "../../lib/buyer-api"
import type { StoreCart } from "../../lib/mock-data"
import { completeCheckoutOrder, completeGuestCheckoutOrder } from "./checkout-action"
import { resolveCheckoutState } from "./checkout-state"
import { getBuyerCartIdentity } from "../../lib/buyer-cart-storage"
import { isCheckoutCountryCode, shippingUnavailableMessage } from "./checkout-countries"
import {
  chooseDefaultPaymentProvider,
  hasValidStripeClientSecret,
  isStripeProviderId,
  STRIPE_ORDER_CREATION_FAILED_MESSAGE,
} from "./checkout-payment"
import { savedAddressToCheckout } from "./checkout-saved-address"

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
  country: "us",
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
  const [savedAddresses, setSavedAddresses] = useState<BuyerCustomerAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState("")
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
  const [paymentProviders, setPaymentProviders] = useState<BuyerPaymentProvider[]>([{ id: "pp_system_default", isStripe: false }])
  const [selectedPaymentProviderId, setSelectedPaymentProviderId] = useState("pp_system_default")
  const [paymentSession, setPaymentSession] = useState<BuyerPaymentSession | null>(null)
  const [paymentPreparing, setPaymentPreparing] = useState(false)
  const [paymentError, setPaymentError] = useState<string | undefined>()
  const [completeError, setCompleteError] = useState<string | undefined>()
  const [loadVersion, setLoadVersion] = useState(0)

  const contactIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim()) && contact.phone.trim().length >= 4 && contact.name.trim().length > 1
  const addressIsValid = Boolean(address.address1.trim() && address.city.trim() && address.postalCode.trim() && isCheckoutCountryCode(address.country))
  const stripePublishableKey = getStripePublishableKey()
  const stripeSelected = isStripeProviderId(selectedPaymentProviderId)
  const paymentSessionReady = !stripeSelected || hasValidStripeClientSecret(paymentSession)
  const checkoutState = resolveCheckoutState({ cart, authLoading: auth.isLoading, authenticated: Boolean(auth.customer), contactValid: contactIsValid, requiresShippingMethod, addressValid: addressIsValid, addressSaved, shippingMethodSaved, paymentSessionReady, placingOrder })
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

      const cartIdentity = getBuyerCartIdentity(auth.customer?.id, window.localStorage)
      const cartId = window.localStorage.getItem(getBuyerCartStorageKey(getBuyerStoreId(), cartIdentity))
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
          if (!activeCart.regionId) throw new Error("Cart region is unavailable; payment providers cannot be resolved.")
          const availableProviders = await listCartPaymentProviders(activeCart.regionId)
          if (!active) return
          const providers = availableProviders.length ? availableProviders : [{ id: "pp_system_default", isStripe: false }]
          setPaymentProviders(providers)
          setSelectedPaymentProviderId(chooseDefaultPaymentProvider(providers, stripePublishableKey))
          setPaymentError(undefined)
        } catch (providerError) {
          if (!active) return
          setPaymentProviders([{ id: "pp_system_default", isStripe: false }])
          setSelectedPaymentProviderId("pp_system_default")
          setPaymentError(providerError instanceof Error ? providerError.message : "Unable to load payment providers.")
        }
        try {
          const shipping = await getCartShippingOptions(activeCart.id)
          if (!active) return
          setShippingOptions(shipping.options)
          setRequiresShippingMethod(shipping.requiresShippingMethod)
          setSelectedShippingOptionId(shipping.options.find((option) => option.available)?.id ?? "")
          setShippingMethodSaved(!shipping.requiresShippingMethod)
        } catch (shippingProbeError) {
          console.warn("[checkout] shipping requirement probe failed", shippingProbeError)
          if (!active) return
          setRequiresShippingMethod(true)
          setShippingMethodSaved(false)
          setShippingError(shippingUnavailableMessage(shippingProbeError))
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
    setPaymentSession(null)
    setPaymentError(undefined)
  }, [contact, address])

  useEffect(() => {
    if (!stripeSelected || !cart || (requiresShippingMethod && !shippingMethodSaved)) {
      setPaymentSession(null)
      return
    }
    if (!stripePublishableKey.startsWith("pk_test_")) {
      setPaymentSession(null)
      setPaymentError("VITE_STRIPE_PK must be configured with a Stripe test publishable key.")
      return
    }
    let active = true
    setPaymentPreparing(true)
    setPaymentError(undefined)
    void initializeCartPaymentSession(cart.id, selectedPaymentProviderId)
      .then((session) => { if (active) setPaymentSession(session) })
      .catch((value) => { if (active) { setPaymentSession(null); setPaymentError(value instanceof Error ? value.message : "Unable to initialize Stripe payment.") } })
      .finally(() => { if (active) setPaymentPreparing(false) })
    return () => { active = false }
  }, [cart?.id, cart?.total, requiresShippingMethod, selectedPaymentProviderId, shippingMethodSaved, stripePublishableKey, stripeSelected])

  useEffect(() => {
    if (!auth.customer || contactTouched || contact.email || contact.name || contact.phone) return
    setContact({
      email: auth.customer?.email ?? "",
      phone: auth.customer.phone ?? "",
      name: [auth.customer.firstName, auth.customer.lastName].filter(Boolean).join(" "),
    })
  }, [auth.customer, contact.email, contact.name, contact.phone, contactTouched])

  useEffect(() => {
    if (!auth.customer) {
      setSavedAddresses([])
      setSelectedAddressId("")
      return
    }
    let active = true
    const preferences = readBuyerPreferences(auth.customer)
    setAddress((current) => current.address1 ? current : { ...current, country: preferences.countryCode })
    void listCustomerAddresses().then((addresses) => {
      if (!active) return
      setSavedAddresses(addresses)
    }).catch((reason) => console.warn("[checkout] unable to load saved addresses", reason))
    return () => { active = false }
  }, [auth.customer?.id])

  const selectSavedAddress = (saved: BuyerCustomerAddress) => {
    const selection = savedAddressToCheckout(saved)
    setSelectedAddressId(saved.id)
    setAddress(selection.address)
    setContact((current) => ({ ...current, name: selection.name || current.name, phone: selection.phone || current.phone }))
    setContactTouched(true)
  }

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
          countryCode: address.country,
        },
      })
      setCart(updated)
      onCartUpdated(updated)
      setAddressSaved(true)
      setShippingLoading(true)
      try {
        const shipping = await getCartShippingOptions(updated.id)
        setShippingOptions(shipping.options)
        setRequiresShippingMethod(shipping.requiresShippingMethod)
        setSelectedShippingOptionId(shipping.options.find((option) => option.available)?.id ?? "")
        setShippingMethodSaved(!shipping.requiresShippingMethod)
      } catch (shippingLoadError) {
        setShippingOptions([])
        setRequiresShippingMethod(true)
        setShippingMethodSaved(false)
        setShippingError(shippingUnavailableMessage(shippingLoadError))
      }
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
      setShippingError(shippingUnavailableMessage(selectError))
    } finally {
      setShippingLoading(false)
    }
  }

  const handlePlaceOrder = async (
    providerId = selectedPaymentProviderId,
    propagateCompleteError = false
  ) => {
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
              complete: (cartId) => completeCart(cartId, providerId),
            })
          ).result
        : (await completeGuestCheckoutOrder({
            cart,
            saveContact: saveContactForCart,
            complete: (cartId) => completeCart(cartId, providerId),
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
        paymentProviderId: result.paymentProviderId ?? providerId,
        paymentStatus: result.paymentStatus,
      }

      const cartIdentity = getBuyerCartIdentity(auth.customer?.id, window.localStorage)
      const cartStorageKey = getBuyerCartStorageKey(storeId, cartIdentity)
      const splitKey = `citigoo:${storeId}:split_checkout`
      const splitRaw = window.sessionStorage.getItem(splitKey)
      const split = splitRaw ? JSON.parse(splitRaw) as { sourceCartId?: string; checkoutCartId?: string; selectedLineIds?: string[] } : null
      if (split?.checkoutCartId === cart.id && split.sourceCartId) {
        for (const lineId of split.selectedLineIds ?? []) {
          try { await deleteCartLineItem(split.sourceCartId, lineId) } catch (cleanupError) { console.warn("[checkout] unable to remove purchased source line", { line_id: lineId, cleanupError }) }
        }
        window.localStorage.setItem(cartStorageKey, split.sourceCartId)
        window.sessionStorage.removeItem(splitKey)
      } else {
        window.localStorage.removeItem(cartStorageKey)
      }
      window.sessionStorage.setItem(`citigoo:${storeId}:checkout_success`, JSON.stringify(successPayload))
      onCartUpdated(null)
      window.location.assign(`/checkout/success?order_id=${encodeURIComponent(result.orderId)}`)
    } catch (completeErrorValue) {
      const message = propagateCompleteError
        ? STRIPE_ORDER_CREATION_FAILED_MESSAGE
        : completeErrorValue instanceof Error
          ? completeErrorValue.message
          : "Unable to place order."
      console.error("[checkout] complete cart failed", completeErrorValue)
      setCompleteError(message)
      if (propagateCompleteError) throw completeErrorValue
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
              <CheckoutAddressCard
                value={address}
                onChange={(next) => { setSelectedAddressId(""); setAddress(next) }}
                onSave={handleSaveAddress}
                required={requiresShippingMethod}
                saving={addressSaving}
                saved={addressSaved}
                error={addressError}
                savedAddresses={savedAddresses}
                selectedAddressId={selectedAddressId}
                onSelectSavedAddress={selectSavedAddress}
                contact={contact}
                onContactChange={(nextContact) => { setContactTouched(true); setContact(nextContact) }}
                onSaveContact={() => { void handleSaveContact().catch(() => undefined) }}
                contactStatus={contactStatus}
                contactError={contactError}
              />
              <CheckoutShippingCard required={requiresShippingMethod} addressSaved={addressSaved} loading={shippingLoading} error={shippingError} options={shippingOptions} selectedId={selectedShippingOptionId} methodSaved={shippingMethodSaved} onSelect={(id) => void handleSelectShippingMethod(id)} />
              <CheckoutPaymentPanel
                providers={paymentProviders}
                selectedProviderId={selectedPaymentProviderId}
                onProviderChange={(providerId) => { setSelectedPaymentProviderId(providerId); setPaymentSession(null); setPaymentError(undefined) }}
                session={paymentSession}
                stripePublishableKey={stripePublishableKey}
                preparing={paymentPreparing}
                error={paymentError}
                canSubmit={canPlaceOrder}
                placing={placingOrder}
                onStripeComplete={() => handlePlaceOrder(selectedPaymentProviderId, true)}
              />
            </div>
            <CheckoutSummaryCard
              cart={cart}
              canPlaceOrder={canPlaceOrder && !stripeSelected}
              disabledReason={stripeSelected && canPlaceOrder ? "Confirm payment in the Stripe Payment Element." : placeOrderDisabledReason}
              onPlaceOrder={() => void handlePlaceOrder()}
              placing={placingOrder}
              shippingAmount={shippingMethodSaved ? selectedShippingOption?.amount ?? 0 : undefined}
            />
          </section>
      ) : null}
    </PageShell>
  )
}
