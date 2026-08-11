import type { ReactNode } from "react"
import { StoreTopBar } from "../store-home/StoreTopBar"
import type { BuyerStoreSettings } from "../../lib/buyer-api"
import { PageShell } from "../layout/PageShell"

export function AccountAuthLayout({
  settings,
  cartCount,
  marketplaceMode = false,
  storeHref,
  showMobileBottomNav = true,
  children,
}: {
  settings: BuyerStoreSettings
  cartCount: number
  marketplaceMode?: boolean
  storeHref?: string
  showMobileBottomNav?: boolean
  children: ReactNode
}) {
  return (
    <PageShell
      className="buyer-account-page"
      contentClassName="buyer-account-main"
      cartCount={cartCount}
      storeHref={storeHref}
      showMobileBottomNav={showMobileBottomNav}
      header={
        <StoreTopBar
          settings={settings}
          cartCount={cartCount}
          marketplaceMode={marketplaceMode}
          storeHref={storeHref}
        />
      }
    >
      {children}
    </PageShell>
  )
}
