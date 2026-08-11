import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"
import { apiFetch } from "../lib/api-client"
import { DetailHeader, PageHeader } from "../components/PageHeader"
import {
  Button,
  Card,
  CardTitle,
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  EmptyState,
  StatusBadge,
  TableSkeleton,
} from "../components/ui"

type BuyerRow = {
  customer_id: string
  email: string | null
  name: string | null
  created_at: string | null
  platform_status: string
  order_count: number
}

export function BuyersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["platform-buyers"],
    queryFn: () => apiFetch<{ buyers: BuyerRow[]; count: number }>("/admin/platform/buyers?limit=50"),
  })

  if (isLoading) {
    return (
      <div>
        <PageHeader title="买家" description="Medusa Customer 账号" />
        <TableSkeleton />
      </div>
    )
  }

  const buyers = data?.buyers ?? []

  return (
    <div>
      <PageHeader title="买家" description={`Medusa Customer · 共 ${data?.count ?? 0} 人`} />
      {buyers.length === 0 ? (
        <EmptyState title="暂无买家" description="当前数据库中还没有注册的买家账号。" />
      ) : (
        <DataTable>
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>Email</DataTableHeaderCell>
              <DataTableHeaderCell>状态</DataTableHeaderCell>
              <DataTableHeaderCell>订单数</DataTableHeaderCell>
              <DataTableHeaderCell>注册时间</DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <tbody>
            {buyers.map((buyer) => (
              <DataTableRow key={buyer.customer_id}>
                <DataTableCell>
                  <Link className="font-medium text-brand hover:underline" to={`/buyers/${buyer.customer_id}`}>
                    {buyer.email ?? buyer.customer_id}
                  </Link>
                </DataTableCell>
                <DataTableCell>
                  <StatusBadge status={buyer.platform_status} />
                </DataTableCell>
                <DataTableCell>{buyer.order_count}</DataTableCell>
                <DataTableCell className="text-slate-500">
                  {buyer.created_at ? new Date(buyer.created_at).toLocaleString() : "—"}
                </DataTableCell>
              </DataTableRow>
            ))}
          </tbody>
        </DataTable>
      )}
    </div>
  )
}

export function BuyerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["platform-buyer", id],
    enabled: Boolean(id),
    queryFn: () =>
      apiFetch<{
        buyer: BuyerRow & { orders: Array<{ order_id: string; display_id: number | null; store_id: unknown }> }
      }>(`/admin/platform/buyers/${id}`),
  })

  const toggle = useMutation({
    mutationFn: (status: string) =>
      apiFetch(`/admin/platform/buyers/${id}`, { method: "POST", body: JSON.stringify({ status }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["platform-buyer", id] }),
  })

  if (isLoading || !data) return <TableSkeleton />

  const buyer = data.buyer
  const disabled = buyer.platform_status === "disabled"

  return (
    <div>
      <DetailHeader backTo="/buyers" backLabel="← 返回买家列表" title={buyer.email ?? buyer.customer_id} />
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500">状态</span>
          <StatusBadge status={buyer.platform_status} />
        </div>
        <p className="text-sm">
          <span className="text-slate-500">订单数：</span>
          {buyer.order_count}
        </p>
        <Button
          variant={disabled ? "primary" : "danger"}
          disabled={toggle.isPending}
          onClick={() => toggle.mutate(disabled ? "active" : "disabled")}
        >
          {disabled ? "启用账号" : "禁用账号"}
        </Button>
      </Card>
      <Card className="mt-4">
        <CardTitle>最近订单</CardTitle>
        <ul className="mt-3 space-y-2.5 text-sm">
          {buyer.orders.map((order) => (
            <li key={order.order_id}>
              <Link className="font-medium text-brand hover:underline" to={`/orders/${order.order_id}?store=${encodeURIComponent(String(order.store_id ?? ""))}`}>
                #{order.display_id ?? order.order_id.slice(-8)}
              </Link>
              <span className="text-slate-500"> · store {String(order.store_id ?? "—")}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
