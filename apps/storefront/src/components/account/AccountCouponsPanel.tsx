import { useEffect, useMemo, useState } from "react"
import {
  claimCouponByCode,
  fetchMyCoupons,
  type BuyerCoupon,
} from "../../lib/buyer-api"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { EmptyState, ErrorState, LoadingState } from "../ui/States"
import { Modal } from "../ui/Modal"
import { FormField } from "../ui/FormField"

const TABS = [
  { id: "all", label: "All" },
  { id: "shopping", label: "Shopping" },
  { id: "expiring", label: "Expiring soon" },
  { id: "goods", label: "Goods voucher" },
] as const

const formatExpiry = (value: string | null) => {
  if (!value) return "No expiry"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (n: number) => String(n).padStart(2, "0")
  return `Until ${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function AccountCouponsPanel() {
  const [bucket, setBucket] = useState<(typeof TABS)[number]["id"]>("all")
  const [coupons, setCoupons] = useState<BuyerCoupon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [claimCode, setClaimCode] = useState("")
  const [claiming, setClaiming] = useState(false)
  const [detail, setDetail] = useState<BuyerCoupon | null>(null)

  const load = async (nextBucket = bucket) => {
    setLoading(true)
    setError(undefined)
    try {
      setCoupons(await fetchMyCoupons(nextBucket))
    } catch {
      setCoupons([])
      setError("We couldn't load your coupons. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(bucket)
  }, [bucket])

  const available = useMemo(
    () => coupons.filter((coupon) => coupon.status === "available" || coupon.status === "reserved"),
    [coupons]
  )

  const submitClaim = async () => {
    if (!claimCode.trim() || claiming) return
    setClaiming(true)
    setError(undefined)
    try {
      await claimCouponByCode(claimCode.trim())
      setClaimCode("")
      await load(bucket)
    } catch {
      setError("We couldn't claim that coupon. Check the code and try again.")
    } finally {
      setClaiming(false)
    }
  }

  return (
    <Card as="section" className="buyer-account-settings-panel buyer-coupons-panel">
      <header>
        <a href="/account" aria-label="Back to account">
          ←
        </a>
        <h1>My coupons</h1>
      </header>

      <form
        className="buyer-coupons-claim"
        onSubmit={(event) => {
          event.preventDefault()
          void submitClaim()
        }}
      >
        <FormField
          className="buyer-coupons-code-field"
          label="Coupon code"
          value={claimCode}
          onChange={(event) => setClaimCode(event.target.value)}
          placeholder="Enter coupon code"
          autoComplete="off"
        />
        <Button type="submit" loading={claiming} disabled={!claimCode.trim()}>
          Claim
        </Button>
      </form>

      <div className="buyer-coupons-tabs" role="tablist" aria-label="Coupon filters">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={bucket === tab.id}
            className={bucket === tab.id ? "active" : ""}
            onClick={() => setBucket(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? <LoadingState label="Loading coupons..." /> : null}
      {error && !loading ? (
        <ErrorState
          className="buyer-coupons-feedback"
          title="Coupon action needs attention"
          message={error}
          action={{ label: "Retry", onClick: () => void load(bucket) }}
        />
      ) : null}

      {!loading && !available.length ? (
        <EmptyState
          className="buyer-coupons-empty"
          title="No coupons available"
          message="Store vouchers from ciiverse will appear here after you claim them."
          icon={<span aria-hidden="true">%</span>}
        />
      ) : null}

      <div className="buyer-coupons-list">
        {available.map((coupon) => (
          <section key={coupon.walletId ?? coupon.couponId} className="buyer-coupon-entry">
            <header className="buyer-coupon-store-row">
              <span aria-hidden="true">{coupon.storeName.slice(0, 1).toUpperCase()}</span>
              <strong>{coupon.storeName}</strong>
              <small>
                {coupon.quantity} voucher{coupon.quantity === 1 ? "" : "s"}
              </small>
            </header>
            <article className="buyer-coupon-card">
              <button
                type="button"
                className="buyer-coupon-card-value"
                onClick={() => setDetail(coupon)}
                aria-label={`Open details for ${coupon.title}`}
              >
                <strong>{coupon.amountLabel}</strong>
                <span>{coupon.conditionLabel}</span>
              </button>
              <div className="buyer-coupon-card-body">
                <strong>{coupon.couponType === "shopping" ? "Shopping voucher" : "Goods voucher"}</strong>
                <p>{formatExpiry(coupon.expiresAt)}</p>
                <p>{coupon.scopeLabel}</p>
              </div>
              <Button href="/checkout" variant="danger">
                Use
              </Button>
            </article>
          </section>
        ))}
      </div>

      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title="Coupon detail">
        {detail ? (
          <div className="buyer-coupon-detail">
            <div className="buyer-coupon-detail-hero">
              <strong>
                {detail.amountLabel} {detail.conditionLabel === "No condition" ? "off, no condition" : detail.conditionLabel}
              </strong>
              <p>{detail.title}</p>
              <p>{formatExpiry(detail.expiresAt)}</p>
              <p>{detail.scopeLabel}</p>
            </div>
            <h3>Applicable products</h3>
            <p className="buyer-coupon-detail-copy">
              {detail.scope === "products" && detail.productIds.length
                ? `This voucher applies to ${detail.productIds.length} selected product(s).`
                : "All items in this store can use this voucher at checkout when the order meets the condition."}
            </p>
            <Button href="/checkout">Use at checkout</Button>
          </div>
        ) : null}
      </Modal>
    </Card>
  )
}
