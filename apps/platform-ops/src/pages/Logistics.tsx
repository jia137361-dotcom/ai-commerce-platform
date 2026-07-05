import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { PageHeader } from "../components/PageHeader"
import { Badge, EmptyState, StatusBadge, TableSkeleton } from "../components/ui"

type ShipToRegion = {
  id: string
  zone: string
  country_region_en: string
  country_region_zh: string
  country_code: string
  phone_code: string | null
  abbreviation: string
  enabled: boolean
  blocked: boolean
  blocked_reason: string | null
  sort_order: number
  raw_json: Record<string, unknown> | null
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

type ShipToRegionsResponse = {
  count: number
  regions: ShipToRegion[]
}

type GroupedRegions = Array<{
  zone: string
  regions: ShipToRegion[]
}>

const backendUrl =
  import.meta.env.VITE_MEDUSA_BACKEND_URL ??
  import.meta.env.VITE_MEDUSA_URL ??
  "http://127.0.0.1:9000"
const publishableKey = import.meta.env.VITE_MEDUSA_PUBLISHABLE_KEY

const isMissingKey = (value?: string) =>
  !value || value.trim().length === 0 || value === "pk_replace_me"

const statusFor = (region: ShipToRegion) =>
  region.blocked ? "disabled" : region.enabled ? "active" : "disabled"

const regionMatches = (region: ShipToRegion, search: string) => {
  const needle = search.trim().toLowerCase()
  if (!needle) return true

  return [
    region.country_region_en,
    region.country_region_zh,
    region.country_code,
    region.abbreviation,
    region.zone,
  ].some((value) => value.toLowerCase().includes(needle))
}

const groupByZone = (regions: ShipToRegion[]): GroupedRegions => {
  const groups = new Map<string, ShipToRegion[]>()
  for (const region of regions) {
    const zone = region.zone || "Uncategorized"
    groups.set(zone, [...(groups.get(zone) ?? []), region])
  }
  return Array.from(groups.entries())
    .map(([zone, zoneRegions]) => ({
      zone,
      regions: zoneRegions.sort((a, b) => a.sort_order - b.sort_order),
    }))
    .sort((a, b) => a.zone.localeCompare(b.zone))
}

async function fetchShipToRegions(): Promise<ShipToRegionsResponse> {
  if (isMissingKey(publishableKey)) {
    throw new Error("VITE_MEDUSA_PUBLISHABLE_KEY is missing or still a placeholder.")
  }

  const response = await fetch(`${backendUrl}/store/logistics/ship-to-regions`, {
    headers: {
      "x-publishable-api-key": publishableKey ?? "",
    },
  })
  const body = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message = body?.error?.message ?? response.statusText
    throw new Error(message || "Unable to load ship-to regions.")
  }

  return body as ShipToRegionsResponse
}

export function LogisticsPage() {
  const [search, setSearch] = useState("")
  const [zoneFilter, setZoneFilter] = useState("all")
  const missingKey = isMissingKey(publishableKey)
  const { data, error, isLoading } = useQuery({
    queryKey: ["store-logistics-ship-to-regions"],
    queryFn: fetchShipToRegions,
    enabled: !missingKey,
  })

  const regions = data?.regions ?? []
  const zones = useMemo(
    () => Array.from(new Set(regions.map((region) => region.zone))).sort((a, b) => a.localeCompare(b)),
    [regions]
  )
  const filteredRegions = useMemo(
    () =>
      regions.filter((region) => {
        const matchesZone = zoneFilter === "all" || region.zone === zoneFilter
        return matchesZone && regionMatches(region, search)
      }),
    [regions, search, zoneFilter]
  )
  const groupedRegions = useMemo(() => groupByZone(filteredRegions), [filteredRegions])
  const enabledCount = regions.filter((region) => region.enabled).length
  const blockedCount = regions.filter((region) => region.blocked).length

  return (
    <div>
      <PageHeader
        title="物流配置"
        description="只读查看 Store API 返回的可配送国家/地区，用于 Phase 1 验证。"
      />

      {missingKey ? (
        <EmptyState
          title="缺少 Publishable Key"
          description="Set VITE_MEDUSA_PUBLISHABLE_KEY in apps/platform-ops/.env.local and restart Vite."
        />
      ) : isLoading ? (
        <TableSkeleton />
      ) : error instanceof Error ? (
        <EmptyState title="加载物流地区失败" description={error.message} />
      ) : (
        <div className="grid gap-6">
          <section className="grid gap-3 rounded-card border border-slate-200 bg-white p-5 shadow-card md:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total regions</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{data?.count ?? regions.length}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Enabled</p>
              <p className="mt-1 text-3xl font-bold text-emerald-700">{enabledCount}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Blocked</p>
              <p className="mt-1 text-3xl font-bold text-red-600">{blockedCount}</p>
            </div>
          </section>

          <section className="grid gap-3 rounded-card border border-slate-200 bg-white p-5 shadow-card md:grid-cols-[1fr_240px]">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Search
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Country, 中国, code, abbreviation, zone"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Zone
              <select
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
                value={zoneFilter}
                onChange={(event) => setZoneFilter(event.target.value)}
              >
                <option value="all">All zones</option>
                {zones.map((zone) => (
                  <option value={zone} key={zone}>{zone}</option>
                ))}
              </select>
            </label>
          </section>

          {groupedRegions.length === 0 ? (
            <EmptyState title="没有匹配地区" description="Try another search or zone filter." />
          ) : (
            groupedRegions.map((group) => (
              <section className="rounded-card border border-slate-200 bg-white shadow-card" key={group.zone}>
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{group.zone}</h2>
                    <p className="text-sm text-slate-500">{group.regions.length} countries and regions</p>
                  </div>
                  <Badge label={group.zone} />
                </header>
                <div className="grid divide-y divide-slate-100">
                  {group.regions.map((region) => (
                    <article className="grid gap-3 px-5 py-4 md:grid-cols-[1.2fr_0.7fr_0.7fr_0.8fr]" key={region.id}>
                      <div>
                        <h3 className="font-semibold text-slate-900">{region.country_region_en}</h3>
                        <p className="text-sm text-slate-500">{region.country_region_zh}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">Code</p>
                        <p className="font-mono text-sm text-slate-700">{region.country_code.toUpperCase()} / {region.abbreviation}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">Phone</p>
                        <p className="text-sm text-slate-700">{region.phone_code ?? "—"}</p>
                      </div>
                      <div className="flex items-center md:justify-end">
                        <StatusBadge status={statusFor(region)} />
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      )}
    </div>
  )
}
