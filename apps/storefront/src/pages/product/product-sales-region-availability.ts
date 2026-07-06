import type { StoreProduct } from "../../lib/mock-data"

export type BuyerShipToRegion = {
  id: string
  zone: string
  country_region_en: string
  country_region_zh: string
  country_code: string
  phone_code: string
  abbreviation: string
  enabled: boolean
  blocked: boolean
}

export type ProductRegionAvailability = {
  available: boolean
  regionName: string
  countryCode?: string
  message: string
  tone: "available" | "unavailable"
}

const normalizeCountryCode = (countryCode: string) => countryCode.trim().toLowerCase()

export const findBuyerShipToRegion = (
  regions: BuyerShipToRegion[],
  countryCode: string
) => {
  const normalized = normalizeCountryCode(countryCode)
  return regions.find((region) => normalizeCountryCode(region.country_code) === normalized)
}

export const resolveProductRegionAvailability = (
  product: StoreProduct,
  regions: BuyerShipToRegion[],
  buyerCountryCodes: string[]
): ProductRegionAvailability => {
  const selectedRegions = buyerCountryCodes
    .map((countryCode) => findBuyerShipToRegion(regions, countryCode))
    .filter((region): region is BuyerShipToRegion => Boolean(region?.enabled && !region.blocked))

  if (!buyerCountryCodes.length) {
    return {
      available: false,
      regionName: "No region selected",
      message: "Choose your shipping regions before adding this item",
      tone: "unavailable",
    }
  }

  if (!selectedRegions.length) {
    return {
      available: false,
      regionName: "Selected regions unavailable",
      message: "This item does not ship to your selected regions",
      tone: "unavailable",
    }
  }

  const salesRegionMode = product.salesRegionMode ?? "all_supported"
  if (salesRegionMode !== "selected") {
    const region = selectedRegions[0]
    return {
      available: true,
      countryCode: region.country_code,
      regionName: selectedRegions.length === 1
        ? region.country_region_en || region.abbreviation || region.country_code.toUpperCase()
        : `${selectedRegions.length} selected regions`,
      message: "Ships to your selected regions",
      tone: "available",
    }
  }

  const salesRegionIds = product.salesRegionIds ?? []
  const matchedRegion = selectedRegions.find((region) => salesRegionIds.includes(region.id))
  const available = Boolean(matchedRegion)
  return {
    available,
    countryCode: matchedRegion?.country_code,
    regionName: matchedRegion
      ? matchedRegion.country_region_en || matchedRegion.abbreviation || matchedRegion.country_code.toUpperCase()
      : `${selectedRegions.length} selected regions`,
    message: available
      ? "Ships to at least one selected region"
      : "This item does not ship to your selected regions",
    tone: available ? "available" : "unavailable",
  }
}
