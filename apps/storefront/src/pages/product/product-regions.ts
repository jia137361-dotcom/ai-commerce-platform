import type { ProductRegionSummary } from "../../lib/mock-data"

export const formatProductRegionNames = (regions?: ProductRegionSummary[]) => {
  if (!regions?.length) return "All configured regions"
  return regions.map((region) => region.name).join(", ")
}

export const formatProductRegionCountries = (regions?: ProductRegionSummary[]) => {
  if (!regions?.length) return "Worldwide"
  const codes = Array.from(new Set(regions.flatMap((region) => region.country_codes.map((code) => code.toUpperCase()))))
  return codes.join(", ")
}
