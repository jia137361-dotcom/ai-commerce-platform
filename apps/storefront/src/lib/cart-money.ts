export const normalizeMedusaCartMoney = (
  value: number | string | null | undefined
): number | undefined => {
  if (value == null || value === "") return undefined
  const numeric = typeof value === "number" ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : undefined
}
