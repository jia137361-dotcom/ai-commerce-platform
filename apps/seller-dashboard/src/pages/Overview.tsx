import { useMemo } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { apiFetch, STOREFRONT_URL } from "../lib/api-client"
import { PageHeader } from "../components/PageHeader"
import { Card, CardTitle } from "../components/ui/Card"
import type { StoreNotification } from "@ai-commerce/shared-types"

type OrderRow = {
  id: string
  display_id?: number
  email?: string
  payment_status?: string
  fulfillment_status?: string
  created_at?: string
}

type ThreadSummary = {
  customer_id: string
  customer_email?: string | null
  last_message?: string | null
  last_at?: string | null
  unread_for_seller?: number
}

type ReviewRow = {
  id?: string
  rating?: number
  body?: string | null
  created_at?: string
}

const PENDING_FULFILLMENT = new Set([
  "waiting",
  "not_fulfilled",
  "pushed",
  "in_production",
  "partially_shipped",
])

function isPendingFulfillment(status?: string) {
  if (!status) return true
  return PENDING_FULFILLMENT.has(status.toLowerCase())
}

export function OverviewPage() {
  const ordersQuery = useQuery({
    queryKey: ["overview-orders"],
    queryFn: () =>
      apiFetch<{ orders: OrderRow[]; count: number }>("/admin/orders?limit=50&offset=0"),
  })

  const messagesQuery = useQuery({
    queryKey: ["overview-messages"],
    queryFn: () => apiFetch<{ threads?: ThreadSummary[] }>("/admin/messages"),
  })

  const reviewsQuery = useQuery({
    queryKey: ["overview-reviews"],
    queryFn: () =>
      apiFetch<{ reviews?: ReviewRow[]; count?: number; review_count?: number }>(
        "/admin/product-reviews?limit=8"
      ),
  })

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () =>
      apiFetch<{ notifications: StoreNotification[] }>("/admin/notifications?limit=8"),
  })

  const followersQuery = useQuery({
    queryKey: ["store-followers"],
    queryFn: () =>
      apiFetch<{ follower_count: number }>("/admin/store-followers?limit=1"),
  })

  const orders = ordersQuery.data?.orders ?? []
  const threads = messagesQuery.data?.threads ?? []
  const reviews = reviewsQuery.data?.reviews ?? []
  const notifications = notificationsQuery.data?.notifications ?? []

  const pendingOrders = useMemo(
    () => orders.filter((row) => isPendingFulfillment(row.fulfillment_status)),
    [orders]
  )
  const unreadMessages = useMemo(
    () => threads.reduce((sum, thread) => sum + (thread.unread_for_seller ?? 0), 0),
    [threads]
  )
  const unreadNotifications = notifications.filter((n) => !n.read).length
  const recentOrderCount = orders.length
  const reviewCount =
    reviewsQuery.data?.review_count ?? reviewsQuery.data?.count ?? reviews.length
  const followerCount = followersQuery.data?.follower_count ?? 0

  const loading =
    ordersQuery.isLoading ||
    messagesQuery.isLoading ||
    reviewsQuery.isLoading ||
    followersQuery.isLoading

  const stats = [
    {
      label: "Pending fulfillment",
      value: pendingOrders.length,
      to: "/orders",
      accent: "bg-orange-100 text-brand",
      hint: "Orders needing production / ship",
    },
    {
      label: "Followers",
      value: followerCount,
      to: "/followers",
      accent: "bg-violet-50 text-violet-700",
      hint: "Buyers following this store",
    },
    {
      label: "Unread inbox",
      value: unreadMessages,
      to: "/messages",
      accent: "bg-sky-50 text-sky-700",
      hint: "Buyer conversations",
    },
    {
      label: "Reviews",
      value: reviewCount,
      to: "/reviews",
      accent: "bg-amber-50 text-amber-700",
      hint: "Store feedback",
    },
    {
      label: "Recent orders",
      value: recentOrderCount,
      to: "/orders",
      accent: "bg-emerald-50 text-emerald-700",
      hint: "Latest order list window",
    },
  ]

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Store operations desk — fulfill orders, reply to buyers, watch reviews."
        action={
          <a
            href={STOREFRONT_URL.replace(/\/$/, "") + "/"}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-brand hover:text-brand"
          >
            View storefront
          </a>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Card key={index} className="h-28 animate-pulse bg-slate-100">
              <span className="sr-only">Loading</span>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {stats.map((stat) => (
            <Link key={stat.label} to={stat.to} className="group block">
              <Card className="transition hover:border-brand/30 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                  <span
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${stat.accent}`}
                  >
                    {stat.label.slice(0, 1)}
                  </span>
                </div>
                <p className="mt-3 text-4xl font-bold tracking-tight text-slate-900">{stat.value}</p>
                <p className="mt-2 text-xs text-slate-500">{stat.hint}</p>
                <p className="mt-2 text-xs font-medium text-brand opacity-0 transition group-hover:opacity-100">
                  Open →
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <CardTitle>Needs fulfillment</CardTitle>
            <Link to="/orders" className="text-xs font-medium text-brand hover:underline">
              All orders
            </Link>
          </div>
          {pendingOrders.length === 0 ? (
            <p className="text-sm text-slate-500">No pending fulfillment right now.</p>
          ) : (
            <ul className="space-y-2.5 text-sm">
              {pendingOrders.slice(0, 6).map((order) => (
                <li
                  key={order.id}
                  className="flex items-center justify-between gap-3 border-b border-slate-50 pb-2 last:border-0"
                >
                  <div className="min-w-0">
                    <Link
                      className="font-medium text-brand hover:underline"
                      to={`/orders/${order.id}/fulfillment`}
                    >
                      #{order.display_id ?? order.id.slice(-6)}
                    </Link>
                    <p className="truncate text-xs text-slate-500">{order.email || "Guest"}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-600">
                    {(order.fulfillment_status || "waiting").replaceAll("_", " ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <CardTitle>Inbox</CardTitle>
            <Link to="/messages" className="text-xs font-medium text-brand hover:underline">
              Open inbox
            </Link>
          </div>
          {threads.length === 0 ? (
            <p className="text-sm text-slate-500">No buyer messages yet.</p>
          ) : (
            <ul className="space-y-2.5 text-sm">
              {threads.slice(0, 6).map((thread) => (
                <li
                  key={thread.customer_id}
                  className="flex items-start justify-between gap-3 border-b border-slate-50 pb-2 last:border-0"
                >
                  <div className="min-w-0">
                    <Link
                      className="font-medium text-brand hover:underline"
                      to="/messages"
                    >
                      {thread.customer_email || thread.customer_id}
                    </Link>
                    <p className="truncate text-xs text-slate-500">
                      {thread.last_message || "Conversation"}
                    </p>
                  </div>
                  {(thread.unread_for_seller ?? 0) > 0 ? (
                    <span className="shrink-0 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
                      {thread.unread_for_seller}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <CardTitle>Latest reviews</CardTitle>
            <Link to="/reviews" className="text-xs font-medium text-brand hover:underline">
              All reviews
            </Link>
          </div>
          {reviews.length === 0 ? (
            <p className="text-sm text-slate-500">No reviews yet.</p>
          ) : (
            <ul className="space-y-2.5 text-sm">
              {reviews.slice(0, 5).map((review, index) => (
                <li
                  key={review.id || String(index)}
                  className="border-b border-slate-50 pb-2 last:border-0"
                >
                  <p className="font-medium text-slate-800">
                    {"★".repeat(Math.max(1, Math.min(5, Number(review.rating) || 0)))}
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      {review.created_at ? new Date(review.created_at).toLocaleDateString() : ""}
                    </span>
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                    {review.body || "No comment"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <CardTitle>Notifications</CardTitle>
            {unreadNotifications > 0 ? (
              <span className="text-xs text-slate-500">{unreadNotifications} unread</span>
            ) : null}
          </div>
          {notifications.length === 0 ? (
            <p className="text-sm text-slate-500">No notifications.</p>
          ) : (
            <ul className="space-y-2.5 text-sm">
              {notifications.slice(0, 5).map((item) => (
                <li
                  key={item.id}
                  className={`rounded-lg border px-3 py-2 ${
                    item.read ? "border-slate-100 bg-slate-50" : "border-brand/20 bg-brand-light/40"
                  }`}
                >
                  <p className="font-medium text-slate-800">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.body ?? item.title}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
