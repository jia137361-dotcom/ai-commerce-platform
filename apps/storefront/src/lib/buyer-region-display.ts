import { useEffect, useMemo, useState } from "react"
import type { BuyerShipToRegion } from "./buyer-api"

export type BuyerDisplayRegion = {
  id?: string
  countryCode: string
  label: string
  abbreviation?: string
  zone?: string
  currencyCode: string
}

const STORAGE_KEY = "citigoo:buyer:display_region"
const CHANGE_EVENT = "citigoo:buyer:display_region_changed"

const DEFAULT_REGION: BuyerDisplayRegion = {
  countryCode: "us",
  label: "United States",
  abbreviation: "USA",
  zone: "North America",
  currencyCode: "USD",
}

const COUNTRY_CURRENCY: Record<string, string> = {
  au: "AUD",
  ca: "CAD",
  cn: "CNY",
  gb: "GBP",
  hk: "HKD",
  it: "EUR",
  jp: "JPY",
  mx: "MXN",
  sg: "SGD",
  us: "USD",
}

const USD_TO_CURRENCY_RATE: Record<string, number> = {
  AUD: 1.52,
  CAD: 1.36,
  CNY: 6.77,
  EUR: 0.92,
  GBP: 0.78,
  HKD: 7.8,
  JPY: 156,
  MXN: 18.2,
  SGD: 1.35,
  USD: 1,
}

export const currencyForCountry = (countryCode?: string | null) =>
  COUNTRY_CURRENCY[(countryCode ?? "").trim().toLowerCase()] ?? "USD"

export const convertUsdAmount = (amount?: number | null, currencyCode = "USD") => {
  if (amount == null || !Number.isFinite(amount)) return amount
  const rate = USD_TO_CURRENCY_RATE[currencyCode.toUpperCase()] ?? 1
  return Math.round(amount * rate * 100) / 100
}

export const convertDisplayAmount = (
  amount?: number | null,
  sourceCurrencyCode = "USD",
  targetCurrencyCode = "USD"
) => {
  if (amount == null || !Number.isFinite(amount)) return amount
  const sourceRate = USD_TO_CURRENCY_RATE[sourceCurrencyCode.toUpperCase()] ?? 1
  const targetRate = USD_TO_CURRENCY_RATE[targetCurrencyCode.toUpperCase()] ?? 1
  return Math.round((amount / sourceRate) * targetRate * 100) / 100
}

export const displayRegionFromShipToRegion = (region: BuyerShipToRegion): BuyerDisplayRegion => {
  const countryCode = region.country_code.trim().toLowerCase()
  return {
    id: region.id,
    countryCode,
    label: region.country_region_en || region.abbreviation || countryCode.toUpperCase(),
    abbreviation: region.abbreviation || countryCode.toUpperCase(),
    zone: region.zone,
    currencyCode: currencyForCountry(countryCode),
  }
}

export const readBuyerDisplayRegion = (): BuyerDisplayRegion => {
  if (typeof window === "undefined") return DEFAULT_REGION
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null") as Partial<BuyerDisplayRegion> | null
    const countryCode = parsed?.countryCode?.trim().toLowerCase()
    if (!countryCode) return DEFAULT_REGION
    return {
      countryCode,
      label: parsed?.label?.trim() || countryCode.toUpperCase(),
      abbreviation: parsed?.abbreviation?.trim() || countryCode.toUpperCase(),
      zone: parsed?.zone?.trim() || undefined,
      currencyCode: parsed?.currencyCode?.trim().toUpperCase() || currencyForCountry(countryCode),
      id: parsed?.id?.trim() || undefined,
    }
  } catch {
    return DEFAULT_REGION
  }
}

export const saveBuyerDisplayRegion = (region: BuyerDisplayRegion) => {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(region))
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: region }))
}

export const useBuyerDisplayRegion = () => {
  const [region, setRegion] = useState<BuyerDisplayRegion>(() => readBuyerDisplayRegion())

  useEffect(() => {
    const sync = () => setRegion(readBuyerDisplayRegion())
    window.addEventListener("storage", sync)
    window.addEventListener(CHANGE_EVENT, sync)
    return () => {
      window.removeEventListener("storage", sync)
      window.removeEventListener(CHANGE_EVENT, sync)
    }
  }, [])

  return useMemo(() => region, [region])
}
