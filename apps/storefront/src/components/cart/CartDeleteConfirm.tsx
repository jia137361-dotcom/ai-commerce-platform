import type { BuyerCartItemView } from "../../lib/buyer-cart"
import { Button } from "../ui/Button"
import { Modal } from "../ui/Modal"

type CartDeleteConfirmProps = { item: BuyerCartItemView | null; deleting: boolean; error?: string; onCancel: () => void; onConfirm: () => void }

export function CartDeleteConfirm({ item, deleting, error, onCancel, onConfirm }: CartDeleteConfirmProps) {
  return (
    <Modal
      open={Boolean(item)}
      eyebrow="Cart item"
      title="Remove this item?"
      description={item ? `${item.title} will be removed from your cart.` : undefined}
      onClose={onCancel}
      footer={<><Button variant="secondary" disabled={deleting} onClick={onCancel}>Keep item</Button><Button variant="danger" loading={deleting} onClick={onConfirm}>{deleting ? "Removing..." : "Remove"}</Button></>}
    >
      {error ? <p className="buyer-cart-item-error" role="alert">{error}</p> : null}
    </Modal>
  )
}
