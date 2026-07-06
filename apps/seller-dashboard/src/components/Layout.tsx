import { useState } from "react"
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch, STOREFRONT_URL } from "../lib/api-client"
import { useAuthStore } from "../lib/auth-store"
import { cn } from "../lib/cn"
import type { StoreNotification } from "@ai-commerce/shared-types"

const NAV = [
  { to: "/products", label: "Products" },
  { to: "/suppliers", label: "Suppliers" },
  { to: "/orders", label: "Orders" },
  { to: "/reviews", label: "Reviews" },
  { to: "/messages", label: "Messages" },
  { to: "/settings", label: "Settings" },
  { to: "/ai-studio/create", label: "AI Studio" },
]

function NotificationsBell() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () =>
      apiFetch<{ notifications: StoreNotification[] }>("/admin/notifications?limit=10"),
    refetchInterval: 30000,
  })

  const markRead = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/admin/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  })

  const markAll = useMutation({
    mutationFn: () => apiFetch("/admin/notifications/read-all", { method: "PATCH" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  })

  const notifications = data?.notifications ?? []
  const unread = notifications.filter((n) => !n.read).length

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notifications"
        className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
        onClick={() => setOpen((v) => !v)}
      >
        🔔
        {unread > 0 ? (
          <span className="absolute right-0 top-0 rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
            {unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-80 rounded-card border bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 ? (
              <button
                type="button"
                className="text-xs text-brand hover:underline"
                onClick={() => markAll.mutate()}
              >
                Mark all read
              </button>
            ) : null}
          </div>
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="py-4 text-center text-sm text-slate-500">No notifications</li>
            ) : (
              notifications.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm",
                    n.read ? "border-slate-100 bg-slate-50" : "border-brand/20 bg-brand-light/40"
                  )}
                >
                  <p className="font-medium text-slate-800">{n.title}</p>
                  <p className="text-xs text-slate-500">{n.body ?? n.title}</p>
                  {!n.read ? (
                    <button
                      type="button"
                      className="mt-1 text-xs text-brand hover:underline"
                      onClick={() => markRead.mutate(n.id)}
                    >
                      Mark read
                    </button>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

export function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { email, logout } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (to: string) => {
    if (to === "/products") return location.pathname.startsWith("/products")
    if (to === "/suppliers") return location.pathname.startsWith("/suppliers")
    if (to === "/orders") return location.pathname.startsWith("/orders")
    if (to === "/reviews") return location.pathname.startsWith("/reviews")
    if (to === "/messages") return location.pathname.startsWith("/messages")
    if (to === "/settings") return location.pathname.startsWith("/settings")
    return location.pathname.startsWith("/ai-studio")
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/products" className="text-2xl font-bold tracking-tight">
          <span className="text-brand">Citi</span>
          <span className="text-slate-900">goo</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "pb-1 text-sm font-medium transition",
                isActive(item.to)
                  ? "border-b-2 border-brand text-brand"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            aria-label="Open navigation"
            onClick={() => setMobileOpen((open) => !open)}
          >
            ☰
          </button>
          <Link to="/products" className="hidden text-sm text-slate-500 hover:text-brand sm:inline">
            ← Back to Dashboard
          </Link>
          <NotificationsBell />
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-light text-sm font-semibold text-brand">
            {(email ?? "U").slice(0, 1).toUpperCase()}
          </div>
          <button
            type="button"
            className="text-sm text-slate-500 hover:text-slate-800"
            onClick={() => {
              logout()
              navigate("/login")
            }}
          >
            Logout
          </button>
        </div>
      </div>
      {mobileOpen ? (
        <nav className="flex flex-col gap-2 border-t border-slate-200 px-6 py-4 md:hidden">
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
        </nav>
      ) : null}
    </header>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
      <p className="font-medium text-slate-700">Citigoo x Nespresso</p>
      <div className="mt-2 flex flex-wrap justify-center gap-4">
        <a href={`${STOREFRONT_URL}/privacy`} target="_blank" rel="noreferrer">
          Privacy Policy
        </a>
        <a href={`${STOREFRONT_URL}/terms`} target="_blank" rel="noreferrer">
          Terms of Service
        </a>
        <a href={`${STOREFRONT_URL}/help`} target="_blank" rel="noreferrer">
          Contact Support
        </a>
        <a href={`${STOREFRONT_URL}/store`} target="_blank" rel="noreferrer">
          Buyer Storefront
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
