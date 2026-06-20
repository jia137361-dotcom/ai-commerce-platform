import { FormEvent, Fragment, useState } from "react"
import { Link } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "../../lib/api-client"
import { PageHeader } from "../../components/PageHeader"
import { useToast } from "../../components/ToastProvider"
import { Badge } from "../../components/ui/Badge"
import { Button } from "../../components/ui/Button"
import { EmptyState, TableSkeleton } from "../../components/ui/EmptyState"
import { Pagination } from "../../components/ui/Pagination"
import { HorizontalStepper } from "../../components/ui/Stepper"
import type { FulfillmentTimelineStep } from "@ai-commerce/shared-types"

type OrderRow = {
  id: string
  display_id: number
  email: string
  payment_status: string
  fulfillment_status: string
  created_at: string
  total?: number
  currency_code?: string
  items_count?: number
}

const FULFILLMENT_STEPS = ["Waiting", "Pushed", "In Production", "Shipped", "Delivered"]

function mapStepStatus(fulfillmentStatus: string, index: number): "done" | "current" | "pending" {
  const normalized = fulfillmentStatus.toLowerCase()
  const stageMap: Record<string, number> = {
    waiting: 0,
    not_fulfilled: 0,
    pushed: 1,
    in_production: 2,
    shipped: 3,
    partially_shipped: 3,
    delivered: 4,
    fulfilled: 4,
    cancelled: -1,
  }
  const current = stageMap[normalized] ?? 0
  if (current < 0) return "pending"
  if (index < current) return "done"
  if (index === current) return "current"
  return "pending"
}

const formatOrderMoney = (amount: number | undefined, currency = "USD") => {
  if (amount == null || !Number.isFinite(amount)) return "—"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount)
}

function OrderExpandedPanel({ orderId }: { orderId: string }) {
  const queryClient = useQueryClient()
  const toast = useToast()

  const detailQuery = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => apiFetch<Record<string, unknown>>(`/admin/orders/${orderId}`),
  })

  const timelineQuery = useQuery({
    queryKey: ["order-fulfillment", orderId],
    queryFn: () =>
      apiFetch<{ steps: FulfillmentTimelineStep[] }>(`/admin/orders/${orderId}/fulfillment`),
  })

  const pushMutation = useMutation({
    mutationFn: () => apiFetch(`/admin/orders/${orderId}/push-fulfillment`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] })
      queryClient.invalidateQueries({ queryKey: ["order-fulfillment", orderId] })
      toast.push("Pushed to fulfillment", "success")
    },
    onError: (err: unknown) => {
      toast.push(err instanceof Error ? err.message : "Push failed", "error")
    },
  })

  const shipMutation = useMutation({
    mutationFn: () => apiFetch(`/admin/orders/${orderId}/mock-shipment`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] })
      queryClient.invalidateQueries({ queryKey: ["order-fulfillment", orderId] })
      toast.push("Mock shipment recorded", "success")
    },
    onError: (err: unknown) => {
      toast.push(err instanceof Error ? err.message : "Shipment update failed", "error")
    },
  })

  const order = detailQuery.data
  const fulfillmentStatus = String(order?.fulfillment_status ?? "waiting")

  return (
    <div className="grid gap-6 bg-surface-muted p-6 lg:grid-cols-2">
      <div>
        <h4 className="mb-3 text-sm font-semibold uppercase text-slate-500">Order Items</h4>
        <ul className="space-y-3">
          {(order?.items as Array<Record<string, unknown>> | undefined)?.map((item) => (
            <li key={String(item.id)} className="flex items-center gap-3 rounded-lg border bg-white p-3">
              {item.thumbnail ? (
                <img
                  src={String(item.thumbnail)}
                  alt=""
                  className="h-12 w-12 rounded object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded bg-slate-100" />
              )}
              <div className="flex-1">
                <p className="font-medium">{String(item.title)}</p>
                <p className="text-xs text-slate-400">
                  Variant: {String(item.variant_id ?? "—")}
                </p>
              </div>
              <p className="text-brand">{String(item.quantity)}×</p>
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-4">
        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase text-slate-500">Fulfillment Workflow</h4>
          <HorizontalStepper
            steps={FULFILLMENT_STEPS.map((label, index) => ({
              id: label,
              label,
              status: mapStepStatus(fulfillmentStatus, index),
            }))}
          />
        </div>
        <div className="rounded-lg border bg-white p-4 text-sm">
          <p>
            <span className="text-slate-500">Customer:</span> {String(order?.email ?? "—")}
          </p>
          <p className="mt-1">
            <span className="text-slate-500">Payment:</span> {String(order?.payment_status ?? "—")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => shipMutation.mutate()}>
              Mock Shipment
            </Button>
            <Button size="sm" onClick={() => pushMutation.mutate()}>
              ✨ Push to Fulfillment
            </Button>
            <Link to={`/orders/${orderId}/fulfillment`}>
              <Button variant="ghost" size="sm">
                Full timeline →
              </Button>
            </Link>
          </div>
        </div>
        {timelineQuery.data?.steps ? (
          <p className="text-xs text-slate-400">
            Latest: {timelineQuery.data.steps.filter((s) => s.status === "completed").slice(-1)[0]?.label}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export function OrderListPage() {
  const [offset, setOffset] = useState(0)
  const [displayId, setDisplayId] = useState("")
  const [search, setSearch] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const limit = 20

  const queryString = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    ...(search ? { display_id: search } : {}),
  })

  const { data, isLoading } = useQuery({
    queryKey: ["orders", offset, search],
    queryFn: () =>
      apiFetch<{ orders: OrderRow[]; count: number }>(`/admin/orders?${queryString.toString()}`),
  })

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    setOffset(0)
    setSearch(displayId.trim())
  }

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Manage your global sales and fulfillment workflow."
        action={
          <form onSubmit={onSearch} className="flex gap-2">
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Search Order #"
              value={displayId}
              onChange={(e) => setDisplayId(e.target.value)}
            />
            <Button type="submit" variant="outline" size="sm">
              🔍
            </Button>
          </form>
        }
      />

      {isLoading ? (
        <TableSkeleton />
      ) : !data?.orders?.length ? (
        <EmptyState title="No orders yet" description="Orders appear after buyers checkout." />
      ) : (
        <div className="overflow-hidden rounded-card border border-slate-200 bg-white shadow-card">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Fulfillment</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody>
              {data.orders.map((o) => (
                <Fragment key={o.id}>
                  <tr
                    className={`border-t ${expandedId === o.id ? "border-l-4 border-l-brand" : ""}`}
                  >
                    <td className="px-4 py-3 font-medium">#{o.display_id}</td>
                    <td className="px-4 py-3">
                      <Badge label={o.payment_status} />
                    </td>
                    <td className="px-4 py-3 capitalize">{o.fulfillment_status}</td>
                    <td className="px-4 py-3">{o.items_count ?? "—"}× Items</td>
                    <td className="px-4 py-3">
                      {formatOrderMoney(o.total, o.currency_code)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="text-brand hover:underline"
                        onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                      >
                        Details {expandedId === o.id ? "▲" : "▼"}
                      </button>
                    </td>
                  </tr>
                  {expandedId === o.id ? (
                    <tr>
                      <td colSpan={6} className="p-0">
                        <OrderExpandedPanel orderId={o.id} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data ? (
        <Pagination offset={offset} limit={limit} count={data.count} onPageChange={setOffset} />
      ) : null}
    </div>
  )
}
