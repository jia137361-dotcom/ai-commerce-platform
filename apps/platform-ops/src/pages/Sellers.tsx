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

type SellerRow = {
  user_id: string
  email: string | null
  name: string | null
  created_at: string | null
  platform_status: string
  stores: Array<{ store_id: string; store_name: string; role: string; store_status: string | null }>
}

export function SellersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["platform-sellers"],
    queryFn: () => apiFetch<{ sellers: SellerRow[]; count: number }>("/admin/platform/sellers?limit=50"),
  })

  if (isLoading) {
    return (
      <div>
        <PageHeader title="卖家" description="Medusa User 账号" />
        <TableSkeleton />
      </div>
    )
  }

  const sellers = data?.sellers ?? []

  return (
    <div>
      <PageHeader title="卖家" description={`Medusa User 账号 · 共 ${data?.count ?? 0} 人`} />
      {sellers.length === 0 ? (
        <EmptyState title="暂无卖家" description="当前数据库中还没有注册的卖家账号。" />
      ) : (
        <DataTable>
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>Email</DataTableHeaderCell>
              <DataTableHeaderCell>状态</DataTableHeaderCell>
              <DataTableHeaderCell>店铺</DataTableHeaderCell>
              <DataTableHeaderCell>注册时间</DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <tbody>
            {sellers.map((seller) => (
              <DataTableRow key={seller.user_id}>
                <DataTableCell>
                  <Link className="font-medium text-brand hover:underline" to={`/sellers/${seller.user_id}`}>
                    {seller.email ?? seller.user_id}
                  </Link>
                </DataTableCell>
                <DataTableCell>
                  <StatusBadge status={seller.platform_status} />
                </DataTableCell>
                <DataTableCell>{seller.stores.length}</DataTableCell>
                <DataTableCell className="text-slate-500">
                  {seller.created_at ? new Date(seller.created_at).toLocaleString() : "—"}
                </DataTableCell>
              </DataTableRow>
            ))}
          </tbody>
        </DataTable>
      )}
    </div>
  )
}

export function SellerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["platform-seller", id],
    enabled: Boolean(id),
    queryFn: () => apiFetch<{ seller: SellerRow }>(`/admin/platform/sellers/${id}`),
  })

  const toggle = useMutation({
    mutationFn: (status: string) =>
      apiFetch(`/admin/platform/sellers/${id}`, {
        method: "POST",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["platform-seller", id] }),
  })

  if (isLoading || !data) {
    return (
      <div>
        <TableSkeleton />
      </div>
    )
  }

  const seller = data.seller
  const disabled = seller.platform_status === "disabled"

  return (
    <div>
      <DetailHeader
        backTo="/sellers"
        backLabel="← 返回卖家列表"
        title={seller.email ?? seller.user_id}
      />
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500">状态</span>
          <StatusBadge status={seller.platform_status} />
        </div>
        <p className="text-sm">
          <span className="text-slate-500">注册时间：</span>
          {seller.created_at ? new Date(seller.created_at).toLocaleString() : "—"}
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
        <CardTitle>关联店铺</CardTitle>
        <ul className="mt-3 space-y-2.5 text-sm">
          {seller.stores.map((store) => (
            <li key={store.store_id} className="flex flex-wrap items-center gap-2">
              <Link className="font-medium text-brand hover:underline" to={`/stores/${store.store_id}`}>
                {store.store_name}
              </Link>
              <span className="text-slate-400">·</span>
              <span className="text-slate-600">{store.role}</span>
              <StatusBadge status={store.store_status ?? "unknown"} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
