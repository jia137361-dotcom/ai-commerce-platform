import type { OrderItem } from "../../lib/mock-data"

type ConfirmReceiptModalProps = {
  item: OrderItem
  onClose: () => void
}

export function ConfirmReceiptModal({ item, onClose }: ConfirmReceiptModalProps) {
  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose}>Close</button>
        <h2 id="confirm-title">Have you confirmed receipt of the goods?</h2>
        <div className="modal-product">
          <img src={item.imageUrl} alt={item.title} />
          <div>
            <strong>{item.title}</strong>
            <span>{item.price}</span>
          </div>
        </div>
        <p className="warning-text">
          To ensure your after-sales rights, please confirm receipt only after you have received the goods and found them to be correct.
        </p>
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Confirm</button>
          <button type="button" onClick={onClose}>Confirm & review</button>
        </div>
      </section>
    </div>
  )
}
