import type {
  BuyerOrderCancellation,
  BuyerRefundRequestCapability,
} from "../../lib/buyer-api"
import { isCancelledOrderStatus } from "./order-status"

export const authenticatedOrderDetailHref = (orderId: string) =>
  `/account/orders/${encodeURIComponent(orderId)}`

export const resolveOrderDetailActions = (input: {
  isAuthenticated: boolean
  orderStatus?: string | null
  cancellation?: BuyerOrderCancellation
  refundRequest?: BuyerRefundRequestCapability
}) => {
  const cancelled = isCancelledOrderStatus(input.orderStatus)
  return {
    showCancel: Boolean(input.isAuthenticated && !cancelled && input.cancellation?.allowed),
    showRequestRefund: Boolean(input.isAuthenticated && !cancelled && input.refundRequest?.allowed),
    showPendingRefund: Boolean(
      input.isAuthenticated && !cancelled && input.refundRequest?.openRequest
    ),
    showSearchAnotherOrder: !input.isAuthenticated,
  }
}
