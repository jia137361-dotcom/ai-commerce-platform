import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { Button } from "../../components/ui/Button"
import { Card } from "../../components/ui/Card"
import { EmptyState, ErrorState, LoadingState } from "../../components/ui/EmptyState"
import { Input } from "../../components/ui/Input"
import { apiFetch } from "../../lib/api-client"

type CashbackBuyer = {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  preferred_currency: string | null
  paypal_account_bound: boolean
  balances: Array<{ currency_code: string; amount: number }>
}

type CashbackResult = {
  entry: { id: string; amount: number; currency_code: string; description: string | null }
  wallet: { balances: Array<{ currency_code: string; amount: number }> }
}

const currencies = ["hkd", "usd", "cny", "eur", "gbp", "cad", "aud", "jpy", "sgd", "myr"]
const money = (amount: number, currency: string) => new Intl.NumberFormat("en-HK", { style: "currency", currency: currency.toUpperCase() }).format(amount)

export function CashbackPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [customerId, setCustomerId] = useState("")
  const [amount, setAmount] = useState("1")
  const [currencyCode, setCurrencyCode] = useState("hkd")
  const [description, setDescription] = useState("Demo cashback")
  const [result, setResult] = useState<CashbackResult>()
  const buyersQuery = useQuery({
    queryKey: ["cashback-buyers"],
    queryFn: () => apiFetch<{ buyers: CashbackBuyer[] }>("/admin/buyer-cashback/buyers"),
  })
  const buyers = buyersQuery.data?.buyers ?? []
  const visibleBuyers = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return buyers
    return buyers.filter((buyer) => [buyer.id, buyer.email, buyer.first_name, buyer.last_name].some((value) => value?.toLowerCase().includes(needle)))
  }, [buyers, search])

  const grant = useMutation({
    mutationFn: () => apiFetch<CashbackResult>("/admin/buyer-cashback/credit", {
      method: "POST",
      body: JSON.stringify({ customer_id: customerId, amount: Number(amount), currency_code: currencyCode, description }),
    }),
    onSuccess: (payload) => {
      setResult(payload)
      void queryClient.invalidateQueries({ queryKey: ["cashback-buyers"] })
    },
  })

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Buyer cashback</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Manually credit a buyer wallet while referral rules are being integrated.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <Card>
          <div className="mb-4 flex items-end justify-between gap-4">
            <Input label="Find buyer" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Email, name or customer ID" />
            <span className="pb-2 text-xs text-slate-500">{visibleBuyers.length} buyers</span>
          </div>
          {buyersQuery.isLoading ? <LoadingState label="Loading buyers..." /> : buyersQuery.isError ? <ErrorState description="Unable to load buyers." actionLabel="Retry" onAction={() => void buyersQuery.refetch()} /> : visibleBuyers.length === 0 ? <EmptyState title="No buyers found" description="Try another email or customer ID." /> : (
            <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
              {visibleBuyers.map((buyer) => {
                const selected = customerId === buyer.id
                const name = [buyer.first_name, buyer.last_name].filter(Boolean).join(" ") || "Buyer"
                return <button key={buyer.id} type="button" onClick={() => setCustomerId(buyer.id)} className={`w-full rounded-md border p-3 text-left transition ${selected ? "border-brand bg-brand-light/50" : "border-slate-200 hover:border-slate-300"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="font-medium text-slate-900">{name}</p><p className="text-sm text-slate-600">{buyer.email ?? "No email"}</p><p className="mt-1 font-mono text-xs text-slate-400">{buyer.id}</p></div>
                    <div className="text-right text-xs text-slate-500"><p>{buyer.preferred_currency?.toUpperCase() ?? "Source currency"}</p><p>{buyer.paypal_account_bound ? "PayPal linked" : "No PayPal"}</p></div>
                  </div>
                  {buyer.balances.length ? <p className="mt-2 text-xs font-medium text-slate-700">{buyer.balances.map((balance) => money(balance.amount, balance.currency_code)).join(" · ")}</p> : null}
                </button>
              })}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Credit wallet</h2>
          <p className="mt-1 text-sm text-slate-500">The amount converts to the buyer's saved display currency using the development FX table.</p>
          <div className="mt-5 space-y-4">
            <Input label="Customer ID" value={customerId} onChange={(event) => setCustomerId(event.target.value)} placeholder="cus_..." required />
            <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-3">
              <Input label="Amount" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required />
              <label className="block text-sm font-medium text-slate-700">Currency<select className="mt-1 block h-10 w-full rounded-md border border-slate-300 bg-white px-3 uppercase" value={currencyCode} onChange={(event) => setCurrencyCode(event.target.value)}>{currencies.map((currency) => <option key={currency} value={currency}>{currency.toUpperCase()}</option>)}</select></label>
            </div>
            <Input label="Description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Referral cashback" />
            {grant.error ? <p className="text-sm text-red-600" role="alert">{grant.error instanceof Error ? grant.error.message : "Unable to credit wallet."}</p> : null}
            <Button onClick={() => grant.mutate()} disabled={!customerId || !Number(amount) || Number(amount) <= 0} loading={grant.isPending}>Add cashback</Button>
          </div>
          {result ? <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><p className="font-semibold">Cashback added</p><p>{money(result.entry.amount, result.entry.currency_code)} credited to the wallet.</p><p className="mt-1 text-xs">Ledger ID: {result.entry.id}</p></div> : null}
        </Card>
      </div>
    </div>
  )
}
