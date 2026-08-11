import type { MedusaContainer } from "@medusajs/framework/types"
import { ensureMarketRegions, listMarketRegionSummaries } from "./product-regions"

export async function resolveDefaultRegionId(
  container: MedusaContainer,
  currencyCode = "usd"
): Promise<string | undefined> {
  const normalizedCurrency = currencyCode.trim().toLowerCase()
  let regions = await listMarketRegionSummaries(container)

  const matched = regions.find(
    (region) =>
      region.currency_code === normalizedCurrency && region.country_codes.length > 0
  )
  if (matched?.region_id) {
    return matched.region_id
  }

  regions = await ensureMarketRegions(container)
  const repaired = regions.find(
    (region) =>
      region.currency_code === normalizedCurrency && region.country_codes.length > 0
  )
  if (repaired?.region_id) {
    return repaired.region_id
  }

  return regions.find((region) => region.country_codes.length > 0)?.region_id
}
