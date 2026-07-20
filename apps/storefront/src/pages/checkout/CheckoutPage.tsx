import { useEffect, useMemo, useRef, useState } from "react"
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
  createCustomerAddress,
  deleteCartLineItem,
  fetchCart,
  fetchStoreSettings,
  getCartShippingOptions,
  getBuyerCartStorageKey,
  getScopedBuyerStoreId,
  getStripePublishableKey,
  initializeCartPaymentSession,
  listCartPaymentProviders,
  listCustomerAddresses,
  listCustomerPaymentMethods,
  payCartWithSavedPaymentMethod,
  readBuyerPreferences,
  selectCartShippingMethod,
  setActiveBuyerStoreId,
  updateCartAddress,
  updateCartContact,
  type CartShippingOption,
  type BuyerPaymentMethod,
  type BuyerPaymentProvider,
  type BuyerPaymentSession,
  type BuyerStoreSettings,
  type BuyerCustomerAddress,
} from "../../lib/buyer-api"
import { isBuyerEmailVerified } from "../../lib/buyer-preferences"
import type { StoreCart } from "../../lib/mock-data"
import { completeCheckoutOrder, completeGuestCheckoutOrder } from "./checkout-action"
import { resolveCheckoutState } from "./checkout-state"
import { getBuyerCartIdentity, resolveBuyerCartStorageId } from "../../lib/buyer-cart-storage"
import {
  markPlatformCheckoutOrderComplete,
  nextPendingPlatformCheckoutGroup,
  readPlatformCheckoutSession,
} from "../../lib/platform-checkout-session"
import { isCheckoutCountryCode, shippingUnavailableMessage } from "./checkout-countries"
import {
  chooseDefaultPaymentProvider,
  hasValidStripeClientSecret,
  isStripeProviderId,
  isValidStripePublishableKey,
  STRIPE_ORDER_CREATION_FAILED_MESSAGE,
} from "./checkout-payment"
import { savedAddressToCheckout, cartShippingAddressToCheckout, hasPersistedCartShippingAddress, type CartShippingAddress } from "./checkout-saved-address"

type CheckoutPageProps = {
  cartCount: number
  onCartUpdated: (cart: StoreCart | null) => void
}

const fallbackSettings: BuyerStoreSettings = {
  storeId: "default_store",
  brandName: "CiiVerse",
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
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<BuyerPaymentMethod[]>([])
  const [selectedSavedPaymentMethodId, setSelectedSavedPaymentMethodId] = useState<string | null>(null)
  const [completeError, setCompleteError] = useState<string | undefined>()
  const [loadVersion, setLoadVersion] = useState(0)
  const [saveToAddressBook, setSaveToAddressBook] = useState(true)
  const [usingNewAddress, setUsingNewAddress] = useState(false)
  const skipAddressResetRef = useRef(false)
  const autoSavedAddressRef = useRef(false)
  const shippingSelectGenerationRef = useRef(0)

  const applyShippingOption = async (cartId: string, optionId: string) => {
    const generation = ++shippingSelectGenerationRef.current
    setSelectedShippingOptionId(optionId)
    setShippingMethodSaved(false)
    setShippingLoading(true)
    setShippingError(undefined)
    try {
      const updated = await selectCartShippingMethod(cartId, optionId)
      if (generation !== shippingSelectGenerationRef.current) return updated
      setCart(updated)
      onCartUpdated(updated)
      setShippingMethodSaved(true)
      setShippingError(undefined)
      return updated
    } catch (selectError) {
      if (generation !== shippingSelectGenerationRef.current) return null
      setShippingMethodSaved(false)
      setShippingError(shippingUnavailableMessage(selectError))
      throw selectError
    } finally {
      if (generation === shippingSelectGenerationRef.current) {
        setShippingLoading(false)
      }
    }
  }

  const emailVerified = !auth.customer || isBuyerEmailVerified(auth.customer.metadata)
  const contactIsValid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((contact.email ?? "").trim()) &&
    (contact.phone ?? "").trim().length >= 4 &&
    (contact.name ?? "").trim().length > 1
  const addressIsValid = Boolean(address.address1.trim() && address.city.trim() && address.postalCode.trim() && isCheckoutCountryCode(address.country))
  const stripePublishableKey = getStripePublishableKey()
  const stripeSelected = isStripeProviderId(selectedPaymentProviderId)
  const paymentSessionReady =
    !stripeSelected ||
    hasValidStripeClientSecret(paymentSession) ||
    Boolean(selectedSavedPaymentMethodId)
  const checkoutState = resolveCheckoutState({
    cart,
    authLoading: auth.isLoading,
    authenticated: Boolean(auth.customer),
    emailVerified,
    contactValid: contactIsValid,
    requiresShippingMethod,
    addressValid: addressIsValid,
    addressSaved,
    shippingMethodSaved,
    paymentSessionReady,
    placingOrder,
  })
  const { canPlaceOrder, disabledReason: placeOrderDisabledReason } = checkoutState
  const selectedShippingOption = shippingOptions.find((option) => option.id === selectedShippingOptionId)
  const checkoutSearchParams = useMemo(() => new URLSearchParams(window.location.search), [])
  const checkoutStoreId = checkoutSearchParams.get("store")?.trim() || getScopedBuyerStoreId()
  const platformCheckoutId = checkoutSearchParams.get("platform_checkout_id")?.trim() || ""
  const platformCheckoutIndex = Number(checkoutSearchParams.get("platform_checkout_index"))
  const platformCheckoutCount = Number(checkoutSearchParams.get("platform_checkout_count"))
  const platformCheckoutActive =
    Boolean(platformCheckoutId) &&
    Number.isFinite(platformCheckoutIndex) &&
    Number.isFinite(platformCheckoutCount) &&
    platformCheckoutCount > 0

  useEffect(() => {
    let active = true

    const load = async () => {
      setLoading(true)
      setError(undefined)
      const checkoutStoreId =
        new URLSearchParams(window.location.search).get("store")?.trim() || getScopedBuyerStoreId()
      setActiveBuyerStoreId(checkoutStoreId)
      const settingsResult = await fetchStoreSettings({ storeId: checkoutStoreId })
      if (active) {
        setSettings(settingsResult.data)
      }

      const resolved = resolveBuyerCartStorageId(checkoutStoreId, auth.customer?.id, window.localStorage)
      const cartId = resolved.cartId
      if (!cartId) {
        if (active) {
          setCart(null)
          onCartUpdated(null)
          setLoading(false)
        }
        return
      }

      try {
        const loaded = await fetchCart(cartId, { storeId: checkoutStoreId })
        if (!active) return
        let activeCart = loaded
        if (auth.customer) {
          try {
            activeCart = await attachCustomerToCart(loaded.id, { storeId: checkoutStoreId })
          } catch (attachError) {
            console.warn("[checkout] unable to attach authenticated customer to cart", attachError)
          }
        }
        if (!active) return
        setCart(activeCart)
        onCartUpdated(activeCart)

        const cartShippingAddress: CartShippingAddress | null | undefined = activeCart.shippingAddress
          ? {
              first_name: activeCart.shippingAddress.firstName ?? null,
              last_name: activeCart.shippingAddress.lastName ?? null,
              address_1: activeCart.shippingAddress.address1 ?? null,
              address_2: activeCart.shippingAddress.address2 ?? null,
              city: activeCart.shippingAddress.city ?? null,
              province: activeCart.shippingAddress.province ?? null,
              postal_code: activeCart.shippingAddress.postalCode ?? null,
              country_code: activeCart.shippingAddress.countryCode ?? null,
            }
          : null
        if (hasPersistedCartShippingAddress(cartShippingAddress)) {
          skipAddressResetRef.current = true
          const hydrated = cartShippingAddressToCheckout(cartShippingAddress!)
          if (hydrated) {
            setAddress(hydrated.address)
            setContact((current) => ({
              ...current,
              name: hydrated.name || current.name,
            }))
          }
          setAddressSaved(true)
        }

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
          const firstAvailable = shipping.options.find((option) => option.available)?.id ?? ""
          setSelectedShippingOptionId(firstAvailable)
          if (!shipping.requiresShippingMethod) {
            setShippingMethodSaved(true)
          } else if (firstAvailable && hasPersistedCartShippingAddress(cartShippingAddress)) {
            try {
              await applyShippingOption(activeCart.id, firstAvailable)
            } catch {
              // Error UI is handled inside applyShippingOption.
            }
            if (!active) return
          } else {
            setShippingMethodSaved(false)
          }
        } catch (shippingProbeError) {
          console.warn("[checkout] shipping requirement probe failed", shippingProbeError)
          if (!active) return
          setRequiresShippingMethod(true)
          setShippingMethodSaved(false)
          const probeCode =
            typeof shippingProbeError === "object" &&
            shippingProbeError &&
            "code" in shippingProbeError
              ? String((shippingProbeError as { code?: string }).code ?? "")
              : ""
          if (probeCode !== "CART_SHIPPING_ADDRESS_REQUIRED") {
            setShippingError(shippingUnavailableMessage(shippingProbeError))
          }
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
    if (skipAddressResetRef.current) {
      skipAddressResetRef.current = false
      return
    }
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
      if (stripeSelected && cart && requiresShippingMethod && !shippingMethodSaved) {
        setPaymentError(undefined)
      }
      return
    }
    if (!isValidStripePublishableKey(stripePublishableKey)) {
      setPaymentSession(null)
      setPaymentError("VITE_STRIPE_PK must be configured with a Stripe publishable key (pk_test_ or pk_live_).")
      return
    }
    let active = true
    setPaymentPreparing(true)
    setPaymentError(undefined)
    void initializeCartPaymentSession(cart.id, selectedPaymentProviderId, { storeId: checkoutStoreId })
      .then((session) => { if (active) setPaymentSession(session) })
      .catch((value) => { if (active) { setPaymentSession(null); setPaymentError(value instanceof Error ? value.message : "Unable to initialize Stripe payment.") } })
      .finally(() => { if (active) setPaymentPreparing(false) })
    return () => { active = false }
  }, [cart?.id, cart?.total, checkoutStoreId, requiresShippingMethod, selectedPaymentProviderId, shippingMethodSaved, stripePublishableKey, stripeSelected])

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
      setSavedPaymentMethods([])
      setSelectedSavedPaymentMethodId(null)
      return
    }
    let active = true
    const preferences = readBuyerPreferences(auth.customer)
    setAddress((current) => current.address1 ? current : { ...current, country: preferences.countryCode })
    void listCustomerAddresses().then((addresses) => {
      if (!active) return
      setSavedAddresses(addresses)
      const defaultAddress = addresses.find((entry) => entry.isDefaultShipping) ?? addresses[0]
      if (defaultAddress && !address.address1 && !usingNewAddress) {
        const selection = savedAddressToCheckout(defaultAddress)
        skipAddressResetRef.current = true
        setSelectedAddressId(defaultAddress.id)
        setAddress(selection.address)
        setContact((current) => ({
          ...current,
          name: selection.name || current.name,
          phone: selection.phone || current.phone,
        }))
        setContactTouched(true)
      }
    }).catch((reason) => console.warn("[checkout] unable to load saved addresses", reason))

    void listCustomerPaymentMethods()
      .then((result) => {
        if (!active) return
        setSavedPaymentMethods(result.paymentMethods)
        const defaultMethod =
          result.paymentMethods.find((method) => method.isDefault) ?? result.paymentMethods[0] ?? null
        setSelectedSavedPaymentMethodId(defaultMethod?.id ?? null)
      })
      .catch((reason) => console.warn("[checkout] unable to load saved payment methods", reason))

    return () => { active = false }
  }, [auth.customer?.id])

  useEffect(() => {
    if (!cart || !auth.customer || autoSavedAddressRef.current || addressSaved || usingNewAddress) return
    const defaultAddress = savedAddresses.find((entry) => entry.id === selectedAddressId)
      ?? savedAddresses.find((entry) => entry.isDefaultShipping)
      ?? savedAddresses[0]
    if (!defaultAddress || !address.address1) return
    autoSavedAddressRef.current = true
    selectSavedAddress(defaultAddress, { autoSave: true })
  }, [address.address1, addressSaved, auth.customer, cart, savedAddresses, selectedAddressId, usingNewAddress])

  const selectSavedAddress = (saved: BuyerCustomerAddress, options?: { autoSave?: boolean }) => {
    const selection = savedAddressToCheckout(saved)
    setUsingNewAddress(false)
    setSelectedAddressId(saved.id)
    setAddress(selection.address)
    setContact((current) => ({ ...current, name: selection.name || current.name, phone: selection.phone || current.phone }))
    setContactTouched(true)
    if (options?.autoSave !== false && cart) {
      void persistCheckoutAddress({ address: selection.address, contact: { ...contact, name: selection.name || contact.name, phone: selection.phone || contact.phone }, selectedId: saved.id })
    }
  }

  const persistCheckoutAddress = async (input?: {
    address?: CheckoutAddress
    contact?: CheckoutContact
    selectedId?: string
  }) => {
    if (!cart) return
    const nextAddress = input?.address ?? address
    const nextContact = input?.contact ?? contact
    setAddressSaving(true)
    setAddressError(undefined)
    setShippingError(undefined)
    try {
      const fullName = (nextContact.name ?? "").trim()
      const [firstName, ...restName] = fullName.split(/\s+/).filter(Boolean)
      const updated = await updateCartAddress(cart.id, {
        email: (nextContact.email ?? "").trim(),
        phone: (nextContact.phone ?? "").trim(),
        shippingAddress: {
          firstName: firstName || fullName || "Customer",
          lastName: restName.join(" ") || firstName || fullName || "Customer",
          address1: nextAddress.address1.trim(),
          address2: nextAddress.address2.trim() || undefined,
          city: nextAddress.city.trim(),
          province: nextAddress.state.trim() || undefined,
          postalCode: nextAddress.postalCode.trim(),
          countryCode: nextAddress.country,
        },
      })
      setCart(updated)
      onCartUpdated(updated)
      setAddressSaved(true)

      if (auth.customer && saveToAddressBook && !input?.selectedId) {
        const refreshed = await createCustomerAddress({
          label: nextAddress.label || "Home",
          firstName: firstName || fullName || "Customer",
          lastName: restName.join(" ") || firstName || fullName || "Customer",
          address1: nextAddress.address1.trim(),
          address2: nextAddress.address2.trim() || undefined,
          city: nextAddress.city.trim(),
          province: nextAddress.state.trim() || undefined,
          postalCode: nextAddress.postalCode.trim(),
          countryCode: nextAddress.country,
          phone: nextContact.phone.trim() || undefined,
          isDefaultShipping: savedAddresses.length === 0,
          isDefaultBilling: false,
        })
        setSavedAddresses(refreshed)
        const created = refreshed.find((entry) =>
          entry.address1 === nextAddress.address1.trim() &&
          entry.city === nextAddress.city.trim() &&
          entry.postalCode === nextAddress.postalCode.trim()
        )
        if (created) setSelectedAddressId(created.id)
      }

      setShippingLoading(true)
      try {
        const shipping = await getCartShippingOptions(updated.id)
        setShippingOptions(shipping.options)
        setRequiresShippingMethod(shipping.requiresShippingMethod)
        const firstAvailable = shipping.options.find((option) => option.available)?.id ?? ""
        setSelectedShippingOptionId(firstAvailable)
        if (!shipping.requiresShippingMethod) {
          setShippingMethodSaved(true)
        } else if (firstAvailable) {
          // Persist shipping immediately so Stripe can create a PaymentIntent.
          await applyShippingOption(updated.id, firstAvailable)
        } else {
          setShippingMethodSaved(false)
        }
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

  const handleSaveAddress = async () => {
    await persistCheckoutAddress()
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

  const handleSelectShippingMethod = async (optionId: string) => {
    if (!cart) return
    try {
      await applyShippingOption(cart.id, optionId)
    } catch {
      // Error UI is handled inside applyShippingOption.
    }
  }

  const handlePlaceOrder = async (
    providerId = selectedPaymentProviderId,
    propagateCompleteError = false,
    stripePaymentMethodLabel?: string
  ) => {
    if (!cart || !canPlaceOrder) return
    setPlacingOrder(true)
    setCompleteError(undefined)
    try {
      const completeOptions = {
        paymentProviderId: providerId,
        storeId: checkoutStoreId,
        platformCheckout: platformCheckoutActive
          ? {
              platformCheckoutId,
              platformCheckoutIndex,
              platformCheckoutCount,
            }
          : undefined,
      }
      const result = auth.customer
        ? (
            await completeCheckoutOrder({
              cart,
              customerId: auth.customer.id,
              bindCustomer: (cartId) => attachCustomerToCart(cartId, { storeId: checkoutStoreId }),
              saveContact: saveContactForCart,
              complete: (cartId) => completeCart(cartId, completeOptions),
            })
          ).result
        : (await completeGuestCheckoutOrder({
            cart,
            saveContact: saveContactForCart,
            complete: (cartId) => completeCart(cartId, completeOptions),
          })).result
      if (!result.email) {
        console.warn("[checkout] complete cart returned an order without email", result)
      }

      const storeId = checkoutStoreId
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
        paymentMethodLabel: stripePaymentMethodLabel ?? result.paymentMethodLabel ?? undefined,
        paymentStatus: result.paymentStatus,
        platformCheckoutId: platformCheckoutActive ? platformCheckoutId : undefined,
        platformCheckoutIndex: platformCheckoutActive ? platformCheckoutIndex : undefined,
        platformCheckoutCount: platformCheckoutActive ? platformCheckoutCount : undefined,
        storeId,
      }

      const cartIdentity = getBuyerCartIdentity(auth.customer?.id, window.localStorage)
      const cartStorageKey = getBuyerCartStorageKey(storeId, cartIdentity)
      const splitKey = `citigoo:${storeId}:split_checkout`
      const splitRaw = window.sessionStorage.getItem(splitKey)
      let split: { sourceCartId?: string; checkoutCartId?: string; selectedLineIds?: string[] } | null = null
      if (splitRaw) {
        try {
          split = JSON.parse(splitRaw) as {
            sourceCartId?: string
            checkoutCartId?: string
            selectedLineIds?: string[]
          }
        } catch (parseError) {
          console.warn("[checkout] invalid split checkout payload", parseError)
          window.sessionStorage.removeItem(splitKey)
        }
      }
      if (split?.checkoutCartId === cart.id && split.sourceCartId) {
        const failedLineIds: string[] = []
        for (const lineId of split.selectedLineIds ?? []) {
          try {
            await deleteCartLineItem(split.sourceCartId, lineId)
          } catch (cleanupError) {
            failedLineIds.push(lineId)
            console.warn("[checkout] unable to remove purchased source line", {
              line_id: lineId,
              cleanupError,
            })
          }
        }
        if (failedLineIds.length) {
          // Keep split state so a later refresh can retry cleanup without losing source cart.
          window.sessionStorage.setItem(
            splitKey,
            JSON.stringify({
              ...split,
              selectedLineIds: failedLineIds,
            })
          )
          window.localStorage.setItem(cartStorageKey, split.sourceCartId)
        } else {
          window.localStorage.setItem(cartStorageKey, split.sourceCartId)
          window.sessionStorage.removeItem(splitKey)
        }
      } else {
        window.localStorage.removeItem(cartStorageKey)
      }
      window.sessionStorage.setItem(`citigoo:${storeId}:checkout_success`, JSON.stringify(successPayload))
      if (platformCheckoutActive) {
        markPlatformCheckoutOrderComplete(storeId, result.orderId)
      }
      onCartUpdated(null)
      const successParams = new URLSearchParams({ order_id: result.orderId })
      if (platformCheckoutActive) successParams.set("platform_checkout", "1")
      window.location.assign(`/checkout/success?${successParams.toString()}`)
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

  const handlePayWithSavedMethod = async (paymentMethodId: string) => {
    if (!cart || placingOrder || !canPlaceOrder) return
    setPlacingOrder(true)
    setCompleteError(undefined)
    let paymentMethodLabel: string | undefined
    try {
      const paid = await payCartWithSavedPaymentMethod(cart.id, paymentMethodId, {
        storeId: checkoutStoreId,
        providerId: selectedPaymentProviderId,
      })
      paymentMethodLabel = paid.payment_method_label
    } catch (reason) {
      setCompleteError(reason instanceof Error ? reason.message : "Unable to pay with saved card.")
      setPlacingOrder(false)
      return
    }
    setPlacingOrder(false)
    await handlePlaceOrder(selectedPaymentProviderId, true, paymentMethodLabel)
  }

  return (
    <PageShell className="buyer-checkout-page" contentClassName="buyer-checkout-shell-content" header={<StoreTopBar settings={settings} cartCount={cartCount} />} footer={<StoreFooter />}>
      <header className="buyer-checkout-page-header">
        <div>
          <p>Secure checkout</p>
          <h1>Checkout</h1>
          <span>
            {platformCheckoutActive
              ? `Platform checkout · store ${platformCheckoutIndex + 1} of ${platformCheckoutCount}`
              : "Review your contact, delivery, and order summary."}
          </span>
        </div>
        <a href={platformCheckoutActive ? "/checkout/platform" : "/cart"}>
          {platformCheckoutActive ? "Back to platform checkout" : "Back to cart"}
        </a>
      </header>
      <CheckoutPageStatus loading={loading} error={error} empty={!cart || !cart.items.length} onRetry={() => setLoadVersion((version) => version + 1)} />
      {!loading && !error && cart?.items.length ? (
          <section className="buyer-checkout-layout">
            <div className="buyer-checkout-left">
              {completeError ? <CheckoutCompleteError message={completeError} /> : null}
              <CheckoutAddressCard
                value={address}
                onChange={(next) => { setUsingNewAddress(true); setSelectedAddressId(""); setAddress(next); setAddressSaved(false) }}
                onSave={() => void handleSaveAddress()}
                required={requiresShippingMethod}
                saving={addressSaving}
                saved={addressSaved}
                error={addressError}
                savedAddresses={savedAddresses}
                selectedAddressId={selectedAddressId}
                onSelectSavedAddress={(saved) => selectSavedAddress(saved)}
                onUseNewAddress={() => { setUsingNewAddress(true); setSelectedAddressId(""); setAddress(initialAddress); setAddressSaved(false) }}
                saveToAddressBook={saveToAddressBook}
                onSaveToAddressBookChange={setSaveToAddressBook}
                canSaveToAddressBook={Boolean(auth.customer && !selectedAddressId)}
                contact={contact}
                onContactChange={(nextContact) => { setContactTouched(true); setContact(nextContact) }}
                onSaveContact={() => { void handleSaveContact().catch(() => undefined) }}
                contactStatus={contactStatus}
                contactError={contactError}
                emailVerified={emailVerified}
              />
              <CheckoutShippingCard required={requiresShippingMethod} addressSaved={addressSaved} loading={shippingLoading} error={shippingError} options={shippingOptions} selectedId={selectedShippingOptionId} methodSaved={shippingMethodSaved} onSelect={(id) => void handleSelectShippingMethod(id)} />
              <CheckoutPaymentPanel
                providers={paymentProviders}
                selectedProviderId={selectedPaymentProviderId}
                onProviderChange={(providerId) => {
                  setSelectedPaymentProviderId(providerId)
                  setPaymentSession(null)
                  setPaymentError(undefined)
                }}
                session={paymentSession}
                stripePublishableKey={stripePublishableKey}
                preparing={paymentPreparing}
                waitingForShipping={requiresShippingMethod && !shippingMethodSaved}
                error={paymentError}
                canSubmit={canPlaceOrder}
                placing={placingOrder}
                savedPaymentMethods={savedPaymentMethods}
                selectedSavedPaymentMethodId={selectedSavedPaymentMethodId}
                onSavedPaymentMethodChange={setSelectedSavedPaymentMethodId}
                onStripeComplete={(paymentMethodLabel) =>
                  handlePlaceOrder(selectedPaymentProviderId, true, paymentMethodLabel)
                }
              />
            </div>
            <CheckoutSummaryCard
              cart={cart}
              canPlaceOrder={canPlaceOrder && (!stripeSelected || Boolean(selectedSavedPaymentMethodId))}
              disabledReason={
                stripeSelected && canPlaceOrder && !selectedSavedPaymentMethodId
                  ? "Confirm payment in Step 3, or choose a saved card."
                  : placeOrderDisabledReason
              }
              onPlaceOrder={() => {
                if (selectedSavedPaymentMethodId) {
                  void handlePayWithSavedMethod(selectedSavedPaymentMethodId)
                  return
                }
                void handlePlaceOrder()
              }}
              placing={placingOrder}
              shippingAmount={shippingMethodSaved ? selectedShippingOption?.amount ?? 0 : undefined}
            />
          </section>
      ) : null}
    </PageShell>
  )
}
