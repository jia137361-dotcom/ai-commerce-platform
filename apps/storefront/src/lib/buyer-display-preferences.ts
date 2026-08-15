import { useEffect, useMemo, useState } from "react"

export const BUYER_DISPLAY_PREFERENCES_KEY = "citigoo:buyer_display_preferences"
export const BUYER_DISPLAY_PREFERENCES_EVENT = "citigoo:buyer-display-preferences"

export type DisplayCurrencyCode = string

export type BuyerDisplayPreferences = {
  countryCode: string
  currencyCode: DisplayCurrencyCode
}

const DEFAULT_PREFERENCES: BuyerDisplayPreferences = { countryCode: "us", currencyCode: "auto" }
const DISPLAY_CURRENCIES = new Set(["auto", "usd", "eur", "gbp", "cny", "hkd", "cad", "aud", "nzd", "jpy", "krw", "twd", "sgd", "myr", "inr", "idr", "thb", "php", "vnd", "brl", "mxn", "aed", "sar", "zar", "chf", "sek", "nok", "dkk", "pln", "czk", "huf", "ron", "ils", "try"])

const COUNTRY_CURRENCIES: Record<string, string> = {
  us: "usd",
  cn: "cny",
  hk: "hkd",
  gb: "gbp",
  it: "eur",
  fr: "eur",
  de: "eur",
  ca: "cad",
  au: "aud",
  jp: "jpy",
  sg: "sgd",
  my: "myr",
  nz: "nzd", kr: "krw", tw: "twd", in: "inr", id: "idr", th: "thb", ph: "php", vn: "vnd",
  br: "brl", mx: "mxn", ae: "aed", sa: "sar", za: "zar", ch: "chf", se: "sek", no: "nok",
  dk: "dkk", pl: "pln", cz: "czk", hu: "huf", ro: "ron", il: "ils", tr: "try",
}

// Display-only fallback rates relative to USD. Checkout remains in the cart's region currency.
const USD_RATES: Record<string, number> = {
  usd: 1,
  eur: 0.92,
  gbp: 0.79,
  cny: 7.2,
  cad: 1.37,
  aud: 1.52,
  jpy: 153,
  sgd: 1.35,
  myr: 4.7,
  hkd: 7.8, nzd: 1.65, krw: 1370, twd: 32.4, inr: 83, idr: 16200, thb: 36, php: 58,
  vnd: 25400, brl: 5.05, mxn: 16.8, aed: 3.67, sar: 3.75, zar: 18.4, chf: 0.9,
  sek: 10.5, nok: 10.7, dkk: 6.87, pln: 3.98, czk: 23.3, huf: 360, ron: 4.58, ils: 3.7, try: 32.2,
}

export const resolveAutoCurrency = (countryCode: string) =>
  COUNTRY_CURRENCIES[countryCode.trim().toLowerCase()] ?? "usd"

export const resolveDisplayCurrency = (preferences: BuyerDisplayPreferences) =>
  preferences.currencyCode === "auto"
    ? resolveAutoCurrency(preferences.countryCode)
    : preferences.currencyCode

export const convertDisplayAmount = (amount: number, sourceCurrency: string, targetCurrency: string) => {
  const source = sourceCurrency.trim().toLowerCase()
  const target = targetCurrency.trim().toLowerCase()
  const sourceRate = USD_RATES[source]
  const targetRate = USD_RATES[target]
  if (!sourceRate || !targetRate) return amount
  return Math.round((amount / sourceRate) * targetRate * 100) / 100
}

export const readBuyerDisplayPreferences = (): BuyerDisplayPreferences => {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES
  try {
    const parsed = JSON.parse(window.localStorage.getItem(BUYER_DISPLAY_PREFERENCES_KEY) ?? "{}") as Partial<BuyerDisplayPreferences>
    return {
      countryCode: parsed.countryCode?.trim().toLowerCase() || DEFAULT_PREFERENCES.countryCode,
      currencyCode: parsed.currencyCode && DISPLAY_CURRENCIES.has(parsed.currencyCode)
        ? parsed.currencyCode
        : DEFAULT_PREFERENCES.currencyCode,
    }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export const writeBuyerDisplayPreferences = (update: Partial<BuyerDisplayPreferences>) => {
  if (typeof window === "undefined") return
  const next = { ...readBuyerDisplayPreferences(), ...update }
  window.localStorage.setItem(BUYER_DISPLAY_PREFERENCES_KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent(BUYER_DISPLAY_PREFERENCES_EVENT, { detail: next }))
}

export const useBuyerDisplayPreferences = () => {
  const [preferences, setPreferences] = useState(readBuyerDisplayPreferences)
  useEffect(() => {
    const sync = () => setPreferences(readBuyerDisplayPreferences())
    window.addEventListener(BUYER_DISPLAY_PREFERENCES_EVENT, sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener(BUYER_DISPLAY_PREFERENCES_EVENT, sync)
      window.removeEventListener("storage", sync)
    }
  }, [])
  const displayCurrencyCode = useMemo(() => resolveDisplayCurrency(preferences), [preferences])
  return { ...preferences, displayCurrencyCode }
}
