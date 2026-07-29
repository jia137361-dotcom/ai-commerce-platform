import { useEffect, useMemo, useState } from "react"

export const BUYER_DISPLAY_PREFERENCES_KEY = "citigoo:buyer_display_preferences"
export const BUYER_DISPLAY_PREFERENCES_EVENT = "citigoo:buyer-display-preferences"

export type DisplayCurrencyCode = "auto" | "usd" | "eur" | "gbp" | "cny" | "cad" | "aud" | "jpy" | "sgd" | "myr"

export type BuyerDisplayPreferences = {
  countryCode: string
  currencyCode: DisplayCurrencyCode
}

const DEFAULT_PREFERENCES: BuyerDisplayPreferences = { countryCode: "us", currencyCode: "auto" }
const DISPLAY_CURRENCIES = new Set<DisplayCurrencyCode>(["auto", "usd", "eur", "gbp", "cny", "cad", "aud", "jpy", "sgd", "myr"])

const COUNTRY_CURRENCIES: Record<string, Exclude<DisplayCurrencyCode, "auto">> = {
  us: "usd",
  cn: "cny",
  gb: "gbp",
  it: "eur",
  fr: "eur",
  de: "eur",
  ca: "cad",
  au: "aud",
  jp: "jpy",
  sg: "sgd",
  my: "myr",
}

// Display-only fallback rates relative to USD. Checkout remains in the cart's region currency.
const USD_RATES: Record<Exclude<DisplayCurrencyCode, "auto">, number> = {
  usd: 1,
  eur: 0.92,
  gbp: 0.79,
  cny: 7.2,
  cad: 1.37,
  aud: 1.52,
  jpy: 153,
  sgd: 1.35,
  myr: 4.7,
}

export const resolveAutoCurrency = (countryCode: string) =>
  COUNTRY_CURRENCIES[countryCode.trim().toLowerCase()] ?? "usd"

export const resolveDisplayCurrency = (preferences: BuyerDisplayPreferences) =>
  preferences.currencyCode === "auto"
    ? resolveAutoCurrency(preferences.countryCode)
    : preferences.currencyCode

export const convertDisplayAmount = (amount: number, sourceCurrency: string, targetCurrency: string) => {
  const source = sourceCurrency.trim().toLowerCase() as Exclude<DisplayCurrencyCode, "auto">
  const target = targetCurrency.trim().toLowerCase() as Exclude<DisplayCurrencyCode, "auto">
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
