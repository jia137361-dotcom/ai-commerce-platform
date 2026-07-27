import { useEffect, useState } from "react"
import { useBuyerAuth } from "../../auth/useBuyerAuth"

type MobileBottomNavProps = {
  cartCount: number
}

/** 页面分析 image85 底栏: Home / Cart / Message / Sign in */
export function MobileBottomNav({ cartCount }: MobileBottomNavProps) {
  const auth = useBuyerAuth()
  const [path, setPath] = useState(() => (typeof window !== "undefined" ? window.location.pathname : "/"))

  useEffect(() => {
    const sync = () => setPath(window.location.pathname)
    window.addEventListener("popstate", sync)
    window.addEventListener("citigoo:buyer-navigate", sync)
    return () => {
      window.removeEventListener("popstate", sync)
      window.removeEventListener("citigoo:buyer-navigate", sync)
    }
  }, [])

  const accountHref = auth.customer ? "/account" : "/account/sign-in"
  const messageHref = auth.customer ? "/account/messages" : "/help"
  const isHome = path === "/store" || path === "/" || path.startsWith("/shops/")
  const isCart = path.startsWith("/cart")
  const isMessage = path.startsWith("/account/messages") || path.startsWith("/help")
  const isAccount = path.startsWith("/account") && !path.startsWith("/account/messages")

  return (
    <nav className="buyer-mobile-bottom-nav" aria-label="Mobile navigation">
      <a className={isHome ? "active" : ""} href="/store">
        <span className="buyer-mobile-bottom-icon" aria-hidden="true">
          ⌂
        </span>
        <span>Home</span>
      </a>
      <a className={isCart ? "active" : ""} href="/cart">
        <span className="buyer-mobile-bottom-icon" aria-hidden="true">
          🛒
        </span>
        <span>Cart{cartCount > 0 ? ` ${cartCount}` : ""}</span>
      </a>
      <a className={isMessage ? "active" : ""} href={messageHref}>
        <span className="buyer-mobile-bottom-icon" aria-hidden="true">
          💬
        </span>
        <span>Message</span>
      </a>
      <a className={isAccount ? "active" : ""} href={accountHref}>
        <span className="buyer-mobile-bottom-icon" aria-hidden="true">
          ◎
        </span>
        <span>{auth.customer ? "Me" : "Sign in"}</span>
      </a>
    </nav>
  )
}
