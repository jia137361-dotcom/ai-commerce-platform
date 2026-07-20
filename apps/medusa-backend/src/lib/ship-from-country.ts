/** ISO-style ship-from codes shown to buyers as friendly country/region names. */

export const SHIP_FROM_COUNTRY_LABELS: Record<string, string> = {
  US: "United States",
  CN: "China",
  GB: "United Kingdom",
  UK: "United Kingdom",
  DE: "Germany",
  JP: "Japan",
  FR: "France",
  IT: "Italy",
  CA: "Canada",
  AU: "Australia",
  RU: "Russia",
  ES: "Spain",
  KR: "South Korea",
  PH: "Philippines",
  MX: "Mexico",
  PL: "Poland",
  SG: "Singapore",
  EU: "Europe",
}

export const normalizeShipFromCountryCode = (value: unknown): string | null => {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.toUpperCase()
}

export const getShipFromCountryLabel = (code: unknown): string | null => {
  const normalized = normalizeShipFromCountryCode(code)
  if (!normalized) return null
  return SHIP_FROM_COUNTRY_LABELS[normalized] ?? normalized
}
