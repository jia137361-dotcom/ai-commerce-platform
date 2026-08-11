import type { BuyerOrderSummary } from "../../lib/buyer-api"
import { Button } from "../ui/Button"
import { OrderPreviewImage } from "./OrderPreviewImage"

type ConfirmDeliverySheetProps = {
  open: boolean
  order: BuyerOrderSummary
  confirming?: boolean
  error?: string
  onClose: () => void
  onConfirm: () => void
  onConfirmAndReview: () => void
}

export function ConfirmDeliverySheet({
  open,
  order,
  confirming = false,
  error,
  onClose,
  onConfirm,
  onConfirmAndReview,
}: ConfirmDeliverySheetProps) {
  if (!open) return null
  const preview = order.previewItems[0]

  return (
    <div className="buyer-order-confirm-sheet" role="dialog" aria-modal="true" aria-labelledby="confirm-delivery-title">
      <button type="button" className="buyer-order-confirm-sheet-backdrop" aria-label="Close" onClick={onClose} />
      <div className="buyer-order-confirm-sheet-panel">
        <button type="button" className="buyer-order-confirm-sheet-close" aria-label="Close" onClick={onClose}>
          ×
        </button>
        <h2 id="confirm-delivery-title">Have you confirmed receipt of the goods?</h2>
        {preview ? (
          <div className="buyer-order-confirm-sheet-preview">
            <OrderPreviewImage thumbnail={preview.thumbnail} productId={preview.productId} title={preview.title} />
            <span>x{preview.quantity}</span>
          </div>
        ) : null}
        <p>
          To ensure your after-sales rights, please confirm receipt only after you have received the goods and found them
          to be correct.
        </p>
        {error ? <p className="buyer-order-error">{error}</p> : null}
        <div className="buyer-order-confirm-sheet-actions">
          <Button variant="secondary" disabled={confirming} onClick={onConfirm}>
            {confirming ? "Confirming…" : "Confirm"}
          </Button>
          <Button disabled={confirming} onClick={onConfirmAndReview}>
            {confirming ? "Confirming…" : "Confirm & review"}
          </Button>
        </div>
      </div>
    </div>
  )
}
