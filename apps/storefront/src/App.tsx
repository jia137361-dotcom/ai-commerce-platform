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
import { AiDesignPage } from "./pages/ai-design/AiDesignPage"
import { MyDesignsPage } from "./pages/my-designs/MyDesignsPage"
import { StudioLandingPage } from "./pages/studio/StudioLandingPage"
import { StoreHomePage } from "./pages/store/StoreHomePage"
import { MarketplaceHomePage } from "./pages/marketplace/MarketplaceHomePage"
import { HelpPage, PrivacyPage, TermsPage } from "./pages/info/InfoPage"
import { useBuyerAuth } from "./auth/useBuyerAuth"
import { countPlatformCartItems } from "./lib/buyer-platform-cart"
import { getBuyerCartIdentity } from "./lib/buyer-cart-storage"
import { hydrateBuyerStoreContext, syncRouteStoreContext } from "./lib/buyer-store-context"
import {
  BUYER_NAVIGATE_EVENT,
  isBuyerInAppHref,
  navigateBuyer,
  type BuyerNavigateDetail,
} from "./lib/buyer-navigate"

function App() {
  const auth = useBuyerAuth()
  const [path, setPath] = useState(window.location.pathname)
  const [cartCount, setCartCount] = useState(0)

  useEffect(() => {
    hydrateBuyerStoreContext()
    syncRouteStoreContext(window.location.pathname)
  }, [])

  useEffect(() => {
    const applyLocation = (pathname: string, hash = window.location.hash) => {
      setPath(pathname)
      syncRouteStoreContext(pathname)
      if (hash) {
        window.requestAnimationFrame(() => {
          document.getElementById(hash.replace(/^#/, ""))?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          })
        })
      } else {
        window.scrollTo(0, 0)
      }
      void refreshCartCount()
    }

    const onPop = () => {
      applyLocation(window.location.pathname, window.location.hash)
    }

    const onNavigate = (event: Event) => {
      const detail = (event as CustomEvent<BuyerNavigateDetail>).detail
      applyLocation(detail.pathname, detail.hash)
    }

    const onDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return
      }
      const anchor = (event.target as HTMLElement | null)?.closest?.("a")
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return
      const href = anchor.getAttribute("href")
      if (!isBuyerInAppHref(href)) return
      // Let pure same-page hash updates use native scroll unless path also changes.
      if (href?.startsWith("#")) return

      const url = new URL(href!, window.location.origin)
      if (url.origin !== window.location.origin) return

      event.preventDefault()
      navigateBuyer(`${url.pathname}${url.search}${url.hash}`)
    }

    window.addEventListener("popstate", onPop)
    window.addEventListener(BUYER_NAVIGATE_EVENT, onNavigate as EventListener)
    document.addEventListener("click", onDocumentClick)
    return () => {
      window.removeEventListener("popstate", onPop)
      window.removeEventListener(BUYER_NAVIGATE_EVENT, onNavigate as EventListener)
      document.removeEventListener("click", onDocumentClick)
    }
  }, [auth.customer?.id])

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

  if (path === "/studio" || path.startsWith("/studio/")) {
    return <StudioLandingPage cartCount={cartCount} />
  }

  if (path === "/my-designs" || path.startsWith("/my-designs/")) {
    return <MyDesignsPage cartCount={cartCount} onCartUpdated={onCartUpdated} />
  }

  if (path === "/ai-design" || path.startsWith("/ai-design/")) {
    const parts = path.split("/").filter(Boolean)
    const productIdFromPath = parts.length >= 2 ? decodeURIComponent(parts[1]) : undefined
    return <AiDesignPage cartCount={cartCount} productIdFromPath={productIdFromPath} />
  }

  if (path.startsWith("/ai-studio/")) {
    // Backward-compatible alias → AI Design with product context.
    const productId = decodeURIComponent(path.split("/").pop() ?? "")
    return <AiDesignPage cartCount={cartCount} productIdFromPath={productId} />
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

  if (path.startsWith("/help")) {
    return <HelpPage cartCount={cartCount} />
  }

  if (path.startsWith("/terms")) {
    return <TermsPage cartCount={cartCount} />
  }

  if (path.startsWith("/privacy")) {
    return <PrivacyPage cartCount={cartCount} />
  }

  if (path.startsWith("/shops/")) {
    const slug = decodeURIComponent(path.split("/")[2] ?? "")
    return <StoreHomePage cartCount={cartCount} storeSlug={slug} />
  }

  if (path.startsWith("/store") || path === "/" || path.startsWith("/?")) {
    return <StoreHomePage cartCount={cartCount} />
  }

  if (path.startsWith("/marketplace")) {
    return <MarketplaceHomePage cartCount={cartCount} />
  }

  return <StoreHomePage cartCount={cartCount} />
}

export default App
