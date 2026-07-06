import { useEffect, useState } from "react"
import type { StoreCart } from "./lib/mock-data"
import { CartPage } from "./pages/cart/CartPage"
import { CheckoutPage } from "./pages/checkout/CheckoutPage"
import { CheckoutSuccessPage } from "./pages/checkout/CheckoutSuccessPage"
import { PlatformCheckoutPage } from "./pages/checkout/PlatformCheckoutPage"
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
import { DesignerPage } from "./pages/design/DesignerPage"
import { StoreHomePage } from "./pages/store/StoreHomePage"
import { MarketplaceHomePage } from "./pages/marketplace/MarketplaceHomePage"
import {
  AboutUsPage,
  AcceptableUsePolicyPage,
  ContactUsPage,
  CookiePolicyPage,
  CopyrightPolicyPage,
  HelpArticlePage,
  HelpPage,
  OrderStatusInfoPage,
  PaymentMethodPage,
  PoliciesPage,
  PrivacyPage,
  RefundPolicyPage,
  RefundAndReplacementPage,
  ShippingInformationPage,
  TermsPage,
} from "./pages/info/InfoPage"
import { useBuyerAuth } from "./auth/useBuyerAuth"
import { countPlatformCartItems } from "./lib/buyer-platform-cart"
import { getBuyerCartIdentity } from "./lib/buyer-cart-storage"
import { hydrateBuyerStoreContext, syncRouteStoreContext } from "./lib/buyer-store-context"

function App() {
  const auth = useBuyerAuth()
  const [path, setPath] = useState(window.location.pathname)
  const [cartCount, setCartCount] = useState(0)

  useEffect(() => {
    hydrateBuyerStoreContext()
    syncRouteStoreContext(window.location.pathname)
  }, [])

  useEffect(() => {
    const onPop = () => {
      const nextPath = window.location.pathname
      setPath(nextPath)
      syncRouteStoreContext(nextPath)
    }
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])

  const refreshCartCount = async () => {
    const identity = getBuyerCartIdentity(auth.customer?.id, window.localStorage)
    try {
      const total = await countPlatformCartItems(window.localStorage, identity)
      setCartCount(total)
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

  if (path.startsWith("/design/")) {
    return (
      <DesignerPage
        productId={decodeURIComponent(path.split("/").pop() ?? "")}
        cartCount={cartCount}
        onCartUpdated={onCartUpdated}
      />
    )
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

  if (path.startsWith("/checkout/platform")) {
    return <PlatformCheckoutPage cartCount={cartCount} />
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

  if (path === "/help/contact-us") {
    return <ContactUsPage cartCount={cartCount} />
  }

  if (path === "/help/shipping-information") {
    return <ShippingInformationPage cartCount={cartCount} />
  }

  if (path === "/help/payment-method") {
    return <PaymentMethodPage cartCount={cartCount} />
  }

  if (path === "/help/order-status") {
    return <OrderStatusInfoPage cartCount={cartCount} />
  }

  if (path.startsWith("/help/")) {
    return <HelpArticlePage cartCount={cartCount} slug={decodeURIComponent(path.split("/")[2] ?? "")} />
  }

  if (path.startsWith("/help")) {
    return <HelpPage cartCount={cartCount} />
  }

  if (path.startsWith("/policies")) {
    return <PoliciesPage cartCount={cartCount} />
  }

  if (path.startsWith("/about-us")) {
    return <AboutUsPage cartCount={cartCount} />
  }

  if (path.startsWith("/refund-and-replacement")) {
    return <RefundAndReplacementPage cartCount={cartCount} />
  }

  if (path.startsWith("/refund-policy")) {
    return <RefundPolicyPage cartCount={cartCount} />
  }

  if (path.startsWith("/terms")) {
    return <TermsPage cartCount={cartCount} />
  }

  if (path.startsWith("/privacy")) {
    return <PrivacyPage cartCount={cartCount} />
  }

  if (path.startsWith("/cookie-policy")) {
    return <CookiePolicyPage cartCount={cartCount} />
  }

  if (path.startsWith("/copyright-policy")) {
    return <CopyrightPolicyPage cartCount={cartCount} />
  }

  if (path.startsWith("/acceptable-use-policy")) {
    return <AcceptableUsePolicyPage cartCount={cartCount} />
  }

  if (path.startsWith("/shops/")) {
    const slug = decodeURIComponent(path.split("/")[2] ?? "")
    return <StoreHomePage cartCount={cartCount} storeSlug={slug} />
  }

  if (path.startsWith("/store")) {
    return <MarketplaceHomePage cartCount={cartCount} />
  }

  if (path === "/" || path.startsWith("/?")) {
    return <MarketplaceHomePage cartCount={cartCount} />
  }

  return <MarketplaceHomePage cartCount={cartCount} />
}

export default App
