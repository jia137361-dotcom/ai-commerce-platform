import { useEffect, useMemo, useRef, useState } from "react"
import type { CheckoutAddress } from "../../components/checkout/CheckoutAddressPanel"
import { CheckoutAddressCard } from "../../components/checkout/CheckoutAddressCard"
import type { CheckoutContact } from "../../components/checkout/CheckoutContactForm"
import { CheckoutCompleteError } from "../../components/checkout/CheckoutCompleteError"
import { CheckoutPageStatus } from "../../components/checkout/CheckoutPageStatus"
import { CheckoutPaymentPanel } from "../../components/checkout/CheckoutPaymentPanel"
import { CheckoutPaymentRecoveryBanner } from "../../components/checkout/CheckoutPaymentRecoveryBanner"
import { CheckoutExpiredPaymentModal } from "../../components/checkout/CheckoutExpiredPaymentModal"
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
  getScopedBuyerStoreId,
  getPayPalClientId,
  getMyOrders,
  getStripePublishableKey,
  initializeCartPaymentRecovery,
  listCartPaymentProviders,
  listCustomerAddresses,
  listCustomerPaymentMethods,
  payCartWithSavedPaymentMethod,
  payCartWithSavedPayPalPaymentMethod,
  readBuyerPreferences,
  reserveCheckoutPayment,
  reorderItemsToCheckout,
  selectCartShippingMethod,
  setActiveBuyerStoreId,
  updateCartAddress,
  updateCartContact,
  applyCartCoupon,
  clearCartCoupon,
  fetchCartCouponPricing,
  fetchMyCoupons,
  type CartShippingOption,
  type BuyerCoupon,
  type BuyerPaymentMethod,
  type BuyerPaymentProvider,
  type BuyerPaymentRecovery,
  type BuyerPaymentSession,
  type BuyerStoreSettings,
  type BuyerCustomerAddress,
  type BuyerCustomerAddressInput,
  type BuyerOrderSummary,
  type CheckoutPricingBreakdown,
} from "../../lib/buyer-api"
import { buildSettingsStoreHref } from "../../lib/storefront-links"
import { isBuyerEmailVerified } from "../../lib/buyer-preferences"
import type { StoreCart } from "../../lib/mock-data"
import { completeCheckoutOrder, completeGuestCheckoutOrder } from "./checkout-action"
import { resolveCheckoutState } from "./checkout-state"
import { getBuyerCartIdentity, resolveBuyerCartStorageId } from "../../lib/buyer-cart-storage"
import { registerStoreCart, unregisterStoreCart } from "../../lib/buyer-platform-cart"
import {
  markPlatformCheckoutOrderComplete,
  nextPendingPlatformCheckoutGroup,
  readPlatformCheckoutSession,
} from "../../lib/platform-checkout-session"
import { isCheckoutCountryCode, shippingUnavailableMessage } from "./checkout-countries"
import { collectReorderLinesFromSummary } from "../orders/order-history-display"
import {
  chooseDefaultPaymentProvider,
  hasValidStripeClientSecret,
  isPayPalProviderId,
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

export function CheckoutPage({ onCartUpdated }: CheckoutPageProps) {
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
  const [paymentRecovery, setPaymentRecovery] = useState<BuyerPaymentRecovery | null>(null)
  const [paymentPreparing, setPaymentPreparing] = useState(false)
  const [paymentError, setPaymentError] = useState<string | undefined>()
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<BuyerPaymentMethod[]>([])
  const [selectedSavedPaymentMethodId, setSelectedSavedPaymentMethodId] = useState<string | null>(null)
  const [completeError, setCompleteError] = useState<string | undefined>()
  const [loadVersion, setLoadVersion] = useState(0)
  const [walletCoupons, setWalletCoupons] = useState<BuyerCoupon[]>([])
  const [couponsLoading, setCouponsLoading] = useState(false)
  const [checkoutPricing, setCheckoutPricing] = useState<CheckoutPricingBreakdown | null>(null)
  const [couponError, setCouponError] = useState<string | undefined>()
  const [checkoutHeaderCartCount, setCheckoutHeaderCartCount] = useState(0)
  const [expiredReservationOrder, setExpiredReservationOrder] = useState<BuyerOrderSummary | null>(null)
  const [expiredReservationLoading, setExpiredReservationLoading] = useState(false)
  const [expiredReservationError, setExpiredReservationError] = useState<string>()
  const [expiredReservationReordering, setExpiredReservationReordering] = useState(false)
  const skipAddressResetRef = useRef(false)
  const shippingSelectGenerationRef = useRef(0)
  const autoAppliedAddressRef = useRef("")
  const placeOrderInFlightRef = useRef(false)
  const recoveredCompletionAttemptRef = useRef("")
  const expiredAttemptRefreshRef = useRef("")

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
  const paypalClientId = getPayPalClientId()
  const stripeSelected = isStripeProviderId(selectedPaymentProviderId)
  const paypalSelected = isPayPalProviderId(selectedPaymentProviderId)
  const recoveryAction = paymentRecovery?.paymentAttempt.recoveryAction ?? "confirm_payment"
  const paymentSessionReady =
    (!stripeSelected && !paypalSelected) ||
    recoveryAction === "complete_order" ||
    (recoveryAction === "confirm_payment" &&
      (paypalSelected
        ? Boolean(paymentSession?.paypalOrderId)
        : hasValidStripeClientSecret(paymentSession) || Boolean(selectedSavedPaymentMethodId)))
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
  const { canPlaceOrder } = checkoutState
  const selectedShippingOption = shippingOptions.find((option) => option.id === selectedShippingOptionId)
  const checkoutSearchParams = useMemo(() => new URLSearchParams(window.location.search), [])
  const checkoutStoreId = checkoutSearchParams.get("store")?.trim() || getScopedBuyerStoreId()
  const checkoutCartIdParam = checkoutSearchParams.get("cart_id")?.trim() || ""
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
      const cartId = checkoutCartIdParam || resolved.cartId
      setCheckoutHeaderCartCount(0)
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

        if (checkoutCartIdParam) {
          const splitKey = `citigoo:${checkoutStoreId}:split_checkout`
          const splitRaw =
            window.sessionStorage.getItem(splitKey) ??
            window.localStorage.getItem(splitKey)
          if (splitRaw) {
            try {
              const split = JSON.parse(splitRaw) as { sourceCartId?: string; checkoutCartId?: string }
              if (split.checkoutCartId === checkoutCartIdParam && split.sourceCartId) {
                const sourceCart = await fetchCart(split.sourceCartId, { storeId: checkoutStoreId })
                if (!active) return
                setCheckoutHeaderCartCount(sourceCart.items.reduce((sum, item) => sum + item.quantity, 0))
              }
            } catch (splitError) {
              console.warn("[checkout] unable to read split source cart count", splitError)
            }
          }
        }

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
          // Provider discovery runs again when checkout data is refreshed. Do
          // not silently replace an active PayPal choice with Stripe.
          setSelectedPaymentProviderId((current) =>
            providers.some((provider) => provider.id === current)
              ? current
              : chooseDefaultPaymentProvider(providers, stripePublishableKey)
          )
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
  }, [auth.customer, checkoutCartIdParam, loadVersion, onCartUpdated])

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
    setPaymentRecovery(null)
    setPaymentError(undefined)
  }, [contact, address])

  useEffect(() => {
    if (!cart?.id || !auth.customer || !selectedPaymentProviderId) return
    let active = true
    void reserveCheckoutPayment(cart.id, selectedPaymentProviderId, { storeId: checkoutStoreId })
      .then((recovery) => {
        if (!active) return
        setPaymentRecovery(recovery)
        window.dispatchEvent(new Event("citigoo:cart-reserved"))
      })
      .catch((reason) => {
        if (!active) return
        console.warn("[checkout] unable to reserve unpaid checkout", reason)
      })
    return () => {
      active = false
    }
  }, [auth.customer, cart?.id, checkoutStoreId, selectedPaymentProviderId])

  useEffect(() => {
    if ((!stripeSelected && !paypalSelected) || !cart || (requiresShippingMethod && !shippingMethodSaved)) {
      setPaymentSession(null)
      if (!paymentRecovery && (stripeSelected || paypalSelected) && cart && requiresShippingMethod && !shippingMethodSaved) {
        setPaymentError(undefined)
      }
      return
    }
    if (stripeSelected && !isValidStripePublishableKey(stripePublishableKey)) {
      setPaymentSession(null)
      setPaymentError("VITE_STRIPE_PK must be configured with a Stripe publishable key (pk_test_ or pk_live_).")
      return
    }
    let active = true
    setPaymentPreparing(true)
    setPaymentError(undefined)
    const initializeSession = async () => {
      try {
        return await initializeCartPaymentRecovery(cart.id, selectedPaymentProviderId, { storeId: checkoutStoreId })
      } catch (value) {
        const message = value instanceof Error ? value.message : ""
        if (!message.includes("client_secret")) throw value
        await new Promise((resolve) => window.setTimeout(resolve, 400))
        return initializeCartPaymentRecovery(cart.id, selectedPaymentProviderId, { storeId: checkoutStoreId })
      }
    }
    void initializeSession()
      .then((recovery) => {
        if (!active) return
        setPaymentRecovery(recovery)
        setPaymentSession(recovery.paymentSession)
        if (recovery.paymentAttempt.recoveryAction === "completed" && recovery.orderId) {
          const successParams = new URLSearchParams({ order_id: recovery.orderId })
          if (platformCheckoutActive) successParams.set("platform_checkout", "1")
          window.location.assign(`/checkout/success?${successParams.toString()}`)
        }
      })
      .catch((value) => {
        if (active) {
          setPaymentSession(null)
          const message = value instanceof Error ? value.message : "Unable to initialize payment."
          setPaymentError(message.includes("client_secret") ? "Payment session is still being prepared. Choose the delivery address again or reload checkout." : message)
        }
      })
      .finally(() => { if (active) setPaymentPreparing(false) })
    return () => { active = false }
  }, [cart?.id, cart?.total, checkoutStoreId, paypalSelected, platformCheckoutActive, requiresShippingMethod, selectedPaymentProviderId, shippingMethodSaved, stripePublishableKey, stripeSelected])

  useEffect(() => {
    if (recoveryAction !== "expired" || !cart?.id || !auth.customer) return
    let active = true
    setExpiredReservationLoading(true)
    setExpiredReservationError(undefined)
    void getMyOrders({ bucket: "unpaid", scope: "platform", limit: 100, offset: 0 })
      .then((page) => {
        if (!active) return
        setExpiredReservationOrder(page.orders.find((order) => order.checkoutCartId === cart.id) ?? null)
      })
      .catch((reason) => {
        if (!active) return
        setExpiredReservationOrder(null)
        setExpiredReservationError(reason instanceof Error ? reason.message : "Unable to find the unpaid order.")
      })
      .finally(() => {
        if (active) setExpiredReservationLoading(false)
      })
    return () => { active = false }
  }, [auth.customer, cart?.id, recoveryAction])

  useEffect(() => {
    const attempt = paymentRecovery?.paymentAttempt
    const expiresAt = attempt?.expiresAt
    if (
      !cart?.id ||
      !expiresAt ||
      recoveryAction === "expired" ||
      recoveryAction === "completed" ||
      recoveryAction === "complete_order"
    ) {
      return undefined
    }
    const expiresAtMs = Date.parse(expiresAt)
    if (!Number.isFinite(expiresAtMs)) return undefined
    const refreshKey = `${attempt.id}:${expiresAt}`
    const refreshExpiredAttempt = () => {
      if (expiredAttemptRefreshRef.current === refreshKey) return
      expiredAttemptRefreshRef.current = refreshKey
      void initializeCartPaymentRecovery(cart.id, selectedPaymentProviderId, { storeId: checkoutStoreId })
        .then((recovery) => {
          setPaymentRecovery(recovery)
          setPaymentSession(recovery.paymentSession)
        })
        .catch((reason) => console.warn("[checkout] unable to mark payment attempt expired", reason))
    }
    const timeout = window.setTimeout(refreshExpiredAttempt, Math.max(0, expiresAtMs - Date.now()) + 50)
    return () => window.clearTimeout(timeout)
  }, [cart?.id, checkoutStoreId, paymentRecovery?.paymentAttempt, recoveryAction, selectedPaymentProviderId])

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
      const defaultAddress = addresses.find((entry) => entry.isDefaultShipping)
      if (defaultAddress && !address.address1) {
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
    if (!cart?.id || !auth.customer) {
      setWalletCoupons([])
      setCheckoutPricing(null)
      return
    }
    let active = true
    setCouponsLoading(true)
    void Promise.all([fetchMyCoupons("all"), fetchCartCouponPricing(cart.id)])
      .then(([coupons, pricing]) => {
        if (!active) return
        setWalletCoupons(coupons)
        setCheckoutPricing(pricing)
        setCouponError(undefined)
      })
      .catch((reason) => {
        if (!active) return
        setCouponError(reason instanceof Error ? reason.message : "Unable to load coupons")
      })
      .finally(() => {
        if (active) setCouponsLoading(false)
      })
    return () => {
      active = false
    }
  }, [auth.customer?.id, cart?.id, shippingMethodSaved, cart?.total])

  const selectedSavedAddress =
    savedAddresses.find((entry) => entry.id === selectedAddressId) ??
    (selectedAddressId ? null : savedAddresses.find((entry) => entry.isDefaultShipping)) ??
    null

  const contactForSavedAddress = (saved: BuyerCustomerAddress): CheckoutContact => {
    const selection = savedAddressToCheckout(saved)
    return {
      email: (contact.email || cart?.email || auth.customer?.email || "").trim(),
      phone: (selection.phone || contact.phone || auth.customer?.phone || "").trim(),
      name: (selection.name || contact.name || [auth.customer?.firstName, auth.customer?.lastName].filter(Boolean).join(" ")).trim(),
    }
  }

  const validateDeliverySelection = (nextContact: CheckoutContact, nextAddress: CheckoutAddress) => {
    setContactError(undefined)
    setAddressError(undefined)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((nextContact.email ?? "").trim())) {
      setContactError("Enter a valid email address.")
      return false
    }
    if ((nextContact.phone ?? "").trim().length < 4) {
      setContactError("Enter a phone number for delivery updates.")
      return false
    }
    if ((nextContact.name ?? "").trim().length <= 1) {
      setAddressError("Enter the receiver name.")
      return false
    }
    if (requiresShippingMethod) {
      if (!isCheckoutCountryCode(nextAddress.country) || !nextAddress.city.trim() || !nextAddress.postalCode.trim() || !nextAddress.address1.trim()) {
        setAddressError("Choose a complete delivery address.")
        return false
      }
    }
    return true
  }

  const persistCheckoutAddress = async (input?: {
    cart?: StoreCart
    address?: CheckoutAddress
    contact?: CheckoutContact
    selectedId?: string
  }) => {
    const targetCart = input?.cart ?? cart
    if (!targetCart) throw new Error("Checkout cart is unavailable.")
    const nextAddress = input?.address ?? address
    const nextContact = input?.contact ?? contact
    setAddressSaving(true)
    setAddressError(undefined)
    setShippingError(undefined)
    try {
      const fullName = (nextContact.name ?? "").trim()
      const [firstName, ...restName] = fullName.split(/\s+/).filter(Boolean)
      const updated = await updateCartAddress(targetCart.id, {
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

      if (auth.customer && !input?.selectedId) {
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

      return updated
    } catch (saveError) {
      setAddressError(saveError instanceof Error ? saveError.message : "Unable to save delivery address.")
      setAddressSaved(false)
      throw saveError
    } finally {
      setAddressSaving(false)
    }
  }

  const loadShippingOptionsForCart = async (targetCart: StoreCart) => {
    setShippingLoading(true)
    setShippingError(undefined)
    try {
      const shipping = await getCartShippingOptions(targetCart.id)
      setShippingOptions(shipping.options)
      setRequiresShippingMethod(shipping.requiresShippingMethod)
      setSelectedShippingOptionId("")
      setShippingMethodSaved(!shipping.requiresShippingMethod)
      return shipping
    } catch (shippingLoadError) {
      setShippingOptions([])
      setRequiresShippingMethod(true)
      setShippingMethodSaved(false)
      setShippingError(shippingUnavailableMessage(shippingLoadError))
      throw shippingLoadError
    } finally {
      setShippingLoading(false)
    }
  }

  const applySavedAddressToCheckout = async (saved: BuyerCustomerAddress) => {
    if (!cart) return
    autoAppliedAddressRef.current = `${cart.id}:${saved.id}`
    const selection = savedAddressToCheckout(saved)
    const nextContact = contactForSavedAddress(saved)
    setCompleteError(undefined)
    setContactError(undefined)
    setAddressError(undefined)
    setShippingError(undefined)
    setShippingMethodSaved(false)
    setPaymentSession(null)
    setPaymentError(undefined)
    skipAddressResetRef.current = true
    setSelectedAddressId(saved.id)
    setAddress(selection.address)
    setContact(nextContact)
    setContactTouched(true)
    if (!validateDeliverySelection(nextContact, selection.address)) {
      setAddressSaved(false)
      return
    }
    try {
      const contactCart = await saveContactForCart(cart, nextContact)
      const addressCart = await persistCheckoutAddress({
        cart: contactCart,
        address: selection.address,
        contact: nextContact,
        selectedId: saved.id,
      })
      const reloaded = await fetchCart(addressCart.id, { storeId: checkoutStoreId })
      setCart(reloaded)
      onCartUpdated(reloaded)
      const shipping = await loadShippingOptionsForCart(reloaded)
      if (shipping.requiresShippingMethod) {
        const firstAvailable = shipping.options.find((option) => option.available)
        if (!firstAvailable) {
          const message = "No shipping service is available for this delivery address."
          setShippingError(message)
          throw new Error(message)
        }
        await applyShippingOption(reloaded.id, firstAvailable.id)
      }
    } catch (reason) {
      setAddressError(reason instanceof Error ? reason.message : "Unable to apply delivery address.")
      throw reason
    }
  }

  const createAndApplyAddress = async (input: BuyerCustomerAddressInput) => {
    const refreshed = await createCustomerAddress(input)
    setSavedAddresses(refreshed)
    const created =
      input.id ? refreshed.find((entry) => entry.id === input.id) : undefined
    const matched =
      created ??
      refreshed.find((entry) =>
        entry.address1 === input.address1.trim() &&
        entry.city === input.city.trim() &&
        entry.postalCode === input.postalCode.trim() &&
        entry.countryCode === input.countryCode.trim().toLowerCase()
      ) ??
      refreshed.find((entry) => entry.isDefaultShipping) ??
      refreshed[0]
    if (matched) {
      await applySavedAddressToCheckout(matched)
    }
  }

  const saveContactForCart = async (targetCart: StoreCart, nextContact = contact) => {
    setContactStatus("saving")
    setContactError(undefined)
    try {
      const updated = await updateCartContact(targetCart.id, {
        email: nextContact.email.trim(),
        phone: nextContact.phone.trim() || undefined,
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

  useEffect(() => {
    if (!cart?.id || !auth.customer || !selectedSavedAddress || loading) return
    const applyKey = `${cart.id}:${selectedSavedAddress.id}`
    if (autoAppliedAddressRef.current === applyKey) return
    autoAppliedAddressRef.current = applyKey
    void applySavedAddressToCheckout(selectedSavedAddress).catch((reason) => {
      console.warn("[checkout] unable to auto-apply default delivery address", reason)
    })
  }, [auth.customer, cart?.id, loading, selectedSavedAddress])

  const handlePlaceOrder = async (
    providerId = selectedPaymentProviderId,
    propagateCompleteError = false,
    stripePaymentMethodLabel?: string
  ) => {
    if (placeOrderInFlightRef.current || !cart || !canPlaceOrder) return
    placeOrderInFlightRef.current = true
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
      const splitKey = `citigoo:${storeId}:split_checkout`
      const splitRaw =
        window.sessionStorage.getItem(splitKey) ??
        window.localStorage.getItem(splitKey)
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
          window.localStorage.removeItem(splitKey)
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
          window.localStorage.setItem(
            splitKey,
            JSON.stringify({
              ...split,
              selectedLineIds: failedLineIds,
            })
          )
          window.sessionStorage.setItem(
            splitKey,
            JSON.stringify({
              ...split,
              selectedLineIds: failedLineIds,
            })
          )
          registerStoreCart(window.localStorage, cartIdentity, storeId, split.sourceCartId)
        } else {
          registerStoreCart(window.localStorage, cartIdentity, storeId, split.sourceCartId)
          window.sessionStorage.removeItem(splitKey)
          window.localStorage.removeItem(splitKey)
        }
      } else {
        unregisterStoreCart(window.localStorage, cartIdentity, storeId)
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
      if (propagateCompleteError && cart && isStripeProviderId(providerId)) {
        try {
          const recovery = await initializeCartPaymentRecovery(cart.id, providerId, { storeId: checkoutStoreId })
          setPaymentRecovery(recovery)
          setPaymentSession(recovery.paymentSession)
        } catch (recoveryError) {
          console.error("[checkout] unable to refresh confirmed Stripe payment", recoveryError)
        }
      }
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
      placeOrderInFlightRef.current = false
    }
  }

  useEffect(() => {
    if (!cart || recoveryAction !== "complete_order" || placeOrderInFlightRef.current) return
    const attemptId = paymentRecovery?.paymentAttempt.id
    if (!attemptId || recoveredCompletionAttemptRef.current === attemptId) return
    recoveredCompletionAttemptRef.current = attemptId
    void handlePlaceOrder(selectedPaymentProviderId)
  }, [cart, paymentRecovery?.paymentAttempt.id, recoveryAction, selectedPaymentProviderId])

  const handlePayWithSavedMethod = async (paymentMethodId: string) => {
    if (placeOrderInFlightRef.current || !cart || placingOrder || !canPlaceOrder) return
    placeOrderInFlightRef.current = true
    setPlacingOrder(true)
    setCompleteError(undefined)
    let paymentMethodLabel: string | undefined
    try {
      const method = savedPaymentMethods.find((item) => item.id === paymentMethodId)
      const paid = method?.provider === "paypal"
        ? await payCartWithSavedPayPalPaymentMethod(cart.id, paymentMethodId, {
            storeId: checkoutStoreId,
            providerId: selectedPaymentProviderId,
          })
        : await payCartWithSavedPaymentMethod(cart.id, paymentMethodId, {
            storeId: checkoutStoreId,
            providerId: selectedPaymentProviderId,
          })
      paymentMethodLabel = paid.payment_method_label
    } catch (reason) {
      setCompleteError(reason instanceof Error ? reason.message : "Unable to pay with saved card.")
      setPlacingOrder(false)
      placeOrderInFlightRef.current = false
      return
    }
    setPlacingOrder(false)
    placeOrderInFlightRef.current = false
    await handlePlaceOrder(selectedPaymentProviderId, true, paymentMethodLabel)
  }

  const returnFromExpiredCheckout = () => {
    window.location.assign("/account/orders")
  }

  const reorderExpiredCheckout = async () => {
    if (!expiredReservationOrder || expiredReservationReordering) return
    const lines = collectReorderLinesFromSummary(expiredReservationOrder)
    if (!lines.length) {
      setExpiredReservationError("This unpaid order has no purchasable items to reorder.")
      return
    }
    setExpiredReservationReordering(true)
    setExpiredReservationError(undefined)
    try {
      const { checkoutHref } = await reorderItemsToCheckout({
        storeId: expiredReservationOrder.storeId?.trim() || checkoutStoreId,
        countryCode: readBuyerPreferences(auth.customer).countryCode,
        items: lines,
        customerId: auth.customer?.id ?? null,
      })
      window.location.assign(checkoutHref)
    } catch (reason) {
      setExpiredReservationError(reason instanceof Error ? reason.message : "Unable to prepare reorder.")
      setExpiredReservationReordering(false)
    }
  }

  const storeHref = buildSettingsStoreHref(settings)

  return (
    <PageShell
      className="buyer-checkout-page"
      contentClassName="buyer-checkout-shell-content"
      header={<StoreTopBar settings={settings} cartCount={checkoutHeaderCartCount} />}
      footer={<StoreFooter />}
      cartCount={checkoutHeaderCartCount}
      storeHref={storeHref}
    >
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
                onSave={() => {
                  if (!selectedSavedAddress) return
                  void applySavedAddressToCheckout(selectedSavedAddress).catch(() => undefined)
                }}
                required={requiresShippingMethod}
                saving={addressSaving || shippingLoading}
                saved={addressSaved}
                error={addressError || shippingError}
                savedAddresses={savedAddresses}
                selectedAddressId={selectedAddressId}
                onSelectSavedAddress={(saved) => void applySavedAddressToCheckout(saved).catch(() => undefined)}
                onCreateAddress={auth.customer ? createAndApplyAddress : undefined}
                contact={contact}
                contactStatus={contactStatus}
                contactError={contactError}
                emailVerified={emailVerified}
              />
              <CheckoutSummaryCard
                cart={cart}
                canPlaceOrder={
                  canPlaceOrder &&
                  !paypalSelected &&
                  (!stripeSelected ||
                    (Boolean(selectedSavedPaymentMethodId) && recoveryAction === "confirm_payment"))
                }
                showPayButton={!paypalSelected && !stripeSelected}
                onPlaceOrder={() => {
                  if (selectedSavedPaymentMethodId) {
                    void handlePayWithSavedMethod(selectedSavedPaymentMethodId)
                    return
                  }
                  void handlePlaceOrder()
                }}
                placing={placingOrder}
                shippingAmount={shippingMethodSaved ? selectedShippingOption?.amount ?? 0 : undefined}
                pricing={checkoutPricing}
                coupons={walletCoupons}
                couponsLoading={couponsLoading}
                couponError={couponError}
                onApplyCoupon={(walletId) => {
                  if (!cart) return
                  setCouponError(undefined)
                  void applyCartCoupon(cart.id, walletId)
                    .then((pricing) => {
                      setCheckoutPricing(pricing)
                      return fetchMyCoupons("all")
                    })
                    .then(setWalletCoupons)
                    .catch((reason) => {
                      setCouponError(reason instanceof Error ? reason.message : "Unable to apply coupon")
                    })
                }}
                onClearCoupon={() => {
                  if (!cart) return
                  setCouponError(undefined)
                  void clearCartCoupon(cart.id)
                    .then((pricing) => {
                      setCheckoutPricing(pricing)
                      return fetchMyCoupons("all")
                    })
                    .then(setWalletCoupons)
                    .catch((reason) => {
                    setCouponError(reason instanceof Error ? reason.message : "Unable to clear coupon")
                    })
                }}
              />
              <CheckoutPaymentPanel
                providers={paymentProviders}
                selectedProviderId={selectedPaymentProviderId}
                onProviderChange={(providerId) => {
                  if (providerId === selectedPaymentProviderId) return
                  setSelectedPaymentProviderId(providerId)
                  setPaymentSession(null)
                  setPaymentRecovery(null)
                  setPaymentError(undefined)
                }}
                session={paymentSession}
                stripePublishableKey={stripePublishableKey}
                paypalClientId={paypalClientId}
                currencyCode={cart.currencyCode}
                amountMinor={Number.isFinite(cart.total) ? Math.round(cart.total * 100) : undefined}
                preparing={paymentPreparing}
                waitingForShipping={requiresShippingMethod && !shippingMethodSaved}
                error={paymentError}
                canSubmit={canPlaceOrder && paymentSessionReady}
                placing={placingOrder}
                savedPaymentMethods={savedPaymentMethods}
                selectedSavedPaymentMethodId={selectedSavedPaymentMethodId}
                onSavedPaymentMethodChange={setSelectedSavedPaymentMethodId}
                onPayWithSavedPaymentMethod={(paymentMethodId) => void handlePayWithSavedMethod(paymentMethodId)}
                recoveryAction={recoveryAction}
                onStripeComplete={(paymentMethodLabel) =>
                  handlePlaceOrder(selectedPaymentProviderId, true, paymentMethodLabel)
                }
                onPayPalComplete={() => handlePlaceOrder(selectedPaymentProviderId, true)}
                onPaymentError={(message) => setPaymentError(message || undefined)}
              />
              <CheckoutPaymentRecoveryBanner
                attempt={paymentRecovery?.paymentAttempt ?? null}
              />
              <CheckoutExpiredPaymentModal
                open={recoveryAction === "expired"}
                order={expiredReservationOrder}
                loading={expiredReservationLoading}
                error={expiredReservationError}
                reordering={expiredReservationReordering}
                onReturn={returnFromExpiredCheckout}
                onReorder={() => void reorderExpiredCheckout()}
              />
            </div>
          </section>
      ) : null}
    </PageShell>
  )
}
