import type { BuyerCartItemView } from "../../lib/buyer-cart"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { MoneyText } from "../ui/MoneyText"
import { StatusBadge } from "../ui/StatusBadge"
import { QuantityStepper } from "./QuantityStepper"

type CartItemCardProps = {
  item: BuyerCartItemView
  currencyCode: string
  updating: boolean
  error?: string
  onQuantityChange: (lineId: string, quantity: number) => void
  onDeleteRequest: (lineId: string) => void
  selected?: boolean
  onSelectedChange?: (selected: boolean) => void
}

export function CartItemCard({
  item,
  currencyCode,
  updating,
  error,
  onQuantityChange,
  onDeleteRequest,
  selected = true,
  onSelectedChange,
}: CartItemCardProps) {
  return (
    <Card as="article" className="buyer-cart-item-card">
      <label className="buyer-cart-item-select">
        <input
          type="checkbox"
          checked={selected}
          onChange={(event) => onSelectedChange?.(event.target.checked)}
        />
        <span className="buyer-cart-sr-only">Select {item.title} for checkout</span>
      </label>
      <a className="buyer-cart-item-media" href={item.productHref} aria-label={`View ${item.title}`}>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.title} />
        ) : (
          <span role="img" aria-label="Product image unavailable">
            No image
          </span>
        )}
      </a>
      <div className="buyer-cart-item-content">
        <div className="buyer-cart-item-heading">
          <div>
            <h2>
              <a href={item.productHref}>{item.title}</a>
            </h2>
            {item.variantLabel ? <p>{item.variantLabel}</p> : <p>Variant unavailable</p>}
          </div>
          <MoneyText amount={item.lineTotal} currencyCode={currencyCode} unavailableLabel="Price unavailable" />
        </div>
        <div className="buyer-cart-item-status">
          <StatusBadge tone={item.isAvailable ? "success" : "warning"}>{item.isAvailable ? "Available" : "Unavailable"}</StatusBadge>
          {item.unitPrice != null ? (
            <span>
              <MoneyText amount={item.unitPrice} currencyCode={currencyCode} /> each
            </span>
          ) : (
            <span>Unit price unavailable</span>
          )}
        </div>
        {!item.isAvailable && item.unavailableReason ? <p className="buyer-cart-item-warning">{item.unavailableReason}</p> : null}
        {error ? <p className="buyer-cart-item-error" role="alert">{error}</p> : null}
        <div className="buyer-cart-item-actions">
          <QuantityStepper quantity={item.quantity} disabled={updating || !item.isAvailable} onChange={(quantity) => onQuantityChange(item.id, quantity)} />
          <Button variant="ghost" disabled={updating} onClick={() => onDeleteRequest(item.id)}>
            Remove
          </Button>
        </div>
      </div>
    </Card>
  )
}
