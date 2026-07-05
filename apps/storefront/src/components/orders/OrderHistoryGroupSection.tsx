import { Card } from "../../components/ui/Card"
import { OrderHistoryCard } from "../../components/orders/OrderHistoryCard"
import type { BuyerOrderSummary } from "../../lib/buyer-api"
import type { OrderHistoryGroup } from "../../pages/orders/order-history-groups"

type OrderHistoryGroupSectionProps = {
  group: OrderHistoryGroup
  customerEmail?: string | null
  customerName?: string | null
  onConfirmReceipt?: (orderId: string) => Promise<void>
  onReviewSubmitted?: () => void
  onRefundSubmitted?: () => void
}

export function OrderHistoryGroupSection({
  group,
  customerEmail,
  customerName,
  onConfirmReceipt,
  onReviewSubmitted,
  onRefundSubmitted,
}: OrderHistoryGroupSectionProps) {
  if (group.kind === "single") {
    return (
      <OrderHistoryCard
        order={group.order}
        customerEmail={customerEmail}
        customerName={customerName}
        onConfirmReceipt={onConfirmReceipt}
        onReviewSubmitted={onReviewSubmitted}
        onRefundSubmitted={onRefundSubmitted}
      />
    )
  }

  return (
    <Card as="section" className="buyer-order-history-platform-group">
      <header className="buyer-order-history-platform-group-header">
        <div>
          <p>Multi-store checkout</p>
          <h2>{group.orders.length} linked orders</h2>
          <span>{group.platformCheckoutId}</span>
        </div>
      </header>
      <div className="buyer-order-history-platform-group-list">
        {group.orders.map((order: BuyerOrderSummary) => (
          <div key={order.orderId}>
            <OrderHistoryCard
              order={order}
              customerEmail={customerEmail}
              customerName={customerName}
              onConfirmReceipt={onConfirmReceipt}
              onReviewSubmitted={onReviewSubmitted}
              onRefundSubmitted={onRefundSubmitted}
            />
          </div>
        ))}
      </div>
    </Card>
  )
}
