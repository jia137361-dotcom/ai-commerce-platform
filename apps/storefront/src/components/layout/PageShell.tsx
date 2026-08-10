import type { ReactNode } from "react"
import { MobileBottomNav } from "../store-home/MobileBottomNav"

type PageShellProps = {
  children: ReactNode
  header?: ReactNode
  footer?: ReactNode
  sidebar?: ReactNode
  className?: string
  contentClassName?: string
  showMobileBottomNav?: boolean
  cartCount?: number
  storeHref?: string
}

export function PageShell({
  children,
  header,
  footer,
  sidebar,
  className = "",
  contentClassName = "",
  showMobileBottomNav = true,
  cartCount = 0,
  storeHref,
}: PageShellProps) {
  return (
    <div
      className={[
        "buyer-ui-page-shell",
        showMobileBottomNav ? "has-mobile-bottom-nav" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {header}
      <div
        className={[
          "buyer-ui-page-shell-content",
          sidebar ? "has-sidebar" : "",
          contentClassName,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {sidebar ? <aside className="buyer-ui-page-shell-sidebar">{sidebar}</aside> : null}
        <main className="buyer-ui-page-shell-main">{children}</main>
      </div>
      {footer}
      {showMobileBottomNav ? (
        <MobileBottomNav cartCount={cartCount} storeHref={storeHref} />
      ) : null}
    </div>
  )
}
