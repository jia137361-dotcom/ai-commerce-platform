import { convertDisplayAmount, useBuyerDisplayRegion } from "../../lib/buyer-region-display"
import { MoneyText } from "./MoneyText"

type DisplayMoneyTextProps = {
  amount?: number | null
  sourceCurrencyCode?: string | null
  unavailableLabel?: string
  className?: string
}

export function DisplayMoneyText({
  amount,
  sourceCurrencyCode = "USD",
  unavailableLabel = "Not available",
  className = "",
}: DisplayMoneyTextProps) {
  const region = useBuyerDisplayRegion()
  return (
    <MoneyText
      amount={convertDisplayAmount(amount, sourceCurrencyCode ?? "USD", region.currencyCode)}
      currencyCode={region.currencyCode}
      unavailableLabel={unavailableLabel}
      className={className}
    />
  )
}
