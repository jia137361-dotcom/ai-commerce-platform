import type { BuyerOrderDetail } from "../../lib/buyer-api"
import { resolveOrderDetailActions } from "../../pages/orders/order-detail-state"
import { paymentStatusPresentation } from "../../pages/orders/order-status"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { StatusBadge } from "../ui/StatusBadge"

type OrderDetailActionsProps = {
  order: BuyerOrderDetail
  isAuthenticated: boolean
  trackingHref: string
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
  const payment = paymentStatusPresentation(order.paymentStatus)

  return (
    <Card as="section" className="buyer-order-actions">
      <p className="buyer-order-kicker">Actions</p>
      <h2>Next steps</h2>
      {payment.description ? (
        <div className="buyer-order-payment-note">
          <StatusBadge tone={payment.tone}>{payment.label}</StatusBadge>
          <p>{payment.description}</p>
          {actionState.showCancel ? <p>You can cancel this order before capture or fulfillment.</p> : null}
        </div>
      ) : null}
      <Button href={trackingHref}>Track order</Button>
      {actionState.showCancel ? (
        <Button variant="danger" onClick={onCancel}>Cancel order</Button>
      ) : order.cancellation?.message && isAuthenticated ? (
        <p className="buyer-order-action-note">{order.cancellation.message}</p>
      ) : null}
      {actionState.showRequestRefund ? (
        <Button variant="secondary" onClick={onRequestRefund}>Request refund</Button>
      ) : actionState.showPendingRefund && order.refundRequest?.openRequest ? (
        <div className="buyer-order-refund-status">
          <strong>Refund requested</strong>
          <StatusBadge tone="warning">Pending review</StatusBadge>
          <small>
            Submitted {order.refundRequest.openRequest.createdAt
              ? new Date(order.refundRequest.openRequest.createdAt).toLocaleDateString()
              : "recently"}
          </small>
        </div>
      ) : null}
      {cancelSuccess ? <p className="buyer-order-action-success">{cancelSuccess}</p> : null}
      {cancelError ? <p className="buyer-order-error">{cancelError}</p> : null}
      {refundSuccess ? <p className="buyer-order-action-success">{refundSuccess}</p> : null}
      {refundError ? <p className="buyer-order-error">{refundError}</p> : null}
      <Button variant="secondary" href="/store">Back to store</Button>
      {actionState.showSearchAnotherOrder ? (
        <Button variant="ghost" href="/orders/lookup">Search another order</Button>
      ) : (
        <Button variant="ghost" href="/account/orders">Back to orders</Button>
      )}
    </Card>
  )
}
