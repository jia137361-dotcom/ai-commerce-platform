import { formatBuyerMoney } from "../../lib/buyer-api"
import type { CartLineItem, StoreCart } from "../../lib/mock-data"

type CheckoutLineItemProps = {
  item: CartLineItem
  currencyCode: StoreCart["currencyCode"]
}

export function CheckoutLineItem({ item, currencyCode }: CheckoutLineItemProps) {
  const options = [
    item.colorName ? `Color: ${item.colorName}` : undefined,
    item.sizeName ? `Size: ${item.sizeName}` : undefined,
    item.variantTitle,
  ].filter(Boolean)

  return (
    <article className="buyer-checkout-line">
      <div className="buyer-checkout-line-image">
        {item.imageUrl ? <img src={item.imageUrl} alt={item.title} /> : <span>CG</span>}
        <strong>{item.quantity}</strong>
      </div>
      <div>
        <h3>{item.title}</h3>
        {options.length > 0 && <p>{options.join(" / ")}</p>}
      </div>
      <strong>{formatBuyerMoney(item.total, currencyCode)}</strong>
    </article>
  )
}
