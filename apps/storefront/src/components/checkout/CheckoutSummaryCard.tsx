import type { StoreCart } from "../../lib/mock-data"
import type { BuyerCoupon, CheckoutPricingBreakdown } from "../../lib/buyer-api"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { MoneyText } from "../ui/MoneyText"
import { CheckoutItemList } from "./CheckoutItemList"

type CheckoutSummaryCardProps = {
  cart: StoreCart
  canPlaceOrder: boolean
  onPlaceOrder: () => void
  placing: boolean
  showPayButton?: boolean
  shippingAmount?: number
  pricing?: CheckoutPricingBreakdown | null
  coupons?: BuyerCoupon[]
  couponsLoading?: boolean
  onApplyCoupon?: (walletId: string) => void
  onClearCoupon?: () => void
  couponError?: string
}

export function CheckoutSummaryCard({
  cart,
  canPlaceOrder,
  onPlaceOrder,
  placing,
  showPayButton = true,
  shippingAmount,
  pricing,
  coupons = [],
  couponsLoading = false,
  onApplyCoupon,
  onClearCoupon,
  couponError,
}: CheckoutSummaryCardProps) {
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = pricing?.merchandiseSubtotal ?? (cart.hasSubtotal === false ? undefined : cart.subtotal)
  const shipping =
    pricing?.shippingTotal ??
    (shippingAmount == null ? undefined : shippingAmount)
  const couponDiscount = pricing?.couponDiscount ?? 0
  const planDiscount = pricing?.planDiscount ?? 0
  const discountTotal = pricing?.discountTotal ?? couponDiscount + planDiscount
  const displayTotal =
    pricing?.payableTotal ??
    (subtotal != null && shipping != null
      ? Math.round((subtotal + shipping - discountTotal) * 100) / 100
      : cart.hasTotal === false
        ? undefined
        : cart.total)

  const usableCoupons = coupons.filter((coupon) => coupon.status === "available" || coupon.status === "reserved")

  return (
    <Card as="aside" className="buyer-checkout-summary-card">
      <header>
        <p>Order summary</p>
        <h2>
          {itemCount} item{itemCount === 1 ? "" : "s"}
        </h2>
      </header>
      <CheckoutItemList cart={cart} />

      <section className="buyer-checkout-coupons" aria-label="Coupons">
        <header>
          <strong>Ciiverse coupon</strong>
          {pricing?.appliedCoupon ? (
            <button type="button" className="buyer-checkout-coupon-clear" onClick={onClearCoupon}>
              Remove
            </button>
          ) : null}
        </header>
        {couponsLoading ? <p className="buyer-checkout-card-copy">Loading coupons…</p> : null}
        {couponError ? (
          <p className="buyer-checkout-inline-error" role="alert">
            {couponError}
          </p>
        ) : null}
        {pricing?.appliedCoupon ? (
          <div className="buyer-checkout-coupon-ticket buyer-checkout-coupon-ticket--applied">
            <span>
              <strong>
                −<MoneyText amount={couponDiscount} currencyCode={cart.currencyCode} />
              </strong>
              <small>Applied</small>
            </span>
            <p>
              <b>{pricing.appliedCoupon.title}</b>
              <small>{pricing.appliedCoupon.minSubtotal > 0 ? `When over $${pricing.appliedCoupon.minSubtotal}` : "No condition"}</small>
            </p>
          </div>
        ) : usableCoupons.length ? (
          <div className="buyer-checkout-coupon-options">
            {usableCoupons.slice(0, 4).map((coupon) => (
              <button
                key={coupon.walletId ?? coupon.couponId}
                type="button"
                disabled={!coupon.walletId}
                onClick={() => coupon.walletId && onApplyCoupon?.(coupon.walletId)}
              >
                <span>
                  <strong>{coupon.amountLabel}</strong>
                  <small>{coupon.conditionLabel}</small>
                </span>
                <b>Use</b>
              </button>
            ))}
          </div>
        ) : (
          <p className="buyer-checkout-card-copy">
            No coupons yet. Claim defaults in <a href="/account/coupons">My coupons</a>.
          </p>
        )}
      </section>

      <dl>
        <div>
          <dt>Subtotal</dt>
          <dd>
            <MoneyText amount={subtotal} currencyCode={cart.currencyCode} />
          </dd>
        </div>
        <div>
          <dt>Shipping</dt>
          <dd>
            {shipping == null ? "Pending" : <MoneyText amount={shipping} currencyCode={cart.currencyCode} />}
          </dd>
        </div>
        {couponDiscount > 0 ? (
          <div>
            <dt>Coupon</dt>
            <dd>
              −
              <MoneyText amount={couponDiscount} currencyCode={cart.currencyCode} />
            </dd>
          </div>
        ) : null}
        {planDiscount > 0 ? (
          <div>
            <dt>Plan discount ({pricing?.planDiscountPercent ?? 0}%)</dt>
            <dd>
              −
              <MoneyText amount={planDiscount} currencyCode={cart.currencyCode} />
            </dd>
          </div>
        ) : null}
        <div className="total">
          <dt>Total</dt>
          <dd>
            <MoneyText amount={displayTotal} currencyCode={cart.currencyCode} />
          </dd>
        </div>
      </dl>
      {showPayButton ? (
        <Button loading={placing} disabled={!canPlaceOrder || placing} onClick={onPlaceOrder}>
          {placing ? "Processing payment..." : "Pay now"}
        </Button>
      ) : null}
    </Card>
  )
}
