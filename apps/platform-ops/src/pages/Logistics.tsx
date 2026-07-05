import { useQuery } from "@tanstack/react-query"
import { PageHeader } from "../components/PageHeader"
import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  EmptyState,
  StatusBadge,
  TableSkeleton,
} from "../components/ui"
import { apiFetch } from "../lib/api-client"

type WarehouseRegion = {
  id: string
  name_en: string
  name_zh: string
  country_code: string | null
  s2bdiy_count: number | null
  enabled: boolean
  notes: string | null
}

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
}

const statusFor = (enabled: boolean, blocked?: boolean) =>
  blocked ? "disabled" : enabled ? "active" : "disabled"

export function LogisticsPage() {
  const warehouseQuery = useQuery({
    queryKey: ["platform-logistics-warehouse-regions"],
    queryFn: () =>
      apiFetch<{ regions: WarehouseRegion[]; count: number }>(
        "/admin/platform/logistics/warehouse-regions"
      ),
  })
  const shipToQuery = useQuery({
    queryKey: ["platform-logistics-ship-to-regions"],
    queryFn: () =>
      apiFetch<{ regions: ShipToRegion[]; count: number }>(
        "/admin/platform/logistics/ship-to-regions"
      ),
  })

  const loading = warehouseQuery.isLoading || shipToQuery.isLoading
  const warehouseRegions = warehouseQuery.data?.regions ?? []
  const shipToRegions = shipToQuery.data?.regions ?? []

  return (
    <div>
      <PageHeader
        title="物流配置"
        description="只读查看发货仓库地区和可配送国家/地区。编辑能力留到 Phase 2。"
      />

      {loading ? (
        <TableSkeleton />
      ) : (
        <div className="grid gap-8">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Warehouse regions</h2>
            {warehouseRegions.length === 0 ? (
              <EmptyState title="暂无仓库地区" description="运行 logistics bootstrap 后会显示数据。" />
            ) : (
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableHeaderCell>Name</DataTableHeaderCell>
                    <DataTableHeaderCell>Country</DataTableHeaderCell>
                    <DataTableHeaderCell>S2BDIY count</DataTableHeaderCell>
                    <DataTableHeaderCell>Status</DataTableHeaderCell>
                    <DataTableHeaderCell>Notes</DataTableHeaderCell>
                  </tr>
                </DataTableHead>
                <tbody>
                  {warehouseRegions.map((region) => (
                    <DataTableRow key={region.id}>
                      <DataTableCell>
                        <div className="font-medium text-slate-900">{region.name_en}</div>
                        <div className="text-xs text-slate-500">{region.name_zh}</div>
                      </DataTableCell>
                      <DataTableCell>{region.country_code ?? "—"}</DataTableCell>
                      <DataTableCell>{region.s2bdiy_count ?? "—"}</DataTableCell>
                      <DataTableCell><StatusBadge status={statusFor(region.enabled)} /></DataTableCell>
                      <DataTableCell>{region.notes || "—"}</DataTableCell>
                    </DataTableRow>
                  ))}
                </tbody>
              </DataTable>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Ship-to regions</h2>
            {shipToRegions.length === 0 ? (
              <EmptyState title="暂无可配送地区" description="运行 logistics bootstrap 后会显示数据。" />
            ) : (
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableHeaderCell>Country / Region</DataTableHeaderCell>
                    <DataTableHeaderCell>Zone</DataTableHeaderCell>
                    <DataTableHeaderCell>Code</DataTableHeaderCell>
                    <DataTableHeaderCell>Phone</DataTableHeaderCell>
                    <DataTableHeaderCell>Status</DataTableHeaderCell>
                  </tr>
                </DataTableHead>
                <tbody>
                  {shipToRegions.map((region) => (
                    <DataTableRow key={region.id}>
                      <DataTableCell>
                        <div className="font-medium text-slate-900">{region.country_region_en}</div>
                        <div className="text-xs text-slate-500">{region.country_region_zh}</div>
                      </DataTableCell>
                      <DataTableCell>{region.zone}</DataTableCell>
                      <DataTableCell>{region.abbreviation}</DataTableCell>
                      <DataTableCell>{region.phone_code ?? "—"}</DataTableCell>
                      <DataTableCell>
                        <StatusBadge status={statusFor(region.enabled, region.blocked)} />
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </tbody>
              </DataTable>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
