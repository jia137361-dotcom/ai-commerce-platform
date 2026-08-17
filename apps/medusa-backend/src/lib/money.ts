const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
])

const THREE_DECIMAL_CURRENCIES = new Set(["bhd", "jod", "kwd", "omr", "tnd"])

const numericAmount = (value: unknown): number => {
  const amount = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Invalid money amount")
  }
  return amount
}

export const currencyExponent = (currencyCode: string): number => {
  const currency = currencyCode.trim().toLowerCase()
  if (ZERO_DECIMAL_CURRENCIES.has(currency)) return 0
  if (THREE_DECIMAL_CURRENCIES.has(currency)) return 3
  return 2
}

export const normalizeMajor = (value: unknown, currencyCode: string): number => {
  const exponent = currencyExponent(currencyCode)
  const multiplier = 10 ** exponent
  return Math.round(numericAmount(value) * multiplier) / multiplier
}

export const majorToProviderMinor = (value: unknown, currencyCode: string): number => {
  const multiplier = 10 ** currencyExponent(currencyCode)
  return Math.round(normalizeMajor(value, currencyCode) * multiplier)
}

export const providerMinorToMajor = (value: unknown, currencyCode: string): number => {
  const multiplier = 10 ** currencyExponent(currencyCode)
  return normalizeMajor(numericAmount(value) / multiplier, currencyCode)
}

export const moneyEquals = (left: unknown, right: unknown, currencyCode: string): boolean =>
  majorToProviderMinor(left, currencyCode) === majorToProviderMinor(right, currencyCode)
