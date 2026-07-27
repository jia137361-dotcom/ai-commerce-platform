import type { BuyerOrderDetail } from "../../lib/buyer-api"
import { resolveOrderDetailActions } from "../../pages/orders/order-detail-state"
import { Button } from "../ui/Button"
import { StatusBadge } from "../ui/StatusBadge"

type OrderDetailActionsProps = {
  order: BuyerOrderDetail
  isAuthenticated: boolean
  trackingHref: string
  orderAgainHref?: string
  onOrderAgain?: () => void
  orderAgainLoading?: boolean
  orderAgainError?: string
  onCancel: () => void
  onRequestRefund: () => void
  cancelSuccess?: string
  cancelError?: string
  refundSuccess?: string
  refundError?: string
}

export function OrderDetailActions({
  order,
  isAuthenticated,
  trackingHref,
  orderAgainHref,
  onOrderAgain,
  orderAgainLoading = false,
  orderAgainError,
  onCancel,
  onRequestRefund,
  cancelSuccess,
  cancelError,
  refundSuccess,
  refundError,
}: OrderDetailActionsProps) {
  const actionState = resolveOrderDetailActions({
    isAuthenticated,
    orderStatus: order.status,
    cancellation: order.cancellation,
    refundRequest: order.refundRequest,
  })

  return (
    <>
      <section className="buyer-order-actions buyer-order-actions--inline">
        <Button variant="secondary" href={trackingHref}>
          View logistic
        </Button>
        {actionState.showCancel ? (
          <Button variant="secondary" onClick={onCancel}>
            Cancel order
          </Button>
        ) : null}
        {actionState.showRequestRefund ? (
          <Button variant="secondary" onClick={onRequestRefund}>
            Request refund
          </Button>
        ) : null}
        {actionState.showPendingRefund && order.refundRequest?.openRequest ? (
          <div className="buyer-order-refund-status">
            <strong>Refund requested</strong>
            <StatusBadge tone="warning">Pending review</StatusBadge>
          </div>
        ) : null}
        {actionState.showSearchAnotherOrder ? (
          <Button variant="ghost" href="/orders/lookup">
            Search another order
          </Button>
        ) : null}
        {cancelSuccess ? <p className="buyer-order-action-success">{cancelSuccess}</p> : null}
        {cancelError ? <p className="buyer-order-error">{cancelError}</p> : null}
        {refundSuccess ? <p className="buyer-order-action-success">{refundSuccess}</p> : null}
        {refundError ? <p className="buyer-order-error">{refundError}</p> : null}
        {orderAgainError ? <p className="buyer-order-error">{orderAgainError}</p> : null}
      </section>

      <div className="buyer-order-detail-sticky-bar">
        {onOrderAgain ? (
          <Button variant="secondary" loading={orderAgainLoading} onClick={() => onOrderAgain()}>
            {orderAgainLoading ? "Preparing cart..." : "Order again"}
          </Button>
        ) : (
          <Button variant="secondary" href={orderAgainHref ?? "/store"}>
            Order again
          </Button>
        )}
      </div>
    </>
  )
}
