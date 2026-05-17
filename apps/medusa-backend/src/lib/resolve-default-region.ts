import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export async function resolveDefaultRegionId(
  container: MedusaContainer,
  currencyCode = "usd"
): Promise<string | undefined> {
  const regionModule = container.resolve(Modules.REGION) as {
    listRegions: (f?: object) => Promise<Array<{ id: string; currency_code: string }>>
    createRegions: (data: unknown) => Promise<{ id: string; currency_code: string }>
  }

  const regions = await regionModule.listRegions({})
  const matched = regions.find((r) => r.currency_code === currencyCode)
  if (matched?.id) {
    return matched.id
  }
  if (regions[0]?.id) {
    return regions[0].id
  }

  const created = await regionModule.createRegions({
    name: "United States",
    currency_code: currencyCode,
    countries: ["us"],
  })
  return created.id
}
