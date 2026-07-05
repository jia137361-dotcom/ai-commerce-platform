import { useState } from "react"
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { getOpsEmail, setOpsEmail, setToken } from "../lib/api-client"
import { cn } from "../lib/cn"
import { BrandLogo } from "./BrandLogo"
import { Button } from "./ui"

const NAV = [
  { to: "/dashboard", label: "概览" },
  { to: "/sellers", label: "卖家" },
  { to: "/buyers", label: "买家" },
  { to: "/stores", label: "店铺" },
  { to: "/orders", label: "订单" },
  { to: "/logistics", label: "物流" },
  { to: "/activity", label: "活动" },
]

const STOREFRONT_URL = import.meta.env.VITE_STOREFRONT_URL ?? "http://127.0.0.1:5174"
const SELLER_URL = import.meta.env.VITE_SELLER_URL ?? "http://127.0.0.1:5173"

function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const email = getOpsEmail()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (to: string) => location.pathname === to || location.pathname.startsWith(`${to}/`)

  const logout = () => {
    setToken(null)
    setOpsEmail(null)
    navigate("/login")
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <BrandLogo subtitle="Platform Ops · 运营台" to="/dashboard" />

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition",
                isActive(item.to) ? "bg-brand-light text-brand" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="打开导航"
            onClick={() => setMobileOpen((open) => !open)}
          >
            ☰
          </button>
          <div className="hidden items-center gap-2 sm:flex">
            <a
              href={`${SELLER_URL}/login`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-brand"
            >
              卖家端
            </a>
            <a
              href={`${STOREFRONT_URL}/store`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-brand"
            >
              买家端
            </a>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-light text-sm font-semibold text-brand">
            {(email ?? "O").slice(0, 1).toUpperCase()}
          </div>
          <button type="button" className="hidden text-sm text-slate-500 hover:text-slate-800 sm:inline" onClick={logout}>
            退出
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <nav className="flex flex-col gap-1 border-t border-slate-200 px-6 py-4 lg:hidden">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium",
                isActive(item.to) ? "bg-brand-light text-brand" : "text-slate-600"
              )}
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-2 flex gap-2 border-t border-slate-100 pt-3">
            <a href={`${SELLER_URL}/login`} target="_blank" rel="noreferrer" className="text-xs text-slate-500 hover:text-brand">
              卖家端 ↗
            </a>
            <a href={`${STOREFRONT_URL}/store`} target="_blank" rel="noreferrer" className="text-xs text-slate-500 hover:text-brand">
              买家端 ↗
            </a>
          </div>
          <Button variant="outline" size="sm" className="mt-2 w-full" onClick={logout}>
            退出登录
          </Button>
        </nav>
      ) : null}
    </header>
  )
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
      <p className="font-medium text-slate-700">Citigoo Platform Operations</p>
      <div className="mt-2 flex flex-wrap justify-center gap-4">
        <a href={`${STOREFRONT_URL}/privacy`} target="_blank" rel="noreferrer">
          隐私政策
        </a>
        <a href={`${STOREFRONT_URL}/terms`} target="_blank" rel="noreferrer">
          服务条款
        </a>
        <a href={`${STOREFRONT_URL}/help`} target="_blank" rel="noreferrer">
          帮助中心
        </a>
      </div>
      <p className="mt-2">© 2026 Citigoo. All Rights Reserved.</p>
    </footer>
  )
}

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-muted">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
