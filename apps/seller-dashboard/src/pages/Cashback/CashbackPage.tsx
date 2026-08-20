import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { Button } from "../../components/ui/Button"
import { Card } from "../../components/ui/Card"
import { EmptyState, ErrorState, LoadingState } from "../../components/ui/EmptyState"
import { Input } from "../../components/ui/Input"
import { apiFetch } from "../../lib/api-client"

type ReferralCommission = {
  id: string
  order_id: string
  order_display_id: number | null
  referrer_customer_id: string
  referred_customer_id: string
  eligible_amount: number
  commission_amount: number
  currency_code: string
  rate_percent: number
  is_first_order: boolean
  status: string
  reason: string | null
  order_created_at: string
}

type CommissionAction = "freeze" | "unfreeze" | "cancel" | "release" | "adjust"

type WalletWithdrawal = {
  id: string
  amount: number
  payout_amount: number
  fee: number | null
  currency_code: string
  status: "pending" | "approved" | "processing" | "paid" | "failed" | "rejected" | string
  paypal_email_masked: string | null
  failure_kind: string | null
  retry_count: number
  error_message: string | null
  created_at: string
}

type WithdrawalAction = "approve" | "reject" | "retry"

type ReferralProgram = {
  first_order_rate_percent: number
  future_order_rate_percent: number
  future_order_months: number
}

const money = (amount: number, currency = "usd") => new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: currency.toUpperCase(),
}).format(amount)
const date = (value: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
const statusStyle = (status: string) => ({
  pending: "bg-amber-50 text-amber-800",
  released: "bg-emerald-50 text-emerald-800",
  paid: "bg-emerald-50 text-emerald-800",
  approved: "bg-blue-50 text-blue-800",
  processing: "bg-violet-50 text-violet-800",
  failed: "bg-red-50 text-red-800",
  rejected: "bg-red-50 text-red-800",
  frozen: "bg-blue-50 text-blue-800",
  order_cancelled: "bg-slate-100 text-slate-700",
  order_refund: "bg-red-50 text-red-800",
  cancelled: "bg-red-50 text-red-800",
  expired: "bg-slate-100 text-slate-600",
}[status] ?? "bg-slate-100 text-slate-700")

export function CashbackPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [selected, setSelected] = useState<ReferralCommission>()
  const [adjustment, setAdjustment] = useState("")
  const [reason, setReason] = useState("")
  const [firstRate, setFirstRate] = useState("25")
  const [futureRate, setFutureRate] = useState("8")
  const [futureMonths, setFutureMonths] = useState("12")
  const programQuery = useQuery({
    queryKey: ["referral-program-settings"],
    queryFn: () => apiFetch<{ program: ReferralProgram }>("/admin/referrals/program"),
  })
  useEffect(() => {
    if (!programQuery.data?.program) return
    setFirstRate(String(programQuery.data.program.first_order_rate_percent))
    setFutureRate(String(programQuery.data.program.future_order_rate_percent))
    setFutureMonths(String(programQuery.data.program.future_order_months))
  }, [programQuery.data?.program])
  const commissionsQuery = useQuery({
    queryKey: ["referral-commissions"],
    queryFn: () => apiFetch<{ commissions: ReferralCommission[] }>("/admin/referrals/commissions"),
  })
  const withdrawalsQuery = useQuery({
    queryKey: ["affiliate-withdrawals"],
    queryFn: () => apiFetch<{ withdrawals: WalletWithdrawal[] }>("/admin/wallet/withdrawals"),
  })
  const commissions = commissionsQuery.data?.commissions ?? []
  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return commissions.filter((commission) => {
      if (status !== "all" && commission.status !== status) return false
      if (!needle) return true
      return [commission.id, commission.order_id, commission.order_display_id, commission.referrer_customer_id, commission.referred_customer_id]
        .some((value) => String(value ?? "").toLowerCase().includes(needle))
    })
  }, [commissions, search, status])
  const action = useMutation({
    mutationFn: (input: { commission: ReferralCommission; action: CommissionAction }) => apiFetch(
      `/admin/referrals/commissions/${encodeURIComponent(input.commission.id)}/action`,
      {
        method: "POST",
        body: JSON.stringify({
          action: input.action,
          ...(input.action === "adjust" ? { amount: Number(adjustment) } : {}),
          reason: reason.trim() || undefined,
        }),
      }
    ),
    onSuccess: () => {
      setSelected(undefined)
      setAdjustment("")
      setReason("")
      void queryClient.invalidateQueries({ queryKey: ["referral-commissions"] })
    },
  })
  const withdrawalAction = useMutation({
    mutationFn: (input: { withdrawal: WalletWithdrawal; action: WithdrawalAction }) => apiFetch(
      `/admin/wallet/withdrawals/${encodeURIComponent(input.withdrawal.id)}/action`,
      { method: "POST", body: JSON.stringify({ action: input.action }) }
    ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["affiliate-withdrawals"] })
    },
  })
  const saveProgram = useMutation({
    mutationFn: () => apiFetch<{ program: ReferralProgram }>("/admin/referrals/program", {
      method: "POST",
      body: JSON.stringify({
        first_order_rate_percent: Number(firstRate),
        future_order_rate_percent: Number(futureRate),
        future_order_months: Number(futureMonths),
      }),
    }),
    onSuccess: (payload) => {
      queryClient.setQueryData(["referral-program-settings"], payload)
    },
  })
  const totals = commissions.reduce((result, commission) => {
    result[commission.status] = (result[commission.status] ?? 0) + commission.commission_amount
    return result
  }, {} as Record<string, number>)

  return <div className="space-y-6 p-6">
    <header><h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Affiliate commissions</h1><p className="mt-1 text-sm text-[var(--color-text-secondary)]">Review automatic referral earnings, freeze suspicious records, and correct approved amounts.</p></header>
    <Card>
      <div><h2 className="text-lg font-semibold text-slate-900">Store commission rules</h2><p className="mt-1 text-sm text-slate-500">Rates apply to newly completed referred orders. Existing released commissions are unchanged.</p></div>
      <div className="mt-5 grid gap-4 md:grid-cols-3"><Input label="First successful order (%)" type="number" min="0" max="100" step="0.01" value={firstRate} onChange={(event) => setFirstRate(event.target.value)} /><Input label="Future orders (%)" type="number" min="0" max="100" step="0.01" value={futureRate} onChange={(event) => setFutureRate(event.target.value)} /><Input label="Earning period (months)" type="number" min="1" max="60" step="1" value={futureMonths} onChange={(event) => setFutureMonths(event.target.value)} /></div>
      {saveProgram.error ? <p className="mt-3 text-sm text-red-600" role="alert">{saveProgram.error instanceof Error ? saveProgram.error.message : "Unable to save commission rules."}</p> : null}
      {saveProgram.isSuccess ? <p className="mt-3 text-sm text-emerald-700" role="status">Commission rules saved.</p> : null}
      <div className="mt-4"><Button onClick={() => saveProgram.mutate()} loading={saveProgram.isPending} disabled={programQuery.isLoading}>Save rules</Button></div>
    </Card>
    <div className="grid gap-4 sm:grid-cols-3">
      <Card><p className="text-xs font-semibold uppercase text-slate-500">Pending</p><p className="mt-2 text-2xl font-semibold text-slate-900">{money(totals.pending ?? 0)}</p></Card>
      <Card><p className="text-xs font-semibold uppercase text-slate-500">Released</p><p className="mt-2 text-2xl font-semibold text-emerald-700">{money(totals.released ?? 0)}</p></Card>
      <Card><p className="text-xs font-semibold uppercase text-slate-500">Under review</p><p className="mt-2 text-2xl font-semibold text-blue-700">{money(totals.frozen ?? 0)}</p></Card>
    </div>
    <Card>
      <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_190px]">
        <Input label="Find commission" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Order or customer ID" />
        <label className="block text-sm font-medium text-slate-700">Status<select className="mt-1 block h-10 w-full rounded-md border border-slate-300 bg-white px-3" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="pending">Pending</option><option value="released">Released</option><option value="frozen">Under review</option><option value="order_cancelled">Order cancelled</option><option value="order_refund">Order refund</option><option value="cancelled">Policy cancelled</option><option value="expired">Expired</option></select></label>
      </div>
      {commissionsQuery.isLoading ? <LoadingState label="Loading commissions..." /> : commissionsQuery.isError ? <ErrorState description="Unable to load affiliate commissions." actionLabel="Retry" onAction={() => void commissionsQuery.refetch()} /> : visible.length === 0 ? <EmptyState title="No commissions found" description="Paid referred orders will appear here automatically." /> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm">
        <thead><tr className="border-b text-xs uppercase text-slate-500"><th className="px-3 py-3">Order</th><th className="px-3 py-3">Referrer</th><th className="px-3 py-3">Eligible value</th><th className="px-3 py-3">Rate</th><th className="px-3 py-3">Commission</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Action</th></tr></thead>
        <tbody>{visible.map((commission) => <tr key={commission.id} className="border-b border-slate-100 align-top">
          <td className="px-3 py-4"><p className="font-semibold text-slate-900">{commission.order_display_id ? `#${commission.order_display_id}` : commission.order_id}</p><p className="mt-1 text-xs text-slate-500">{date(commission.order_created_at)}</p></td>
          <td className="px-3 py-4"><p className="font-mono text-xs text-slate-700">{commission.referrer_customer_id}</p><p className="mt-1 text-xs text-slate-400">Buyer: {commission.referred_customer_id}</p></td>
          <td className="px-3 py-4">{money(commission.eligible_amount, commission.currency_code)}</td>
          <td className="px-3 py-4">{commission.rate_percent}%{commission.is_first_order ? <span className="ml-1 text-xs text-emerald-700">First</span> : null}</td>
          <td className="px-3 py-4 font-semibold">{money(commission.commission_amount, commission.currency_code)}</td>
          <td className="px-3 py-4"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusStyle(commission.status)}`}>{commission.status.replaceAll("_", " ")}</span>{commission.reason ? <p className="mt-2 max-w-[180px] text-xs text-slate-500">{commission.reason}</p> : null}</td>
          <td className="px-3 py-4"><Button variant="secondary" size="sm" onClick={() => { setSelected(commission); setAdjustment(String(commission.commission_amount)); setReason(commission.reason ?? "") }}>Review</Button></td>
        </tr>)}</tbody>
      </table></div>}
    </Card>
    <Card>
      <div className="mb-5"><h2 className="text-lg font-semibold text-slate-900">PayPal withdrawal requests</h2><p className="mt-1 text-sm text-slate-500">Approve requests for the HKT monthly payout queue. Approved requests are processed automatically on the 20th.</p></div>
      {withdrawalsQuery.isLoading ? <LoadingState label="Loading withdrawals..." /> : withdrawalsQuery.isError ? <ErrorState description="Unable to load withdrawal requests." actionLabel="Retry" onAction={() => void withdrawalsQuery.refetch()} /> : !(withdrawalsQuery.data?.withdrawals.length) ? <EmptyState title="No withdrawal requests" description="Requests with at least USD 5 will appear here." /> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">
        <thead><tr className="border-b text-xs uppercase text-slate-500"><th className="px-3 py-3">Requested</th><th className="px-3 py-3">PayPal</th><th className="px-3 py-3">Amount</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Action</th></tr></thead>
        <tbody>{withdrawalsQuery.data?.withdrawals.map((withdrawal) => <tr key={withdrawal.id} className="border-b border-slate-100 align-top">
          <td className="px-3 py-4"><p className="font-mono text-xs text-slate-700">{withdrawal.id}</p><p className="mt-1 text-xs text-slate-500">{date(withdrawal.created_at)}</p></td>
          <td className="px-3 py-4">{withdrawal.paypal_email_masked ?? "Not available"}</td>
          <td className="px-3 py-4"><p className="font-semibold">{money(withdrawal.amount, withdrawal.currency_code)} requested</p><p className="mt-1 text-xs text-slate-500">{money(withdrawal.payout_amount, withdrawal.currency_code)} payout{withdrawal.fee !== null ? ` · ${money(withdrawal.fee, withdrawal.currency_code)} fee` : ""}</p></td>
          <td className="px-3 py-4"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusStyle(withdrawal.status)}`}>{withdrawal.status}</span>{withdrawal.error_message ? <p className="mt-2 max-w-[220px] text-xs text-red-600">{withdrawal.error_message}</p> : null}</td>
          <td className="px-3 py-4"><div className="flex flex-wrap gap-2">
            {withdrawal.status === "pending" ? <Button size="sm" onClick={() => withdrawalAction.mutate({ withdrawal, action: "approve" })}>Approve</Button> : null}
            {["pending", "approved", "failed"].includes(withdrawal.status) ? <Button size="sm" variant="danger" onClick={() => withdrawalAction.mutate({ withdrawal, action: "reject" })}>Reject</Button> : null}
            {withdrawal.status === "failed" ? <Button size="sm" variant="secondary" onClick={() => withdrawalAction.mutate({ withdrawal, action: "retry" })}>Retry</Button> : null}
          </div></td>
        </tr>)}</tbody>
      </table></div>}
      {withdrawalAction.error ? <p className="mt-3 text-sm text-red-600" role="alert">{withdrawalAction.error instanceof Error ? withdrawalAction.error.message : "Unable to update withdrawal."}</p> : null}
    </Card>
    {selected ? <Card>
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-lg font-semibold text-slate-900">Review {selected.order_display_id ? `order #${selected.order_display_id}` : selected.order_id}</h2><p className="mt-1 text-sm text-slate-500">Changes to a released amount create a matching wallet adjustment.</p></div><Button variant="ghost" onClick={() => setSelected(undefined)}>Close</Button></div>
      <div className="mt-5 grid gap-4 md:grid-cols-2"><Input label="USD commission amount" type="number" min="0" step="0.01" value={adjustment} onChange={(event) => setAdjustment(event.target.value)} /><Input label="Review reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason shown in the audit record" /></div>
      {action.error ? <p className="mt-3 text-sm text-red-600" role="alert">{action.error instanceof Error ? action.error.message : "Unable to update commission."}</p> : null}
      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={() => action.mutate({ commission: selected, action: "adjust" })} disabled={!Number.isFinite(Number(adjustment)) || Number(adjustment) < 0} loading={action.isPending}>Save adjustment</Button>
        {selected.status === "pending" ? <Button variant="secondary" onClick={() => action.mutate({ commission: selected, action: "freeze" })}>Freeze</Button> : null}
        {selected.status === "frozen" ? <Button variant="secondary" onClick={() => action.mutate({ commission: selected, action: "unfreeze" })}>Resume</Button> : null}
        {selected.status === "pending" ? <Button variant="secondary" onClick={() => action.mutate({ commission: selected, action: "release" })}>Release if eligible</Button> : null}
        {["pending", "frozen"].includes(selected.status) ? <Button variant="danger" onClick={() => action.mutate({ commission: selected, action: "cancel" })}>Cancel commission</Button> : null}
      </div>
    </Card> : null}
  </div>
}
