import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Badge } from "../../components/ui/Badge"
import { Button } from "../../components/ui/Button"
import { Card } from "../../components/ui/Card"
import { EmptyState, ErrorState, LoadingState } from "../../components/ui/EmptyState"
import { Input } from "../../components/ui/Input"
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

  const couponsQuery = useQuery({
    queryKey: ["store-coupons"],
    queryFn: () => apiFetch<{ coupons: AdminCoupon[] }>("/admin/store-coupons"),
  })
  const { data, isLoading } = couponsQuery

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
    onError: () => {
      setError("We couldn't create that coupon. Check the fields and try again.")
    },
  })

  const archiveCoupon = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/admin/store-coupons/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "archived" }),
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["store-coupons"] }),
    onError: () => {
      setError("We couldn't archive that coupon. Please try again.")
    },
  })

  const copyCode = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedCode(value)
      window.setTimeout(() => setCopiedCode((current) => (current === value ? undefined : current)), 2000)
    } catch {
      setError("We couldn't copy the coupon code. Please copy it manually.")
    }
  }

  const coupons = data?.coupons ?? []

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Coupons</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Issue store vouchers for ciiverse buyers. Defaults: $1 no threshold, and $2 off when over $10.
        </p>
      </header>

      <Card className="bg-[var(--color-surface-muted)] text-sm text-[var(--color-text-primary)] shadow-none">
        <h2 className="font-semibold text-[var(--color-text-primary)]">How coupons reach buyers</h2>
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
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">Create exclusive coupon</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            label="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="$5 off when over $50"
            required
          />
          <Input
            label="Code"
            description="Optional. Leave blank to generate one."
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="SUMMER5"
            autoComplete="off"
          />
          <Input
            label="Discount amount (USD)"
            value={discountAmount}
            onChange={(event) => setDiscountAmount(event.target.value)}
            type="number"
            min="0.01"
            step="0.01"
            required
          />
          <Input
            label="Min subtotal"
            description="Use 0 for no threshold."
            value={minSubtotal}
            onChange={(event) => setMinSubtotal(event.target.value)}
            type="number"
            min="0"
            step="0.01"
          />
          <Input
            label="Grant quantity per claim"
            value={grantQuantity}
            onChange={(event) => setGrantQuantity(event.target.value)}
            type="number"
            min="1"
            required
          />
        </div>
        {error ? <p className="mt-3 text-sm font-medium text-[var(--color-danger)]">{error}</p> : null}
        <Button
          className="mt-5"
          disabled={!title.trim() || createCoupon.isPending}
          loading={createCoupon.isPending}
          onClick={() => createCoupon.mutate()}
        >
          Create coupon
        </Button>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">Issued coupons</h2>
        {isLoading ? <LoadingState label="Loading issued coupons..." /> : null}
        {couponsQuery.isError && !isLoading ? (
          <ErrorState
            title="Coupons could not load"
            description="Please retry the request."
            actionLabel="Retry"
            onAction={() => void couponsQuery.refetch()}
          />
        ) : null}
        {!isLoading && !couponsQuery.isError && !coupons.length ? (
          <EmptyState title="No coupons yet" description="Create an exclusive coupon to share a claim code with buyers." />
        ) : null}
        {!isLoading && !couponsQuery.isError && coupons.length ? (
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Offer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Claims</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-[var(--color-text-primary)]">{coupon.code}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--color-text-primary)]">{coupon.title}</div>
                    <div className="mt-1 text-[var(--color-text-secondary)]">
                      {coupon.amount_label} · {coupon.condition_label}
                      {coupon.is_default ? " · default" : " · exclusive (share code)"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={coupon.active ? "active" : coupon.status} />
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-primary)]">{coupon.claim_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      {!coupon.is_default ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void copyCode(coupon.code)}
                        >
                          {copiedCode === coupon.code ? "Copied" : "Copy code"}
                        </Button>
                      ) : null}
                      {coupon.status === "active" && !coupon.is_default ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={archiveCoupon.isPending}
                          onClick={() => archiveCoupon.mutate(coupon.id)}
                        >
                          Archive
                        </Button>
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
        ) : null}
      </Card>
    </div>
  )
}
