import { useState } from "react"
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch, fetchSellerSession, STOREFRONT_URL } from "../lib/api-client"
import { useAuthStore } from "../lib/auth-store"
import { cn } from "../lib/cn"
import type { StoreNotification } from "@ai-commerce/shared-types"
import { getSellerStoreId } from "../lib/seller-store-id"

const NAV: Array<{ to: string; label: string; end?: boolean }> = [
  { to: "/", label: "Overview", end: true },
  { to: "/products", label: "Products" },
  { to: "/orders", label: "Orders" },
  { to: "/refund-requests", label: "Refunds" },
  { to: "/followers", label: "Followers" },
  { to: "/coupons", label: "Coupons" },
  { to: "/cashback", label: "Affiliate commissions" },
  { to: "/reviews", label: "Reviews" },
  { to: "/messages", label: "Inbox" },
  { to: "/settings", label: "Settings" },
  { to: "/ai-studio/create", label: "AI Studio" },
]

function notificationHref(notification: StoreNotification): string | null {
  const type = String(notification.type || "").toLowerCase()
  const metadata = (notification as StoreNotification & { metadata?: Record<string, unknown> }).metadata
  const orderId = typeof metadata?.order_id === "string" ? metadata.order_id : null
  if (type.includes("refund")) return orderId ? `/orders/${encodeURIComponent(orderId)}/fulfillment` : "/refund-requests"
  if (type.includes("message") || type.includes("inbox")) return "/messages"
  if (type.includes("review")) return "/reviews"
  if (type.includes("order") || type.includes("fulfill") || type.includes("shipment")) {
    return "/orders"
  }
  return null
}

function NotificationsBell() {
  const navigate = useNavigate()
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
            <p className="text-sm font-semibold">To-dos & alerts</p>
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
              notifications.map((n) => {
                const href = notificationHref(n)
                return (
                  <li
                    key={n.id}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm",
                      n.read ? "border-slate-100 bg-slate-50" : "border-brand/20 bg-brand-light/40"
                    )}
                  >
                    <p className="font-medium text-slate-800">{n.title}</p>
                    <p className="text-xs text-slate-500">{n.body ?? n.title}</p>
                    <div className="mt-1 flex gap-3">
                      {href ? (
                        <button
                          type="button"
                          className="text-xs text-brand hover:underline"
                          onClick={() => {
                            setOpen(false)
                            if (!n.read) markRead.mutate(n.id)
                            navigate(href)
                          }}
                        >
                          Open
                        </button>
                      ) : null}
                      {!n.read ? (
                        <button
                          type="button"
                          className="text-xs text-slate-500 hover:underline"
                          onClick={() => markRead.mutate(n.id)}
                        >
                          Mark read
                        </button>
                      ) : null}
                    </div>
                  </li>
                )
              })
            )}
          </ul>
          <div className="mt-3 border-t border-slate-100 pt-2">
            <Link
              to="/"
              className="text-xs font-medium text-brand hover:underline"
              onClick={() => setOpen(false)}
            >
              Back to overview
            </Link>
          </div>
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
  const sessionQuery = useQuery({
    queryKey: ["seller-session"],
    queryFn: fetchSellerSession,
    staleTime: 60_000,
  })
  const currentStoreId = sessionQuery.data?.store_id?.trim() || getSellerStoreId()
  const storefrontHref = `${STOREFRONT_URL.replace(/\/$/, "")}/store?store_id=${encodeURIComponent(currentStoreId)}`

  const isActive = (to: string, end?: boolean) => {
    if (end || to === "/") return location.pathname === "/"
    return location.pathname === to || location.pathname.startsWith(`${to}/`)
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="text-2xl font-bold tracking-tight">
          <span className="text-brand">Cii</span>
          <span className="text-slate-900">Verse</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "pb-1 text-sm font-medium transition",
                isActive(item.to, item.end)
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
          <a
            href={storefrontHref}
            target="_blank"
            rel="noreferrer"
            className="hidden text-sm text-slate-500 hover:text-brand sm:inline"
          >
            View store
          </a>
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
                isActive(item.to, item.end) ? "bg-brand-light text-brand" : "text-slate-600"
              )}
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <a
            href={storefrontHref}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600"
            onClick={() => setMobileOpen(false)}
          >
            View store
          </a>
        </nav>
      ) : null}
    </header>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
      <p className="font-medium text-slate-700">Seller operations</p>
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
        <a href={STOREFRONT_URL.replace(/\/$/, "") + "/"} target="_blank" rel="noreferrer">
          Buyer Storefront
        </a>
      </div>
      <p className="mt-2">© 2026 CiiVerse. All Rights Reserved.</p>
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
