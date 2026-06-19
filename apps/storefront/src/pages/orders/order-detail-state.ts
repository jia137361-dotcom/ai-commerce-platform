import type {
  BuyerOrderCancellation,
  BuyerRefundRequestCapability,
} from "../../lib/buyer-api"

export const authenticatedOrderDetailHref = (orderId: string) =>
  `/account/orders/${encodeURIComponent(orderId)}`

export const resolveOrderDetailActions = (input: {
  isAuthenticated: boolean
  cancellation?: BuyerOrderCancellation
  refundRequest?: BuyerRefundRequestCapability
}) => ({
  showCancel: Boolean(input.isAuthenticated && input.cancellation?.allowed),
  showRequestRefund: Boolean(input.isAuthenticated && input.refundRequest?.allowed),
  showPendingRefund: Boolean(
    input.isAuthenticated && input.refundRequest?.openRequest
  ),
  showSearchAnotherOrder: !input.isAuthenticated,
})
