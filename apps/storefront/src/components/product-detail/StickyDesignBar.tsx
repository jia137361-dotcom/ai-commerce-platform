import { MoneyText } from "../ui/MoneyText"

type StickyDesignBarProps = {
  amount?: number
  originalAmount?: number
  designHref: string
  disabled?: boolean
}

export function StickyDesignBar({ amount, originalAmount, designHref, disabled = false }: StickyDesignBarProps) {
  const showDiscount = originalAmount != null && amount != null && originalAmount > amount
  return (
    <div className="buyer-product-sticky-bar" role="region" aria-label="Purchase actions">
      <div className="buyer-product-sticky-price">
        {showDiscount ? (
          <>
            <MoneyText amount={amount} currencyCode="USD" unavailableLabel="—" />
            <del>${originalAmount?.toFixed(2)}</del>
          </>
        ) : (
          <MoneyText amount={amount} currencyCode="USD" unavailableLabel="Price unavailable" />
        )}
      </div>
      <a className="buyer-product-sticky-design" href={designHref} aria-disabled={disabled ? "true" : undefined}>
        Design now
      </a>
    </div>
  )
}
