import { MoneyText } from "../ui/MoneyText"
import { convertDisplayAmount, useBuyerDisplayPreferences } from "../../lib/buyer-display-preferences"

type StickyDesignBarProps = {
  amount?: number
  originalAmount?: number
  designHref: string
  disabled?: boolean
}

export function StickyDesignBar({ amount, originalAmount, designHref, disabled = false }: StickyDesignBarProps) {
  const { displayCurrencyCode } = useBuyerDisplayPreferences()
  const displayAmount = amount == null ? undefined : convertDisplayAmount(amount, "usd", displayCurrencyCode)
  const displayOriginalAmount = originalAmount == null ? undefined : convertDisplayAmount(originalAmount, "usd", displayCurrencyCode)
  const showDiscount = originalAmount != null && amount != null && originalAmount > amount
  return (
    <div className="buyer-product-sticky-bar" role="region" aria-label="Purchase actions">
      <div className="buyer-product-sticky-price">
        {showDiscount ? (
          <>
            <MoneyText amount={displayAmount} currencyCode={displayCurrencyCode} unavailableLabel="—" />
            <del><MoneyText amount={displayOriginalAmount} currencyCode={displayCurrencyCode} /></del>
          </>
        ) : (
          <MoneyText amount={displayAmount} currencyCode={displayCurrencyCode} unavailableLabel="Price unavailable" />
        )}
      </div>
      <a className="buyer-product-sticky-design" href={designHref} aria-disabled={disabled ? "true" : undefined}>
        Design now
      </a>
    </div>
  )
}
