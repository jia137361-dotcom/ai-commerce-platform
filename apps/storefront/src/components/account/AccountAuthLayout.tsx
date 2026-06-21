import type { ReactNode } from "react"
import { StoreTopBar } from "../store-home/StoreTopBar"
import type { BuyerStoreSettings } from "../../lib/buyer-api"
import { PageShell } from "../layout/PageShell"

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
    <PageShell
      className="buyer-account-page"
      contentClassName="buyer-account-main"
      header={<StoreTopBar settings={settings} cartCount={cartCount} />}
    >
      {children}
    </PageShell>
  )
}
