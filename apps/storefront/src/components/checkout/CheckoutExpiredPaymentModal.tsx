import type { BuyerOrderSummary } from "../../lib/buyer-api"
import { Button } from "../ui/Button"
import { Modal } from "../ui/Modal"

export function CheckoutExpiredPaymentModal({
  open,
  order,
  loading,
  error,
  reordering,
  onReturn,
  onReorder,
}: {
  open: boolean
  order: BuyerOrderSummary | null
  loading: boolean
  error?: string
  reordering: boolean
  onReturn: () => void
  onReorder: () => void
}) {
  return (
    <Modal
      open={open}
      eyebrow="Payment expired"
      title="This payment window has ended"
      description="No payment was captured. The expired checkout cannot be resumed."
      onClose={onReturn}
      className="buyer-checkout-expired-modal"
      footer={
        <>
          <Button variant="secondary" onClick={onReturn}>Return to orders</Button>
          <Button loading={reordering} disabled={loading || !order || reordering} onClick={onReorder}>
            {reordering ? "Preparing reorder..." : "Reorder"}
          </Button>
        </>
      }
    >
      <p>
        {loading
          ? "Finding your unpaid order..."
          : order
            ? "Reorder creates a new checkout with these items and a new 15-minute payment window."
            : "Your unpaid order is available from Orders. Open it there to reorder its items."}
      </p>
      {error ? <p className="buyer-checkout-inline-error" role="alert">{error}</p> : null}
    </Modal>
  )
}
