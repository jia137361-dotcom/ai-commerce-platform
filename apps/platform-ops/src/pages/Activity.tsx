import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "../lib/api-client"
import { PageHeader } from "../components/PageHeader"
import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  EmptyState,
  TableSkeleton,
} from "../components/ui"

type ActivityEvent = {
  id: string
  action: string
  entity_type: string
  entity_id: string | null
  store_id: string | null
  actor_user_id: string | null
  created_at: string | null
}

export function ActivityPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["platform-activity"],
    queryFn: () => apiFetch<{ events: ActivityEvent[]; count: number }>("/admin/platform/activity?limit=100"),
  })

  if (isLoading) {
    return (
      <div>
        <PageHeader title="活动日志" description="平台运营操作与审计事件" />
        <TableSkeleton />
      </div>
    )
  }

  const events = data?.events ?? []

  return (
    <div>
      <PageHeader title="活动日志" description="平台运营操作与审计事件" />
      {events.length === 0 ? (
        <EmptyState title="暂无活动" description="还没有记录任何运营操作。" />
      ) : (
        <DataTable>
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>时间</DataTableHeaderCell>
              <DataTableHeaderCell>动作</DataTableHeaderCell>
              <DataTableHeaderCell>对象</DataTableHeaderCell>
              <DataTableHeaderCell>操作人</DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <tbody>
            {events.map((event) => (
              <DataTableRow key={event.id}>
                <DataTableCell className="whitespace-nowrap text-slate-500">
                  {event.created_at ? new Date(event.created_at).toLocaleString() : "—"}
                </DataTableCell>
                <DataTableCell>
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">{event.action}</code>
                </DataTableCell>
                <DataTableCell>
                  <span className="text-slate-600">{event.entity_type}</span>
                  <span className="text-slate-400"> · </span>
                  <span className="font-mono text-xs">{event.entity_id ?? "—"}</span>
                </DataTableCell>
                <DataTableCell className="font-mono text-xs text-slate-500">
                  {event.actor_user_id ?? "system"}
                </DataTableCell>
              </DataTableRow>
            ))}
          </tbody>
        </DataTable>
      )}
    </div>
  )
}
