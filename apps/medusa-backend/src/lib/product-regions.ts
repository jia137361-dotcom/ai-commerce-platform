import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export type RegionCountry =
  | string
  | {
      iso_2?: string | null
      iso2?: string | null
      code?: string | null
      country_code?: string | null
    }

export type RegionSummary = {
  region_id: string
  name: string
  currency_code: string
  country_codes: string[]
}

const ISO_SHIPPING_COUNTRY_CODES = `af ax al dz as ad ao ai ag ar am aq aw au at az bs bh bd bb be bz bj bm bt bo bq ba bw bv br io vg bn bg bf bi cv kh cm ca ky cf td cl cn cx cc co km kr cg cd ck cr ci hr cw cy cz dk dj dm do ec eg sv gq er ee sz et fk fo fj fi fr gf pf tf ga gm ge de gh gi gr gl gd gp gu gt gg gn gw gy ht hm va hn hk hu is in id iq ie im il it jm jp je jo kz ke ki kw kg la lv lb ls lr ly li lt lu mo mg mw my mv ml mt mh mq mr mu yt mx fm md mc mn me ms ma mz mm na nr np nl nc nz ni ne ng nu nf mk mp no om pk pw ps pa pg py pe ph pn pl pt pr qa re ro rw bl sh kn lc mf pm vc ws sm st sa sn rs sc sl sg sx sk si sb so za gs ss es lk sd sr sj se ch tw tj tz th tl tg tk to tt tn tr tm tc tv ug ua ae gb um us vi uy uz vu ve vn wf eh ye zm zw`

export const S2B_SHIPPING_COUNTRY_CODES = ISO_SHIPPING_COUNTRY_CODES.split(" ")

export const MARKET_REGION_DEFINITIONS = [
  { name: "United States", currency_code: "usd", countries: ["us"] },
  { name: "China", currency_code: "cny", countries: ["cn"] },
  {
    name: "International",
    currency_code: "usd",
    countries: S2B_SHIPPING_COUNTRY_CODES.filter((code) => code !== "us" && code !== "cn"),
  },
]

const readCountryCode = (country: RegionCountry) => {
  if (typeof country === "string") return country.trim().toLowerCase()
  return (
    country.iso_2 ??
    country.iso2 ??
    country.code ??
    country.country_code ??
    ""
  )
    .trim()
    .toLowerCase()
}

export const normalizeRegionSummary = (region: {
  id?: string | null
  name?: string | null
  currency_code?: string | null
  countries?: RegionCountry[] | null
}): RegionSummary | null => {
  if (!region.id) return null
  const countryCodes = (region.countries ?? [])
    .map(readCountryCode)
    .filter(Boolean)
  return {
    region_id: region.id,
    name: region.name?.trim() || "Region",
    currency_code: (region.currency_code ?? "usd").toLowerCase(),
    country_codes: countryCodes,
  }
}

export const resolveProductSupportedRegionIds = (product: {
  metadata?: Record<string, unknown> | null
}): string[] => {
  const raw = product.metadata?.supported_region_ids
  if (!Array.isArray(raw)) return []
  return raw.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
}

export const mergeSupportedRegionIdsIntoMetadata = (
  metadata: Record<string, unknown> | null | undefined,
  regionIds: string[]
) => ({
  ...(metadata ?? {}),
  supported_region_ids: regionIds,
})

export const isProductAvailableInRegion = (
  product: { metadata?: Record<string, unknown> | null },
  regionId?: string | null
) => {
  if (!regionId) return true
  const supported = resolveProductSupportedRegionIds(product)
  if (!supported.length) return true
  return supported.includes(regionId)
}

export async function listMarketRegionSummaries(
  container: MedusaContainer
): Promise<RegionSummary[]> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: regions } = (await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "countries.*"],
  })) as {
    data: Array<{
      id: string
      name?: string | null
      currency_code?: string | null
      countries?: RegionCountry[] | null
    }>
  }

  return regions
    .map(normalizeRegionSummary)
    .filter((region): region is RegionSummary => Boolean(region))
}

const regionMatchesDefinition = (
  region: RegionSummary,
  definition: (typeof MARKET_REGION_DEFINITIONS)[number]
) => {
  const expected = [...definition.countries].sort().join(",")
  const actual = [...region.country_codes].sort().join(",")
  return region.name === definition.name || actual === expected
}

const regionCountriesMatchDefinition = (
  region: RegionSummary,
  definition: (typeof MARKET_REGION_DEFINITIONS)[number]
) => {
  const expected = [...definition.countries].sort().join(",")
  const actual = [...region.country_codes].sort().join(",")
  return actual.length > 0 && actual === expected
}

type RegionModuleService = {
  createRegions: (data: {
    name: string
    currency_code: string
    countries: string[]
  }) => Promise<{ id: string }>
  updateRegions: (
    id: string,
    data: {
      countries: string[]
    }
  ) => Promise<unknown>
}

export async function ensureMarketRegions(
  container: MedusaContainer
): Promise<RegionSummary[]> {
  const regionModule = container.resolve(Modules.REGION) as RegionModuleService

  let summaries = await listMarketRegionSummaries(container)

  for (const definition of MARKET_REGION_DEFINITIONS) {
    const existing = summaries.find((region) => regionMatchesDefinition(region, definition))

    if (existing) {
      if (!regionCountriesMatchDefinition(existing, definition)) {
        await regionModule.updateRegions(existing.region_id, {
          countries: [...definition.countries],
        })
      }
      continue
    }

    const created = await regionModule.createRegions({
      name: definition.name,
      currency_code: definition.currency_code,
      countries: [...definition.countries],
    })
    summaries = [
      ...summaries,
      {
        region_id: created.id,
        name: definition.name,
        currency_code: definition.currency_code,
        country_codes: [...definition.countries],
      },
    ]
  }

  return (await listMarketRegionSummaries(container)).sort((a, b) => a.name.localeCompare(b.name))
}

export async function validateSupportedRegionIds(
  container: MedusaContainer,
  regionIds: string[]
): Promise<string | null> {
  if (!regionIds.length) return null

  const available = await listMarketRegionSummaries(container)
  const availableIds = new Set(available.map((region) => region.region_id))
  const invalid = regionIds.filter((id) => !availableIds.has(id))
  if (invalid.length) {
    return `supported_region_ids contains unknown region: ${invalid.join(", ")}`
  }
  return null
}

export async function resolveProductSupportedRegions(
  container: MedusaContainer,
  product: { metadata?: Record<string, unknown> | null }
): Promise<RegionSummary[]> {
  const allRegions = await listMarketRegionSummaries(container)
  const selectedIds = resolveProductSupportedRegionIds(product)
  if (!selectedIds.length) return allRegions
  const selected = new Set(selectedIds)
  return allRegions.filter((region) => selected.has(region.region_id))
}

export const formatSupportedRegionLabel = (regions: RegionSummary[]) => {
  if (!regions.length) return "Not configured"
  return regions.map((region) => region.name).join(", ")
}

export const resolveRegionIdForCountry = (
  regions: RegionSummary[],
  countryCode: string
) => {
  const normalized = countryCode.trim().toLowerCase()
  if (!normalized) return regions[0]?.region_id
  return regions.find((region) => region.country_codes.includes(normalized))?.region_id
}

export async function attachSupportedRegionsToProducts<
  T extends { metadata?: Record<string, unknown> | null },
>(
  container: MedusaContainer,
  products: T[]
): Promise<Array<T & { supported_regions: RegionSummary[] }>> {
  const allRegions = await listMarketRegionSummaries(container)
  return products.map((product) => {
    const selectedIds = resolveProductSupportedRegionIds(product)
    const supported_regions = selectedIds.length
      ? allRegions.filter((region) => selectedIds.includes(region.region_id))
      : allRegions
    return { ...product, supported_regions }
  })
}

export async function attachSupportedRegionsToProduct<
  T extends { metadata?: Record<string, unknown> | null },
>(container: MedusaContainer, product: T): Promise<T & { supported_regions: RegionSummary[] }> {
  const [enriched] = await attachSupportedRegionsToProducts(container, [product])
  return enriched
}
