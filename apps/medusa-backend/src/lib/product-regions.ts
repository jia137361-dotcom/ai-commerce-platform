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

const MARKET_CURRENCY_COUNTRIES: Record<string, string[]> = {
  usd: ["us"],
  cny: ["cn"],
  hkd: ["hk"],
  eur: ["at", "be", "cy", "ee", "fi", "fr", "de", "gr", "ie", "it", "lv", "lt", "lu", "mt", "nl", "pt", "sk", "si", "es", "ad", "mc", "sm", "va", "xk"],
  gbp: ["gb", "gg", "im", "je"],
  cad: ["ca"],
  aud: ["au", "cx", "cc", "ki", "nf", "nr", "tv", "hm"],
  nzd: ["nz", "ck", "nu", "pn", "tk"],
  jpy: ["jp"],
  krw: ["kr"],
  twd: ["tw"],
  sgd: ["sg"],
  myr: ["my"],
  inr: ["in"],
  idr: ["id"],
  thb: ["th"],
  php: ["ph"],
  vnd: ["vn"],
  brl: ["br"],
  mxn: ["mx"],
  aed: ["ae"],
  sar: ["sa"],
  zar: ["za"],
  chf: ["ch", "li"],
  sek: ["se"],
  nok: ["no", "sj", "bv"],
  dkk: ["dk", "fo", "gl"],
  pln: ["pl"],
  czk: ["cz"],
  huf: ["hu"],
  ron: ["ro"],
  ils: ["il"],
  try: ["tr"],
}

const MARKET_CURRENCY_NAMES: Record<string, string> = {
  usd: "United States", cny: "China", hkd: "Hong Kong", eur: "Euro", gbp: "United Kingdom",
  cad: "Canada", aud: "Australia", nzd: "New Zealand", jpy: "Japan", krw: "South Korea", twd: "Taiwan",
  sgd: "Singapore", myr: "Malaysia", inr: "India", idr: "Indonesia", thb: "Thailand", php: "Philippines",
  vnd: "Vietnam", brl: "Brazil", mxn: "Mexico", aed: "United Arab Emirates", sar: "Saudi Arabia",
  zar: "South Africa", chf: "Switzerland", sek: "Sweden", nok: "Norway", dkk: "Denmark", pln: "Poland",
  czk: "Czechia", huf: "Hungary", ron: "Romania", ils: "Israel", try: "Turkey",
}

const configuredMarketCountries = new Set(Object.values(MARKET_CURRENCY_COUNTRIES).flat())

// Checkout currencies are real Medusa regions, not a display-only preference.
// Countries without a supported local payment/pricing currency remain explicitly
// grouped in the USD market until that currency is enabled end-to-end.
export const MARKET_REGION_DEFINITIONS = [
  ...Object.entries(MARKET_CURRENCY_COUNTRIES).map(([currency_code, countries]) => ({
    name: MARKET_CURRENCY_NAMES[currency_code] ?? currency_code.toUpperCase(),
    currency_code,
    countries,
  })),
  {
    name: "International",
    currency_code: "usd",
    countries: S2B_SHIPPING_COUNTRY_CODES.filter((code) => !configuredMarketCountries.has(code)),
  },
]

// Fixed development conversion table. Replace this with a versioned FX source
// before production so catalog prices, carts, payments, and refunds use the same rate.
const USD_TO_MARKET_CURRENCY: Record<string, number> = {
  usd: 1, cny: 7.2, hkd: 7.8, eur: 0.92, gbp: 0.79, cad: 1.37, aud: 1.52, nzd: 1.65,
  jpy: 153, krw: 1370, twd: 32.4, sgd: 1.35, myr: 4.7, inr: 83, idr: 16200, thb: 36,
  php: 58, vnd: 25400, brl: 5.05, mxn: 16.8, aed: 3.67, sar: 3.75, zar: 18.4, chf: 0.9,
  sek: 10.5, nok: 10.7, dkk: 6.87, pln: 3.98, czk: 23.3, huf: 360, ron: 4.58, ils: 3.7, try: 32.2,
}

export const convertUsdPriceToMarketCurrency = (usdMajorAmount: number, currencyCode: string) => {
  const rate = USD_TO_MARKET_CURRENCY[currencyCode.trim().toLowerCase()] ?? 1
  return Math.round(usdMajorAmount * rate * 100) / 100
}

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

const resolveProductSellableCountryCodes = (product: {
  metadata?: Record<string, unknown> | null
}) => {
  const raw = product.metadata?.sellable_country_codes
  if (!Array.isArray(raw)) return []
  return raw
    .filter((country): country is string => typeof country === "string")
    .map((country) => country.trim().toLowerCase())
    .filter(Boolean)
}

// Supplier country-level delivery data is the source of truth. Region ids are
// derived data and can become stale when checkout markets are added or split.
export const isProductAvailableInMarketRegion = (
  product: { metadata?: Record<string, unknown> | null },
  region?: RegionSummary | null
) => {
  if (!region) return true
  const sellableCountries = resolveProductSellableCountryCodes(product)
  if (sellableCountries.length) {
    return region.country_codes.some((country) => sellableCountries.includes(country))
  }
  return isProductAvailableInRegion(product, region.region_id)
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

  // Older installations have a single International region containing every
  // country. Shrink it before creating local-currency regions, otherwise
  // Medusa rejects the new regions because a country can belong to only one.
  const internationalDefinition = MARKET_REGION_DEFINITIONS.find(
    (definition) => definition.name === "International"
  )
  const existingInternational = summaries.find((region) => region.name === "International")
  if (internationalDefinition && existingInternational && !regionCountriesMatchDefinition(existingInternational, internationalDefinition)) {
    await regionModule.updateRegions(existingInternational.region_id, {
      countries: [...internationalDefinition.countries],
    })
    summaries = await listMarketRegionSummaries(container)
  }

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
