import { useEffect, useState } from "react"
import type { ReactNode } from "react"
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
import { SearchPage } from "./pages/search/SearchPage"
import { SavedPage } from "./pages/saved/SavedPage"
import { CategoriesPage } from "./pages/categories/CategoriesPage"
import { TrendsPage } from "./pages/trends/TrendsPage"
import { DesignerPage } from "./pages/design/DesignerPage"
import { AiDesignPage } from "./pages/ai-design/AiDesignPage"
import { MyDesignsPage } from "./pages/my-designs/MyDesignsPage"
import { StudioLandingPage } from "./pages/studio/StudioLandingPage"
import { StoreHomePage } from "./pages/store/StoreHomePage"
import { MarketplaceHomePage } from "./pages/marketplace/MarketplaceHomePage"
import { AboutPage, CookiesPage, HelpPage, PrivacyPage, TermsPage } from "./pages/info/InfoPage"
import { PlansPage } from "./pages/account/PlansPage"
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

  let page: ReactNode = <StoreHomePage cartCount={cartCount} />

  if (path.startsWith("/design/")) {
    page = (
      <DesignerPage
        productId={decodeURIComponent(path.split("/").pop() ?? "")}
        cartCount={cartCount}
        onCartUpdated={onCartUpdated}
      />
    )
  } else if (path === "/studio" || path.startsWith("/studio/")) {
    page = <StudioLandingPage cartCount={cartCount} />
  } else if (path === "/my-designs" || path.startsWith("/my-designs/")) {
    page = <MyDesignsPage cartCount={cartCount} onCartUpdated={onCartUpdated} />
  } else if (path === "/ai-design" || path.startsWith("/ai-design/")) {
    const parts = path.split("/").filter(Boolean)
    const productIdFromPath = parts.length >= 2 ? decodeURIComponent(parts[1]) : undefined
    page = <AiDesignPage cartCount={cartCount} productIdFromPath={productIdFromPath} />
  } else if (path.startsWith("/ai-studio/")) {
    const productId = decodeURIComponent(path.split("/").pop() ?? "")
    page = <AiDesignPage cartCount={cartCount} productIdFromPath={productId} />
  } else if (path.startsWith("/categories")) {
    page = <CategoriesPage cartCount={cartCount} />
  } else if (path.startsWith("/trends")) {
    page = <TrendsPage cartCount={cartCount} />
  } else if (path.startsWith("/search")) {
    page = <SearchPage cartCount={cartCount} />
  } else if (path.startsWith("/saved")) {
    page = <SavedPage cartCount={cartCount} />
  } else if (path.startsWith("/products/")) {
    page = (
      <ProductDetailPage
        productId={decodeURIComponent(path.split("/").pop() ?? "")}
        cartCount={cartCount}
        onCartUpdated={onCartUpdated}
      />
    )
  } else if (path.startsWith("/cart")) {
    page = <CartPage onCartUpdated={onCartUpdated} />
  } else if (path.startsWith("/checkout/success")) {
    page = <CheckoutSuccessPage cartCount={cartCount} />
  } else if (path.startsWith("/checkout/platform")) {
    page = <PlatformCheckoutPage cartCount={cartCount} />
  } else if (path.startsWith("/checkout")) {
    page = <CheckoutPage cartCount={cartCount} onCartUpdated={onCartUpdated} />
  } else if (path.startsWith("/orders/lookup")) {
    page = <OrderLookupPage cartCount={cartCount} />
  } else if (path.startsWith("/account/sign-in")) {
    page = <SignInPage cartCount={cartCount} />
  } else if (path.startsWith("/account/register")) {
    page = <RegisterPage cartCount={cartCount} />
  } else if (
    (["addresses", "payment-methods", "country-region", "currency", "coupons", "following"] as AccountSettingsSlug[]).some(
      (slug) => path === `/account/${slug}`
    )
  ) {
    const realAccountSetting = (
      ["addresses", "payment-methods", "country-region", "currency", "coupons", "following"] as AccountSettingsSlug[]
    ).find((slug) => path === `/account/${slug}`)!
    page = <AccountSettingsPage cartCount={cartCount} slug={realAccountSetting} />
  } else if (findAccountSettingPlaceholder(path)) {
    page = (
      <AccountSettingPlaceholderPage cartCount={cartCount} setting={findAccountSettingPlaceholder(path)!} />
    )
  } else if (path.startsWith("/account/profile")) {
    page = <AccountProfilePage cartCount={cartCount} />
  } else if (path.startsWith("/account/messages")) {
    const orderId = new URLSearchParams(window.location.search).get("orderId") ?? undefined
    page = <StoreMessagesPage cartCount={cartCount} orderId={orderId} />
  } else if (path.startsWith("/account/orders/") && path.endsWith("/tracking")) {
    page = <OrderTrackingPage orderId={decodeURIComponent(path.split("/")[3] ?? "")} cartCount={cartCount} />
  } else if (path.startsWith("/account/orders/")) {
    page = <OrderDetailPage orderId={decodeURIComponent(path.split("/")[3] ?? "")} cartCount={cartCount} />
  } else if (path.startsWith("/account/orders")) {
    page = <OrderHistoryPage cartCount={cartCount} />
  } else if (path === "/account" || path.startsWith("/account?")) {
    page = <AccountHomePage cartCount={cartCount} />
  } else if (path.startsWith("/plans")) {
    page = <PlansPage cartCount={cartCount} />
  } else if (path.startsWith("/help")) {
    page = <HelpPage cartCount={cartCount} />
  } else if (path.startsWith("/about")) {
    page = <AboutPage cartCount={cartCount} />
  } else if (path.startsWith("/cookies")) {
    page = <CookiesPage cartCount={cartCount} />
  } else if (path.startsWith("/terms")) {
    page = <TermsPage cartCount={cartCount} />
  } else if (path.startsWith("/privacy")) {
    page = <PrivacyPage cartCount={cartCount} />
  } else if (path.startsWith("/shops/")) {
    const slug = decodeURIComponent(path.split("/")[2] ?? "")
    page = <StoreHomePage cartCount={cartCount} storeSlug={slug} />
  } else if (path.startsWith("/store") || path === "/" || path.startsWith("/?")) {
    page = <StoreHomePage cartCount={cartCount} />
  } else if (path.startsWith("/marketplace")) {
    page = <MarketplaceHomePage cartCount={cartCount} />
  }

  return page
}

export default App
