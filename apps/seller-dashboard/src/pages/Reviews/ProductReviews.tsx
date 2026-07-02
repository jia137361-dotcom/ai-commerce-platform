import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { apiFetch } from "../../lib/api-client"
import { PageHeader } from "../../components/PageHeader"
import { Button } from "../../components/ui/Button"
import { Card } from "../../components/ui/Card"
import { EmptyState } from "../../components/ui/EmptyState"

type ReviewRow = {
  review_id?: string
  product_id?: string
  product_title?: string | null
  order_display_id?: number
  customer_name?: string | null
  rating?: number
  logistics_rating?: number | null
  overall_rating?: number | null
  content?: string | null
  image_urls?: string[]
  created_at?: string
}

export function ProductReviewsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-product-reviews"],
    queryFn: () =>
      apiFetch<{
        average_rating?: number | null
        review_count?: number
        reviews?: ReviewRow[]
      }>("/admin/product-reviews?limit=100"),
  })

  const reviews = data?.reviews ?? []
  const summary = useMemo(
    () => ({
      average: data?.average_rating ?? null,
      count: data?.review_count ?? reviews.length,
    }),
    [data, reviews.length]
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Reviews"
        description="Verified buyer reviews submitted after delivery confirmation."
      />
      <Card className="p-4">
        <p className="text-sm text-slate-500">
          {summary.count} published review{summary.count === 1 ? "" : "s"}
          {summary.average != null ? ` · ${summary.average.toFixed(1)} average product rating` : ""}
        </p>
      </Card>
      {isLoading ? <p className="text-sm text-slate-500">Loading reviews...</p> : null}
      {error ? <p className="text-sm text-red-600">Unable to load reviews.</p> : null}
      {!isLoading && !reviews.length ? (
        <EmptyState title="No reviews yet" description="Reviews appear here after buyers confirm delivery and submit feedback." />
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.review_id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{review.customer_name ?? "Verified buyer"}</p>
                  <p className="text-sm text-slate-500">
                    Order #{review.order_display_id ?? "—"} · {review.product_title ?? review.product_id}
                  </p>
                </div>
                <p className="text-sm font-medium text-brand">
                  Product {review.rating ?? "—"}/5
                  {review.logistics_rating ? ` · Shipping ${review.logistics_rating}/5` : ""}
                  {review.overall_rating ? ` · Overall ${review.overall_rating}/5` : ""}
                </p>
              </div>
              {review.content ? <p className="mt-3 text-sm text-slate-700">{review.content}</p> : null}
              {review.image_urls?.length ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {review.image_urls.map((url) => (
                    <li key={url}>
                      <img src={url} alt="" className="h-16 w-16 rounded object-cover" />
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="mt-3 text-xs text-slate-400">
                {review.created_at ? new Date(review.created_at).toLocaleString() : "Date unavailable"}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

type ThreadSummary = {
  customer_id: string
  customer_email: string
  customer_name: string | null
  last_message_at: string | null
  last_message_preview: string | null
  unread_for_seller: number
}

type MessageRow = {
  message_id?: string
  sender_role?: "buyer" | "seller"
  body?: string
  created_at?: string
}

export function StoreMessagesPage() {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>()
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)

  const threadsQuery = useQuery({
    queryKey: ["admin-message-threads"],
    queryFn: () => apiFetch<{ threads?: ThreadSummary[] }>("/admin/messages"),
  })

  const threadQuery = useQuery({
    queryKey: ["admin-message-thread", selectedCustomerId],
    enabled: Boolean(selectedCustomerId),
    queryFn: () =>
      apiFetch<{ messages?: MessageRow[] }>(
        `/admin/messages?customer_id=${encodeURIComponent(selectedCustomerId!)}`
      ),
  })

  const threads = threadsQuery.data?.threads ?? []
  const messages = threadQuery.data?.messages ?? []
  const selectedThread = threads.find((thread) => thread.customer_id === selectedCustomerId)

  const sendReply = async () => {
    if (!selectedCustomerId || !draft.trim()) return
    setSending(true)
    try {
      await apiFetch("/admin/messages", {
        method: "POST",
        body: JSON.stringify({ customer_id: selectedCustomerId, body: draft.trim() }),
      })
      setDraft("")
      await threadQuery.refetch()
      await threadsQuery.refetch()
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buyer Messages"
        description="Reply to buyers who contact your store from the storefront."
      />
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="p-3">
          <h2 className="mb-3 px-2 text-sm font-semibold uppercase text-slate-500">Conversations</h2>
          {threadsQuery.isLoading ? <p className="px-2 text-sm text-slate-500">Loading...</p> : null}
          {!threads.length && !threadsQuery.isLoading ? (
            <p className="px-2 text-sm text-slate-500">No buyer messages yet.</p>
          ) : (
            <ul className="space-y-1">
              {threads.map((thread) => (
                <li key={thread.customer_id}>
                  <button
                    type="button"
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                      selectedCustomerId === thread.customer_id ? "bg-brand-light text-brand" : "hover:bg-slate-50"
                    }`}
                    onClick={() => setSelectedCustomerId(thread.customer_id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong>{thread.customer_name ?? thread.customer_email}</strong>
                      {thread.unread_for_seller > 0 ? (
                        <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
                          {thread.unread_for_seller}
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-slate-500">{thread.last_message_preview ?? "No preview"}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="flex min-h-[420px] flex-col p-4">
          {!selectedCustomerId ? (
            <EmptyState title="Select a conversation" description="Choose a buyer thread to read and reply." />
          ) : (
            <>
              <header className="border-b pb-3">
                <h2 className="font-semibold text-slate-900">
                  {selectedThread?.customer_name ?? selectedThread?.customer_email ?? "Buyer"}
                </h2>
                <p className="text-xs text-slate-500">{selectedThread?.customer_email}</p>
              </header>
              <div className="flex-1 space-y-3 overflow-y-auto py-4">
                {threadQuery.isLoading ? <p className="text-sm text-slate-500">Loading thread...</p> : null}
                {messages.map((message) => (
                  <article
                    key={message.message_id}
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      message.sender_role === "seller"
                        ? "ml-auto bg-brand text-white"
                        : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    <p>{message.body}</p>
                    <small className="mt-1 block opacity-70">
                      {message.created_at ? new Date(message.created_at).toLocaleString() : ""}
                    </small>
                  </article>
                ))}
              </div>
              <form
                className="border-t pt-3"
                onSubmit={(event) => {
                  event.preventDefault()
                  void sendReply()
                }}
              >
                <textarea
                  className="mb-3 w-full rounded-lg border px-3 py-2 text-sm"
                  rows={3}
                  maxLength={2000}
                  value={draft}
                  placeholder="Write a reply..."
                  onChange={(event) => setDraft(event.target.value)}
                />
                <Button type="submit" disabled={sending || !draft.trim()}>
                  {sending ? "Sending..." : "Send reply"}
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
