import type { ReactNode } from "react"
import { StoreTopBar } from "../store-home/StoreTopBar"
import type { BuyerStoreSettings } from "../../lib/buyer-api"

export function AccountAuthLayout({
  settings,
  cartCount,
  children,
}: {
  settings: BuyerStoreSettings
  cartCount: number
  children: ReactNode
}) {
  return (
    <div className="buyer-account-page">
      <StoreTopBar settings={settings} cartCount={cartCount} />
      <main className="buyer-account-main">{children}</main>
    </div>
  )
}
