import { useEffect, useState } from "react"
import type { StoreCart } from "./lib/mock-data"
import { fetchCart, getBuyerCartStorageKey, getBuyerStoreId } from "./lib/buyer-api"
import { CartPage } from "./pages/cart/CartPage"
import { CheckoutPage } from "./pages/checkout/CheckoutPage"
import { CheckoutSuccessPage } from "./pages/checkout/CheckoutSuccessPage"
import { AccountHomePage } from "./pages/account/AccountHomePage"
import { AccountProfilePage } from "./pages/account/AccountProfilePage"
import { RegisterPage } from "./pages/account/RegisterPage"
import { SignInPage } from "./pages/account/SignInPage"
import { AccountSettingPlaceholderPage } from "./pages/account/AccountSettingPlaceholderPage"
import { findAccountSettingPlaceholder } from "./pages/account/account-setting-placeholders"
import { AccountSettingsPage, type AccountSettingsSlug } from "./pages/account/AccountSettingsPage"
import { OrderDetailPage } from "./pages/orders/OrderDetailPage"
import { StoreMessagesPage } from "./pages/account/StoreMessagesPage"
import { OrderHistoryPage } from "./pages/orders/OrderHistoryPage"
import { OrderLookupPage } from "./pages/orders/OrderLookupPage"
import { OrderTrackingPage } from "./pages/orders/OrderTrackingPage"
import { ProductDetailPage } from "./pages/product/ProductDetailPage"
import { StoreHomePage } from "./pages/store/StoreHomePage"
import { HelpPage, PrivacyPage, TermsPage } from "./pages/info/InfoPage"
import { useBuyerAuth } from "./auth/useBuyerAuth"
import { getBuyerCartIdentity, removeLegacySharedCartKey } from "./lib/buyer-cart-storage"

function App() {
  const auth = useBuyerAuth()
  const [path, setPath] = useState(window.location.pathname)
  const [cartCount, setCartCount] = useState(0)

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])

  const refreshCartCount = async () => {
    const storeId = getBuyerStoreId()
    removeLegacySharedCartKey(storeId, window.localStorage)
    const identity = getBuyerCartIdentity(auth.customer?.id, window.localStorage)
    const cartId = window.localStorage.getItem(getBuyerCartStorageKey(storeId, identity))
    if (!cartId) {
      setCartCount(0)
      return
    }
    try {
      const cart = await fetchCart(cartId)
      setCartCount(cart.items.reduce((sum, item) => sum + item.quantity, 0))
    } catch {
      setCartCount(0)
    }
  }

  useEffect(() => {
    void refreshCartCount()
  }, [auth.customer?.id])

  const onCartUpdated = (cart: StoreCart | null) => {
    setCartCount(cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0)
  }

  if (path.startsWith("/products/")) {
    return (
      <ProductDetailPage
        productId={decodeURIComponent(path.split("/").pop() ?? "")}
        cartCount={cartCount}
        onCartUpdated={onCartUpdated}
      />
    )
  }

  if (path.startsWith("/cart")) {
    return <CartPage onCartUpdated={onCartUpdated} />
  }

  if (path.startsWith("/checkout/success")) {
    return <CheckoutSuccessPage cartCount={cartCount} />
  }

  if (path.startsWith("/checkout")) {
    return <CheckoutPage cartCount={cartCount} onCartUpdated={onCartUpdated} />
  }

  if (path.startsWith("/orders/lookup")) {
    return <OrderLookupPage cartCount={cartCount} />
  }

  if (path.startsWith("/account/sign-in")) {
    return <SignInPage cartCount={cartCount} />
  }

  if (path.startsWith("/account/register")) {
    return <RegisterPage cartCount={cartCount} />
  }

  const realAccountSetting = (["addresses", "payment-methods", "country-region", "currency", "coupons", "following"] as AccountSettingsSlug[])
    .find((slug) => path === `/account/${slug}`)
  if (realAccountSetting) {
    return <AccountSettingsPage cartCount={cartCount} slug={realAccountSetting} />
  }

  const accountSettingPlaceholder = findAccountSettingPlaceholder(path)
  if (accountSettingPlaceholder) {
    return <AccountSettingPlaceholderPage cartCount={cartCount} setting={accountSettingPlaceholder} />
  }

  if (path.startsWith("/account/profile")) {
    return <AccountProfilePage cartCount={cartCount} />
  }

  if (path.startsWith("/account/messages")) {
    const orderId = new URLSearchParams(window.location.search).get("orderId") ?? undefined
    return <StoreMessagesPage cartCount={cartCount} orderId={orderId} />
  }

  if (path.startsWith("/account/orders/") && path.endsWith("/tracking")) {
    return <OrderTrackingPage orderId={decodeURIComponent(path.split("/")[3] ?? "")} cartCount={cartCount} />
  }

  if (path.startsWith("/account/orders/")) {
    return <OrderDetailPage orderId={decodeURIComponent(path.split("/")[3] ?? "")} cartCount={cartCount} />
  }

  if (path.startsWith("/account/orders")) {
    return <OrderHistoryPage cartCount={cartCount} />
  }

  if (path === "/account" || path.startsWith("/account?")) {
    return <AccountHomePage cartCount={cartCount} />
  }

  if (path.startsWith("/help")) {
    return <HelpPage cartCount={cartCount} />
  }

  if (path.startsWith("/terms")) {
    return <TermsPage cartCount={cartCount} />
  }

  if (path.startsWith("/privacy")) {
    return <PrivacyPage cartCount={cartCount} />
  }

  return <StoreHomePage cartCount={cartCount} />
}

export default App
