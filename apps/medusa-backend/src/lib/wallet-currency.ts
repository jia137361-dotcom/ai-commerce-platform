const USD_RATES: Record<string, number> = {
  usd: 1, cny: 7.2, hkd: 7.8, eur: 0.92, gbp: 0.79, cad: 1.37, aud: 1.52,
  nzd: 1.65, jpy: 153, krw: 1370, twd: 32.4, sgd: 1.35, myr: 4.7, inr: 83,
  idr: 16200, thb: 36, php: 58, vnd: 25400, brl: 5.05, mxn: 16.8, aed: 3.67,
  sar: 3.75, zar: 18.4, chf: 0.9, sek: 10.5, nok: 10.7, dkk: 6.87, pln: 3.98,
  czk: 23.3, huf: 360, ron: 4.58, ils: 3.7, try: 32.2,
}

const ZERO_DECIMAL = new Set(["jpy", "krw", "vnd"])
const PAYPAL_PAYOUT_CURRENCIES = new Set([
  "aud", "brl", "cad", "czk", "dkk", "eur", "hkd", "jpy", "myr", "mxn", "nzd",
  "nok", "php", "pln", "gbp", "sgd", "sek", "chf", "thb", "usd",
])

export const walletCurrencyDigits = (currencyCode: string) =>
  ZERO_DECIMAL.has(currencyCode.trim().toLowerCase()) ? 0 : 2

export const isWalletCurrencySupported = (currencyCode: string) =>
  Boolean(USD_RATES[currencyCode.trim().toLowerCase()])

export const isPayPalPayoutCurrency = (currencyCode: string) =>
  PAYPAL_PAYOUT_CURRENCIES.has(currencyCode.trim().toLowerCase())

export const majorToMinor = (amount: number, currencyCode: string) =>
  Math.round(amount * 10 ** walletCurrencyDigits(currencyCode))

export const minorToMajor = (amountMinor: number, currencyCode: string) =>
  amountMinor / 10 ** walletCurrencyDigits(currencyCode)

export const convertWalletAmount = (amount: number, fromCurrency: string, toCurrency: string) => {
  const from = fromCurrency.trim().toLowerCase()
  const to = toCurrency.trim().toLowerCase()
  const fromRate = USD_RATES[from]
  const toRate = USD_RATES[to]
  if (!fromRate || !toRate) throw new Error(`Unsupported wallet currency conversion: ${from} to ${to}`)
  const converted = (amount / fromRate) * toRate
  return minorToMajor(majorToMinor(converted, to), to)
}

export const walletCurrencies = () => Object.keys(USD_RATES)
