export type BuyerPreferences = { countryCode: string; currencyCode: string }

export const readBuyerPreferencesFromMetadata = (metadata?: Record<string, unknown> | null): BuyerPreferences => {
  const raw = metadata?.buyer_preferences
  const preferences = raw && typeof raw === "object" ? raw as Record<string, unknown> : {}
  return {
    countryCode: typeof preferences.country_code === "string" ? preferences.country_code.toLowerCase() : "us",
    currencyCode: typeof preferences.currency_code === "string" ? preferences.currency_code.toLowerCase() : "usd",
  }
}

export const isBuyerEmailVerified = (metadata?: Record<string, unknown> | null) =>
  typeof metadata?.email_verified_at === "string" && metadata.email_verified_at.length > 0
