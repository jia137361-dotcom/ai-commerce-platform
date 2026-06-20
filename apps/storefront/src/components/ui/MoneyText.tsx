type MoneyTextProps = {
  amount?: number | null
  currencyCode?: string | null
  unavailableLabel?: string
  className?: string
}

export const formatMoneyValue = (
  amount?: number | null,
  currencyCode = "USD",
  unavailableLabel = "Not available"
) => {
  if (amount == null || !Number.isFinite(amount)) return unavailableLabel
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode.toUpperCase(),
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currencyCode.toUpperCase()}`
  }
}

export function MoneyText({
  amount,
  currencyCode = "USD",
  unavailableLabel = "Not available",
  className = "",
}: MoneyTextProps) {
  return (
    <span className={["buyer-ui-money", className].filter(Boolean).join(" ")}>
      {formatMoneyValue(amount, currencyCode ?? "USD", unavailableLabel)}
    </span>
  )
}
