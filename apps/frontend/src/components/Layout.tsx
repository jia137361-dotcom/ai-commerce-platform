import type { ReactNode } from "react"
import { config } from "../lib/config"
import type { BuyerSession, SellerSession } from "../lib/session"
import { StoreSelector } from "./Ui"

type Props = {
  route: string
  setRoute: (route: string) => void
  storeId: string
  setStoreId: (storeId: string) => void
  buyer: BuyerSession | null
  seller: SellerSession | null
  children: ReactNode
}

export function AppLayout({ route, setRoute, storeId, setStoreId, buyer, seller, children }: Props) {
  const isSeller = route.startsWith("seller")
  const nav = isSeller
    ? [
        ["seller-dashboard", "Dashboard"],
        ["seller-ai", "AI Studio"],
        ["seller-products", "Products"],
        ["seller-orders", "Orders"],
        ["seller-settings", "Settings"],
        ["seller-diagnostics", "Diagnostics"],
      ]
    : [
        ["home", "Home"],
        ["products", "Products"],
        ["cart", "Cart"],
        ["checkout", "Checkout"],
        ["order-lookup", "Orders"],
      ]

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={() => setRoute("home")}>
          <span className="brand-mark">CG</span>
          <span>
            <strong>CitiGoo</strong>
            <small>AI Commerce Demo</small>
          </span>
        </button>
        <nav className="nav">
          {nav.map(([key, label]) => (
            <button key={key} className={route === key ? "active" : ""} onClick={() => setRoute(key)}>
              {label}
            </button>
          ))}
        </nav>
        <div className="top-actions">
          <StoreSelector storeId={storeId} onChange={setStoreId} />
          <button onClick={() => setRoute(isSeller ? "home" : "seller-dashboard")}>
            {isSeller ? "Buyer site" : "Seller site"}
          </button>
        </div>
      </header>
      <main>{children}</main>
      <footer>
        <span>Backend: {config.medusaBaseUrl}</span>
        <span>AI Worker: {config.aiWorkerBaseUrl}</span>
        <span>{buyer ? `Buyer ${buyer.email}` : "Demo buyer not signed in"}</span>
        <span>{seller ? `Seller/Admin ${seller.email}` : "Seller not signed in"}</span>
      </footer>
    </div>
  )
}
