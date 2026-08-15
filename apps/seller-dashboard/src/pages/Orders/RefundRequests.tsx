import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useSearchParams } from "react-router-dom"
import { apiFetch } from "../../lib/api-client"
import { PageHeader } from "../../components/PageHeader"
import { EmptyState, TableSkeleton } from "../../components/ui/EmptyState"
import { Button } from "../../components/ui/Button"
import { Badge } from "../../components/ui/Badge"
import { Input } from "../../components/ui/Input"
import { canReviewRefund, parsePartialRefundAmount } from "./refund-review-state"
import { formatMinorMoney } from "../../lib/order-display"

type RefundRequest = {
  id: string
  order_id: string
  display_id?: number | null
  reason: string
  note?: string | null
  status: string
  requested_amount: number
  eligible_amount?: number | null
  approved_amount?: number | null
  currency_code?: string | null
  production_status_snapshot?: string | null
  payment_provider_id?: string | null
  customer_id?: string | null
  requested_items?: Array<{ item_id: string; quantity: number }> | null
  items?: Array<{ item_id: string; title: string; quantity: number }>
  latest_production_status?: string | null
  fulfillment_status?: string | null
  policy_result?: string | null
  created_at?: string | null
}

export function RefundRequestsPage() {
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get("order_id")
  const [partialAmounts, setPartialAmounts] = useState<Record<string, string>>({})
  const query = useQuery({
    queryKey: ["seller-refund-requests", orderId],
    queryFn: () => apiFetch<{ refund_requests: RefundRequest[] }>(`/seller/refund-requests${orderId ? `?order_id=${encodeURIComponent(orderId)}` : ""}`),
    refetchInterval: 10000,
  })
  const decision = useMutation({
    mutationFn: (input: { id: string; action: string; amount?: number }) =>
      apiFetch(`/seller/refund-requests/${encodeURIComponent(input.id)}/decision`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["seller-refund-requests"] }),
  })
  const requests = query.data?.refund_requests ?? []

  return (
    <div>
      <PageHeader title="Refund requests" description={orderId ? "Refund requests for the selected order. This list refreshes automatically." : "Review requests for this store and approve only eligible refunds."} />
      {query.isLoading ? <TableSkeleton /> : requests.length === 0 ? <EmptyState title="No refund requests" description="Buyer requests will appear here." /> : (
        <div className="overflow-x-auto rounded-card border border-slate-200 bg-white shadow-card">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Production</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Decision</th></tr>
            </thead>
            <tbody>
              {requests.map((request) => {
                const busy = decision.isPending && decision.variables?.id === request.id
                const amount = request.eligible_amount ?? request.requested_amount
                const currency = request.currency_code?.toUpperCase() ?? "USD"
                const partialAmount = parsePartialRefundAmount(partialAmounts[request.id] ?? "", amount)
                return (
                  <tr key={request.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-4 font-medium"><Link className="text-brand hover:underline" to={`/orders/${encodeURIComponent(request.order_id)}/fulfillment`}>#{request.display_id ?? request.order_id}</Link></td>
                    <td className="max-w-xs px-4 py-4">
                      <p>{request.reason.replaceAll("_", " ")}</p>
                      <p className="mt-1 text-xs text-slate-500">Buyer {request.customer_id ? `…${request.customer_id.slice(-8)}` : "unavailable"}</p>
                      {request.items?.map((item) => <p className="mt-1 text-xs text-slate-600" key={item.item_id}>{item.title} × {item.quantity}</p>)}
                      {request.note ? <p className="mt-1 text-xs text-slate-500">{request.note}</p> : null}
                    </td>
                    <td className="px-4 py-4 capitalize">
                      <p>{request.latest_production_status ?? request.production_status_snapshot ?? "unknown"}</p>
                      <p className="mt-1 text-xs text-slate-500">Fulfillment: {request.fulfillment_status ?? "unknown"}</p>
                      <p className="mt-1 text-xs text-slate-500">Policy: {request.policy_result?.replaceAll("_", " ") ?? "manual review"}</p>
                    </td>
                    <td className="px-4 py-4">{formatMinorMoney(amount, currency)}</td>
                    <td className="px-4 py-4"><Badge label={request.status} /><p className="mt-1 text-xs text-slate-500">{request.payment_provider_id ?? "Provider pending"}</p></td>
                    <td className="px-4 py-4 text-right">
                      {canReviewRefund(request.status) ? (
                        <div className="ml-auto flex max-w-xs flex-col items-end gap-2">
                          <Input
                            aria-label={`Partial refund amount for ${request.id}`}
                            type="number"
                            min="0.01"
                            max={amount / 100}
                            step="0.01"
                            placeholder="Partial amount"
                            value={partialAmounts[request.id] ?? ""}
                            onChange={(event) => setPartialAmounts((current) => ({ ...current, [request.id]: event.target.value }))}
                          />
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button size="sm" disabled={busy} onClick={() => decision.mutate({ id: request.id, action: "approve" })}>Approve full</Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy || partialAmount == null}
                              onClick={() => partialAmount != null && decision.mutate({ id: request.id, action: "approve", amount: partialAmount })}
                            >
                              Approve partial
                            </Button>
                            <Button size="sm" variant="outline" disabled={busy} onClick={() => decision.mutate({ id: request.id, action: "request_information" })}>Request info</Button>
                            <Button size="sm" variant="ghost" disabled={busy} onClick={() => decision.mutate({ id: request.id, action: "reject" })}>Reject</Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.location.assign(`/orders/${encodeURIComponent(request.order_id)}/fulfillment`)}
                            >
                              Open order
                            </Button>
                          </div>
                        </div>
                      ) : <span className="text-xs text-slate-400">No action</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {decision.isError ? <p className="mt-4 text-sm text-red-600" role="alert">{decision.error instanceof Error ? decision.error.message : "Refund decision failed."}</p> : null}
    </div>
  )
}
