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

type StoreRow = {
  store_id: string
  name: string
  slug: string
  status: string
  owner_user_id: string | null
  created_at: string | null
  product_count: number
  order_count: number
}

export function StoresPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["platform-stores"],
    queryFn: () => apiFetch<{ stores: StoreRow[]; count: number }>("/admin/platform/stores?limit=50"),
  })

  if (isLoading) {
    return (
      <div>
        <PageHeader title="店铺" description="平台内所有卖家店铺" />
        <TableSkeleton />
      </div>
    )
  }

  const stores = data?.stores ?? []

  return (
    <div>
      <PageHeader title="店铺" description={`共 ${data?.count ?? 0} 家`} />
      {stores.length === 0 ? (
        <EmptyState title="暂无店铺" description="还没有创建任何店铺。" />
      ) : (
        <DataTable>
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>名称</DataTableHeaderCell>
              <DataTableHeaderCell>状态</DataTableHeaderCell>
              <DataTableHeaderCell>商品</DataTableHeaderCell>
              <DataTableHeaderCell>订单</DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <tbody>
            {stores.map((store) => (
              <DataTableRow key={store.store_id}>
                <DataTableCell>
                  <Link className="font-medium text-brand hover:underline" to={`/stores/${store.store_id}`}>
                    {store.name}
                  </Link>
                </DataTableCell>
                <DataTableCell>
                  <StatusBadge status={store.status} />
                </DataTableCell>
                <DataTableCell>{store.product_count}</DataTableCell>
                <DataTableCell>{store.order_count}</DataTableCell>
              </DataTableRow>
            ))}
          </tbody>
        </DataTable>
      )}
    </div>
  )
}

export function StoreDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["platform-store", id],
    enabled: Boolean(id),
    queryFn: () =>
      apiFetch<{
        store: StoreRow & {
          published_product_count: number
          member_count: number
          recent_orders: Array<{ order_id: string; display_id: number | null; created_at?: string | null }>
        }
      }>(`/admin/platform/stores/${id}`),
  })

  const toggle = useMutation({
    mutationFn: (status: string) =>
      apiFetch(`/admin/platform/stores/${id}`, { method: "POST", body: JSON.stringify({ status }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["platform-store", id] }),
  })

  if (isLoading || !data) return <TableSkeleton />

  const store = data.store
  const suspended = store.status === "suspended"

  return (
    <div>
      <DetailHeader backTo="/stores" backLabel="← 返回店铺列表" title={store.name} />
      <Card className="space-y-3 text-sm">
        <p>
          <span className="text-slate-500">ID：</span>
          <span className="font-mono text-slate-800">{store.store_id}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-500">状态</span>
          <StatusBadge status={store.status} />
        </div>
        <p>
          <span className="text-slate-500">商品：</span>
          {store.product_count}（已发布 {store.published_product_count}）
        </p>
        <p>
          <span className="text-slate-500">成员：</span>
          {store.member_count}
        </p>
        <Button
          variant={suspended ? "primary" : "danger"}
          disabled={toggle.isPending}
          onClick={() => toggle.mutate(suspended ? "active" : "suspended")}
        >
          {suspended ? "恢复店铺" : "暂停店铺"}
        </Button>
      </Card>
      <Card className="mt-4">
        <CardTitle>最近订单</CardTitle>
        <ul className="mt-3 space-y-2.5 text-sm">
          {store.recent_orders.length === 0 ? (
            <li className="text-slate-500">该店铺暂无订单</li>
          ) : (
            store.recent_orders.map((order) => (
              <li key={order.order_id}>
                <Link
                  className="font-medium text-brand hover:underline"
                  to={`/orders/${order.order_id}?store=${encodeURIComponent(store.store_id)}`}
                >
                  #{order.display_id ?? order.order_id.slice(-8)}
                </Link>
                {order.created_at ? (
                  <span className="text-slate-500"> · {new Date(order.created_at).toLocaleString()}</span>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </Card>
    </div>
  )
}
