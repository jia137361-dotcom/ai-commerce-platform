import type { CartLineItem } from "../../lib/mock-data"

type CartDeleteConfirmProps = {
  item: CartLineItem
  deleting: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function CartDeleteConfirm({ item, deleting, onCancel, onConfirm }: CartDeleteConfirmProps) {
  return (
    <div className="buyer-cart-modal-backdrop" role="presentation">
      <section className="buyer-cart-delete-modal" role="dialog" aria-modal="true" aria-labelledby="cart-delete-title">
        <h2 id="cart-delete-title">Delete Item</h2>
        <p>Are you sure you want to delete this item? This action cannot be undone and will remove the selection from your boutique cart.</p>
        <small>{item.title}</small>
        <div>
          <button type="button" disabled={deleting} onClick={onCancel}>Cancel</button>
          <button type="button" disabled={deleting} onClick={onConfirm}>{deleting ? "Deleting..." : "Delete"}</button>
        </div>
      </section>
    </div>
  )
}
