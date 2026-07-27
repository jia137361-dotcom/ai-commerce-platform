import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { apiFetch } from "../../lib/api-client"

type AdminCoupon = {
  id: string
  code: string
  title: string
  description?: string | null
  discount_amount: number
  min_subtotal: number
  amount_label: string
  condition_label: string
  scope: string
  status: string
  is_default: boolean
  grant_quantity: number
  claim_count: number
  ends_at?: string | null
  active: boolean
}

export function CouponsPage() {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState("")
  const [discountAmount, setDiscountAmount] = useState("2")
  const [minSubtotal, setMinSubtotal] = useState("10")
  const [grantQuantity, setGrantQuantity] = useState("5")
  const [code, setCode] = useState("")
  const [error, setError] = useState<string>()
  const [copiedCode, setCopiedCode] = useState<string>()

  const { data, isLoading } = useQuery({
    queryKey: ["store-coupons"],
    queryFn: () => apiFetch<{ coupons: AdminCoupon[] }>("/admin/store-coupons"),
  })

  const createCoupon = useMutation({
    mutationFn: () =>
      apiFetch<{ coupon: AdminCoupon }>("/admin/store-coupons", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          code: code.trim() || undefined,
          discount_amount: Number(discountAmount),
          min_subtotal: Number(minSubtotal),
          grant_quantity: Number(grantQuantity),
          coupon_type: "goods_voucher",
          scope: "all_store",
        }),
      }),
    onSuccess: () => {
      setTitle("")
      setCode("")
      setError(undefined)
      void queryClient.invalidateQueries({ queryKey: ["store-coupons"] })
    },
    onError: (reason) => {
      setError(reason instanceof Error ? reason.message : "Unable to create coupon")
    },
  })

  const archiveCoupon = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/admin/store-coupons/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "archived" }),
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["store-coupons"] }),
  })

  const copyCode = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedCode(value)
      window.setTimeout(() => setCopiedCode((current) => (current === value ? undefined : current)), 2000)
    } catch {
      setError(`Unable to copy code ${value}`)
    }
  }

  const coupons = data?.coupons ?? []

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Coupons</h1>
        <p className="mt-1 text-sm text-slate-600">
          Issue store vouchers for ciiverse buyers. Defaults: $1 no threshold, and $2 off when over $10.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <h2 className="font-semibold text-slate-900">How coupons reach buyers</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong>Default coupons</strong> (platform seeds): auto-added to a buyer wallet when they open{" "}
            <em>My coupons</em>.
          </li>
          <li>
            <strong>Exclusive coupons</strong> you create here: not auto-sent. Share the{" "}
            <strong>code</strong> with buyers; they enter it in <em>My coupons</em> to claim, then select it at
            checkout.
          </li>
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Create exclusive coupon</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            Title
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="$5 off when over $50"
            />
          </label>
          <label className="text-sm">
            Code (optional)
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="SUMMER5"
            />
          </label>
          <label className="text-sm">
            Discount amount (USD)
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={discountAmount}
              onChange={(event) => setDiscountAmount(event.target.value)}
              type="number"
              min="0.01"
              step="0.01"
            />
          </label>
          <label className="text-sm">
            Min subtotal (0 = no threshold)
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={minSubtotal}
              onChange={(event) => setMinSubtotal(event.target.value)}
              type="number"
              min="0"
              step="0.01"
            />
          </label>
          <label className="text-sm">
            Grant quantity per claim
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={grantQuantity}
              onChange={(event) => setGrantQuantity(event.target.value)}
              type="number"
              min="1"
            />
          </label>
        </div>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        <button
          type="button"
          className="mt-4 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
          disabled={!title.trim() || createCoupon.isPending}
          onClick={() => createCoupon.mutate()}
        >
          {createCoupon.isPending ? "Creating…" : "Create coupon"}
        </button>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Issued coupons</h2>
        {isLoading ? <p className="text-sm text-slate-500">Loading…</p> : null}
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b text-slate-500">
              <tr>
                <th className="py-2 pr-3">Code</th>
                <th className="py-2 pr-3">Offer</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Claims</th>
                <th className="py-2 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon.id} className="border-b border-slate-100">
                  <td className="py-3 pr-3 font-mono text-xs">{coupon.code}</td>
                  <td className="py-3 pr-3">
                    <div className="font-medium">{coupon.title}</div>
                    <div className="text-slate-500">
                      {coupon.amount_label} · {coupon.condition_label}
                      {coupon.is_default ? " · default" : " · exclusive (share code)"}
                    </div>
                  </td>
                  <td className="py-3 pr-3">{coupon.active ? "Active" : coupon.status}</td>
                  <td className="py-3 pr-3">{coupon.claim_count}</td>
                  <td className="py-3 pr-3">
                    <div className="flex flex-wrap items-center gap-3">
                      {!coupon.is_default ? (
                        <button
                          type="button"
                          className="text-slate-700 hover:underline"
                          onClick={() => void copyCode(coupon.code)}
                        >
                          {copiedCode === coupon.code ? "Copied" : "Copy code"}
                        </button>
                      ) : null}
                      {coupon.status === "active" && !coupon.is_default ? (
                        <button
                          type="button"
                          className="text-orange-600 hover:underline"
                          onClick={() => archiveCoupon.mutate(coupon.id)}
                        >
                          Archive
                        </button>
                      ) : coupon.is_default ? (
                        "—"
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
