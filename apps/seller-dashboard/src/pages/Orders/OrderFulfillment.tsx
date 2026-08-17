import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"
import { apiFetch } from "../../lib/api-client"
import {
  formatCustomerLabel,
  formatPaymentLabel,
  formatOrderMoney,
  formatSupplierLabel,
} from "../../lib/order-display"
import { useToast } from "../../components/ToastProvider"
import { Button } from "../../components/ui/Button"
import { Badge } from "../../components/ui/Badge"
import { Card, CardTitle } from "../../components/ui/Card"
import { Skeleton } from "../../components/ui/EmptyState"
import { Input } from "../../components/ui/Input"
import { VerticalStepper } from "../../components/ui/Stepper"
import type { FulfillmentTimelineStep } from "@ai-commerce/shared-types"
import { canReviewRefund, parsePartialRefundAmount } from "./refund-review-state"

type RefundRequest = {
  id: string
  order_id: string
  reason: string
  note?: string | null
  status: string
  requested_amount: number
  eligible_amount?: number | null
  approved_amount?: number | null
  currency_code?: string | null
  policy_result?: string | null
  decision_type?: string | null
  decision_reason?: string | null
  provider_status?: string | null
  external_refund_id?: string | null
  created_at?: string | null
}

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
  const [partialAmounts, setPartialAmounts] = useState<Record<string, string>>({})

  const detailQuery = useQuery({
    queryKey: ["order", orderId],
    enabled: Boolean(orderId),
    queryFn: () => apiFetch<Record<string, unknown>>(`/admin/orders/${orderId}`),
    staleTime: 0,
    refetchInterval: 10000,
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
    refetchInterval: 10000,
  })

  const refundsQuery = useQuery({
    queryKey: ["seller-refund-requests", orderId],
    enabled: Boolean(orderId),
    queryFn: () => apiFetch<{ refund_requests: RefundRequest[] }>(`/seller/refund-requests?order_id=${encodeURIComponent(orderId!)}`),
    staleTime: 0,
    refetchInterval: 10000,
  })

  const refundDecision = useMutation({
    mutationFn: (input: { id: string; action: "approve" | "reject" | "request_information"; amount?: number }) =>
      apiFetch(`/seller/refund-requests/${encodeURIComponent(input.id)}/decision`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-refund-requests"] })
      queryClient.invalidateQueries({ queryKey: ["order", orderId] })
      toast.push("Refund status updated", "success")
    },
    onError: (err: unknown) => toast.push(err instanceof Error ? err.message : "Refund decision failed", "error"),
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

  const settlementMutation = useMutation({
    mutationFn: () => apiFetch<{ seller_payout?: unknown }>(`/admin/orders/${orderId}/release-seller-payout`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] })
      queryClient.invalidateQueries({ queryKey: ["order-fulfillment", orderId] })
      toast.push("Settlement status refreshed", "success")
    },
    onError: (err: unknown) => toast.push(err instanceof Error ? err.message : "Unable to release settlement", "error"),
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
  const orderMetadata = (summary?.metadata ?? order?.metadata) as Record<string, unknown> | null | undefined
  const payoutStatus = typeof orderMetadata?.seller_payout_status === "string"
    ? orderMetadata.seller_payout_status
    : "not_released"
  const payoutError = typeof orderMetadata?.seller_payout_error === "string"
    ? orderMetadata.seller_payout_error
    : null
  const payoutAmount = typeof orderMetadata?.seller_payout_amount === "number"
    ? orderMetadata.seller_payout_amount
    : null
  const payoutCurrency = typeof orderMetadata?.seller_payout_currency === "string"
    ? orderMetadata.seller_payout_currency.toUpperCase()
    : null
  const timelineSteps = timelineQuery.data?.steps ?? []
  const shippedComplete = timelineSteps.some(
    (step) => step.key === "shipped" && step.status === "completed"
  )
  const deliveredComplete = timelineSteps.some(
    (step) => step.key === "delivered" && step.status === "completed"
  )
  const showMockDelivered = import.meta.env.DEV && shippedComplete && !deliveredComplete
  const refundRequests = refundsQuery.data?.refund_requests ?? []

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

          <Card>
            <div className="mb-4 flex items-center justify-between gap-3">
              <CardTitle>Refunds</CardTitle>
              <Link to={`/refund-requests?order_id=${encodeURIComponent(orderId ?? "")}`} className="text-sm text-brand hover:underline">
                View refund request
              </Link>
            </div>
            {refundsQuery.isLoading ? <Skeleton className="h-24" /> : refundRequests.length === 0 ? (
              <p className="text-sm text-slate-500">No refund request for this order.</p>
            ) : (
              <div className="space-y-4">
                {refundRequests.map((request) => {
                  const eligibleAmount = request.eligible_amount ?? request.requested_amount
                  const partialAmount = parsePartialRefundAmount(partialAmounts[request.id] ?? "", eligibleAmount)
                  const busy = refundDecision.isPending && refundDecision.variables?.id === request.id
                  return (
                    <div key={request.id} className="rounded-lg border border-slate-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium capitalize">{request.reason.replaceAll("_", " ")}</p>
                        <Badge label={request.status} />
                      </div>
                      <p className="mt-2 text-sm text-slate-600">Requested: {formatOrderMoney(request.requested_amount, request.currency_code)}</p>
                      <p className="mt-1 text-xs text-slate-500">Policy: {request.policy_result?.replaceAll("_", " ") ?? "manual review"}{request.decision_type ? ` · ${request.decision_type.replaceAll("_", " ")}` : ""}</p>
                      {request.decision_reason ? <p className="mt-1 text-xs text-slate-500">{request.decision_reason}</p> : null}
                      {request.external_refund_id ? <p className="mt-1 text-xs text-slate-500">Refund reference: {request.external_refund_id}</p> : null}
                      {canReviewRefund(request.status) ? (
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <Input
                            aria-label={`Partial refund amount for ${request.id}`}
                            className="w-36"
                            type="number"
                            min="0.01"
                            max={eligibleAmount}
                            step="0.01"
                            placeholder="Partial amount"
                            value={partialAmounts[request.id] ?? ""}
                            onChange={(event) => setPartialAmounts((current) => ({ ...current, [request.id]: event.target.value }))}
                          />
                          <Button size="sm" disabled={busy} onClick={() => refundDecision.mutate({ id: request.id, action: "approve" })}>Approve full</Button>
                          <Button size="sm" variant="outline" disabled={busy || partialAmount == null} onClick={() => partialAmount != null && refundDecision.mutate({ id: request.id, action: "approve", amount: partialAmount })}>Approve partial</Button>
                          <Button size="sm" variant="outline" disabled={busy} onClick={() => refundDecision.mutate({ id: request.id, action: "request_information" })}>Request info</Button>
                          <Button size="sm" variant="ghost" disabled={busy} onClick={() => refundDecision.mutate({ id: request.id, action: "reject" })}>Reject</Button>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
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
              <div className="border-t pt-3">
                <p className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Seller settlement:</span>
                  <Badge label={payoutStatus.replaceAll("_", " ")} />
                </p>
                {payoutAmount != null ? <p className="mt-1 text-xs text-slate-500">{formatOrderMoney(payoutAmount, payoutCurrency)}</p> : null}
                {payoutError ? <p className="mt-1 text-xs text-red-600">{payoutError}</p> : null}
                {payoutStatus === "not_released" ? <p className="mt-1 text-xs text-slate-500">Settlement is released after the buyer confirms receipt.</p> : null}
                {(["not_released", "pending_account", "failed"] as string[]).includes(payoutStatus) ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    disabled={settlementMutation.isPending}
                    onClick={() => settlementMutation.mutate()}
                  >
                    {settlementMutation.isPending ? "Releasing…" : "Release settlement"}
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
