import type { CartLineItem, StoreCart } from "../../lib/mock-data"
import { DisplayMoneyText } from "../ui/DisplayMoneyText"
import { QuantityStepper } from "./QuantityStepper"

type CartLineProps = {
  item: CartLineItem
  currencyCode: StoreCart["currencyCode"]
  updating: boolean
  onQuantityChange: (lineId: string, quantity: number) => void
  onDeleteRequest: (item: CartLineItem) => void
}

export function CartLine({ item, currencyCode, updating, onQuantityChange, onDeleteRequest }: CartLineProps) {
  const specs = [
    item.colorName ? `${item.colorName} color` : undefined,
    item.sizeName,
    item.variantTitle,
    ...(item.selectedOptions ?? []).map((option) => `${option.name}: ${option.value}`),
  ].filter(Boolean)

  return (
    <article className="buyer-cart-line">
      <label className="buyer-cart-line-check">
        <input type="checkbox" defaultChecked />
        <span />
      </label>
      <a className="buyer-cart-line-image" href={item.productId ? `/products/${encodeURIComponent(item.productId)}` : "/store"}>
        {item.imageUrl ? <img src={item.imageUrl} alt={item.title} /> : <span>CG</span>}
      </a>
      <div className="buyer-cart-line-body">
        <h2>{item.title}</h2>
        <p><b>#1 Best Seller</b> <span>in Beauty & Personal Care</span></p>
        <p>In Stock</p>
        <p>FREE delivery <strong>Tue, Jun 2</strong> on eligible orders</p>
        <p>FREE Returns</p>
        <label className="buyer-cart-gift">
          <input type="checkbox" />
          <span>This is a gift</span>
          <a href="/help">Learn more</a>
        </label>
        <strong className="buyer-cart-specs">{specs.length ? specs.join("; ") : "Default options"}</strong>
        <div className="buyer-cart-line-actions">
          <QuantityStepper quantity={item.quantity} disabled={updating} onChange={(quantity) => onQuantityChange(item.id, quantity)} />
          <button type="button" disabled={updating} onClick={() => onDeleteRequest(item)}>Delete</button>
          <button type="button" disabled={updating}>Save for later</button>
          <button type="button" disabled={updating}>Share</button>
        </div>
      </div>
      <div className="buyer-cart-line-price">
        <strong><DisplayMoneyText amount={item.total || item.unitPrice} sourceCurrencyCode={currencyCode} /></strong>
        <span><DisplayMoneyText amount={item.unitPrice} sourceCurrencyCode={currencyCode} /> each</span>
      </div>
    </article>
  )
}
