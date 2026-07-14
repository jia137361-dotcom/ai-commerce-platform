import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"
import { apiFetch } from "../../lib/api-client"
import {
  formatCustomerLabel,
  formatPaymentLabel,
  formatSupplierLabel,
} from "../../lib/order-display"
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
    staleTime: 0,
  })

  const timelineQuery = useQuery({
    queryKey: ["order-fulfillment", orderId],
    enabled: Boolean(orderId),
    queryFn: () =>
      apiFetch<{
        steps: FulfillmentTimelineStep[]
        order_summary?: Record<string, unknown>
        fulfillment_order?: Record<string, unknown> | null
      }>(`/admin/orders/${orderId}/fulfillment`),
    staleTime: 0,
  })

  const pushMutation = useMutation({
    mutationFn: () => apiFetch(`/admin/orders/${orderId}/push-fulfillment`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] })
      queryClient.invalidateQueries({ queryKey: ["order-fulfillment", orderId] })
      toast.push("Fulfillment pushed", "success")
    },
    onError: (err: unknown) => {
      toast.push(err instanceof Error ? err.message : "Push fulfillment failed", "error")
    },
  })

  const shipMutation = useMutation({
    mutationFn: () => apiFetch(`/admin/orders/${orderId}/mock-shipment`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] })
      queryClient.invalidateQueries({ queryKey: ["order-fulfillment", orderId] })
      toast.push("Mock shipment created", "success")
    },
    onError: (err: unknown) => {
      toast.push(err instanceof Error ? err.message : "Mock shipment failed", "error")
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
  const summary =
    (timelineQuery.data?.order_summary as Record<string, unknown> | undefined) ?? order
  const supplier = summary?.supplier as Record<string, unknown> | null | undefined
  const fulfillmentOrder =
    (timelineQuery.data?.fulfillment_order as Record<string, unknown> | null | undefined) ??
    (order?.fulfillment_order as Record<string, unknown> | null | undefined)
  const legacySupplier = order?.supplier_order as Record<string, unknown> | null | undefined
  const supplierId =
    (supplier?.supplier_id as string | undefined) ??
    (legacySupplier?.supplier_id as string | undefined) ??
    (fulfillmentOrder?.supplier as string | undefined)
  const supplierOrderId =
    (supplier?.supplier_order_id as string | undefined) ??
    (legacySupplier?.supplier_order_id as string | undefined) ??
    (fulfillmentOrder?.supplier_order_id as string | undefined)
  const shippingAddress = summary?.shipping_address as Record<string, unknown> | null | undefined
  const customerLabel = formatCustomerLabel(
    summary?.email as string | undefined,
    shippingAddress
  )
  const paymentLabel = formatPaymentLabel(
    summary?.payment_status as string | undefined,
    summary?.payment_method_label as string | undefined
  )
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
          Fulfillment — Order{" "}
          {(summary?.display_id ?? order?.display_id) != null
            ? `#${summary?.display_id ?? order?.display_id}`
            : "…"}
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
                Supplier: {formatSupplierLabel(supplierId, supplierOrderId)}
              </p>
              <p className="text-sm text-slate-500">
                Supplier Order ID: {supplierOrderId ?? "—"}
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
          {detailQuery.isLoading && timelineQuery.isLoading ? (
            <p className="mt-6 text-sm text-slate-400">Loading order details…</p>
          ) : detailQuery.isError && timelineQuery.isError ? (
            <p className="mt-6 text-sm text-red-500">Failed to load order details.</p>
          ) : (
            <div className="mt-6 space-y-2 border-t pt-4 text-sm">
              <p>
                <span className="text-slate-500">Email:</span> {customerLabel}
              </p>
              <p>
                <span className="text-slate-500">Payment:</span> {paymentLabel}
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
