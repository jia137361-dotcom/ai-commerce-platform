export type BuyerPreferences = {
  countryCode: string
  countryCodes: string[]
  defaultCountryCode: string
  currencyCode: string
  shipToRegionIds: string[]
  defaultShipToRegionId?: string
}

const normalizeCode = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim().toLowerCase() : undefined

const normalizeStringList = (value: unknown) =>
  Array.isArray(value)
    ? Array.from(new Set(value.map(normalizeCode).filter((entry): entry is string => Boolean(entry))))
    : []

export const readBuyerPreferencesFromMetadata = (metadata?: Record<string, unknown> | null): BuyerPreferences => {
  const raw = metadata?.buyer_preferences
  const preferences = raw && typeof raw === "object" ? raw as Record<string, unknown> : {}
  const defaultCountryCode = normalizeCode(preferences.default_country_code) ?? normalizeCode(preferences.country_code) ?? ""
  const countryCodes = normalizeStringList(preferences.country_codes)
  const selectedCountryCodes = countryCodes.length ? countryCodes : defaultCountryCode ? [defaultCountryCode] : []
  const defaultShipToRegionId = normalizeCode(preferences.default_ship_to_region_id)
  return {
    countryCode: defaultCountryCode,
    countryCodes: defaultCountryCode && !selectedCountryCodes.includes(defaultCountryCode)
      ? [defaultCountryCode, ...selectedCountryCodes]
      : selectedCountryCodes,
    defaultCountryCode,
    currencyCode: normalizeCode(preferences.currency_code) ?? "usd",
    shipToRegionIds: normalizeStringList(preferences.ship_to_region_ids),
    defaultShipToRegionId,
  }
}

export const isBuyerEmailVerified = (metadata?: Record<string, unknown> | null) =>
  typeof metadata?.email_verified_at === "string" && metadata.email_verified_at.length > 0
