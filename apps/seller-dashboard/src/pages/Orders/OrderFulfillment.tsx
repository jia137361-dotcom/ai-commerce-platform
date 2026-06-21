import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"
import { apiFetch } from "../../lib/api-client"
import { useToast } from "../../components/ToastProvider"
import { Button } from "../../components/ui/Button"
import { Card, CardTitle } from "../../components/ui/Card"
import { Skeleton } from "../../components/ui/EmptyState"
import { VerticalStepper } from "../../components/ui/Stepper"
import type { FulfillmentTimelineStep } from "@ai-commerce/shared-types"

function mapTimelineSteps(steps: FulfillmentTimelineStep[]) {
  return steps.map((step, index) => ({
    id: step.key ?? String(index),
    label: step.label,
    timestamp: step.timestamp ?? undefined,
    status:
      step.status === "completed"
        ? ("done" as const)
        : step.status === "active"
          ? ("current" as const)
          : ("pending" as const),
    progress: step.status === "active" ? 40 : undefined,
  }))
}

export function OrderFulfillmentPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const queryClient = useQueryClient()
  const toast = useToast()

  const detailQuery = useQuery({
    queryKey: ["order", orderId],
    enabled: Boolean(orderId),
    queryFn: () => apiFetch<Record<string, unknown>>(`/admin/orders/${orderId}`),
  })

  const timelineQuery = useQuery({
    queryKey: ["order-fulfillment", orderId],
    enabled: Boolean(orderId),
    queryFn: () =>
      apiFetch<{ steps: FulfillmentTimelineStep[] }>(`/admin/orders/${orderId}/fulfillment`),
  })

  const pushMutation = useMutation({
    mutationFn: () => apiFetch(`/admin/orders/${orderId}/push-fulfillment`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] })
      queryClient.invalidateQueries({ queryKey: ["order-fulfillment", orderId] })
      toast.push("Fulfillment pushed", "success")
    },
  })

  const shipMutation = useMutation({
    mutationFn: () => apiFetch(`/admin/orders/${orderId}/mock-shipment`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] })
      queryClient.invalidateQueries({ queryKey: ["order-fulfillment", orderId] })
      toast.push("Mock shipment created", "success")
    },
  })

  const deliveredMutation = useMutation({
    mutationFn: () => apiFetch(`/admin/orders/${orderId}/mock-delivered`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] })
      queryClient.invalidateQueries({ queryKey: ["order-fulfillment", orderId] })
      toast.push("Mock delivery recorded", "success")
    },
    onError: (err: unknown) => {
      toast.push(err instanceof Error ? err.message : "Mock delivery update failed", "error")
    },
  })

  const order = detailQuery.data
  const supplier = order?.supplier_order as Record<string, unknown> | null | undefined
  const timelineSteps = timelineQuery.data?.steps ?? []
  const shippedComplete = timelineSteps.some(
    (step) => step.key === "shipped" && step.status === "completed"
  )
  const deliveredComplete = timelineSteps.some(
    (step) => step.key === "delivered" && step.status === "completed"
  )
  const showMockDelivered = import.meta.env.DEV && shippedComplete && !deliveredComplete

  return (
    <div>
      <div className="mb-8">
        <Link to="/orders" className="text-sm text-slate-500 hover:text-brand">
          ← Orders
        </Link>
        <h1 className="mt-2 text-3xl font-bold">
          Fulfillment — Order #{String(order?.display_id ?? "…")}
        </h1>
        <p className="mt-2 text-slate-500">
          Manage the supply chain and logistics flow for this transaction.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-brand-light" />
            <div>
              <p className="font-semibold text-brand">
                Supplier: {String(supplier?.supplier_id ?? "PrintPro")}
              </p>
              <p className="text-sm text-slate-500">
                Supplier Order ID: {String(supplier?.supplier_order_id ?? "—")}
              </p>
            </div>
          </Card>

          <Card>
            <CardTitle className="mb-6 flex items-center gap-2">
              <span className="text-brand">◎</span> Order Journey
            </CardTitle>
            {timelineQuery.isLoading ? (
              <Skeleton className="h-64" />
            ) : timelineQuery.data?.steps ? (
              <VerticalStepper steps={mapTimelineSteps(timelineQuery.data.steps)} />
            ) : (
              <p className="text-sm text-slate-500">No timeline data</p>
            )}
          </Card>
        </div>

        <Card>
          <CardTitle className="mb-4">Workflow Actions</CardTitle>
          <div className="space-y-3">
            <Button className="w-full" onClick={() => pushMutation.mutate()}>
              ✨ Push Fulfillment
            </Button>
            <Button variant="outline" className="w-full" onClick={() => shipMutation.mutate()}>
              Mock Shipment
            </Button>
            {showMockDelivered ? (
              <Button
                variant="outline"
                className="w-full"
                disabled={deliveredMutation.isPending}
                onClick={() => deliveredMutation.mutate()}
              >
                Mock Delivered
              </Button>
            ) : null}
          </div>
          <p className="mt-6 text-xs text-slate-400">
            Mock actions are local development aids only. Real carrier delivery remains unavailable (TRACKING-01).
          </p>
          {detailQuery.isLoading ? null : (
            <div className="mt-6 space-y-2 border-t pt-4 text-sm">
              <p>
                <span className="text-slate-500">Email:</span> {String(order?.email ?? "—")}
              </p>
              <p>
                <span className="text-slate-500">Payment:</span> {String(order?.payment_status ?? "—")}
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
