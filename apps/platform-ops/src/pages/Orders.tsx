import { useQuery } from "@tanstack/react-query"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { apiFetch } from "../lib/api-client"
import { DetailHeader, PageHeader } from "../components/PageHeader"
import {
  Badge,
  Card,
  CardTitle,
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  EmptyState,
  TableSkeleton,
} from "../components/ui"

type OrderRow = {
  order_id: string
  display_id: number | null
  email: string | null
  created_at: string | null
  store_id: string
  payment_status: string
  fulfillment_status: string
  items_count: number
  total: number | null
  currency_code?: string | null
}

type OrderLineItem = {
  id: string
  title: string | null
  quantity: number | null
  unit_price: number | null
  total: number | null
  thumbnail?: string | null
}

type OrderDetail = OrderRow & {
  store_name?: string | null
  payment_method_label?: string | null
  mc_payment_status?: string | null
  mc_fulfillment_status?: string | null
  platform_checkout_id?: string | null
  related_platform_orders?: Array<{
    order_id: string
    display_id: number | string | null
    store_id: string | null
    total: number | null
    currency_code: string | null
  }>
  shipping_address?: Record<string, unknown> | null
  supplier?: {
    supplier_id: string | null
    supplier_order_id: string | null
    supplier_status: string | null
  }
  fulfillment_order?: {
    id: string | null
    status: string | null
    supplier: string | null
    supplier_order_id: string | null
    pushed_at: string | null
  } | null
  latest_shipment?: {
    carrier: string | null
    tracking_number: string | null
    tracking_url: string | null
    shipped_at: string | null
    delivered_at: string | null
    status: string | null
  } | null
  supplier_order?: {
    id: string | null
    supplier_id: string | null
    supplier_order_id: string | null
    third_order_id: string | null
    supplier_status: string | null
  } | null
  timeline_steps?: Array<{
    key: string
    label: string
    status: "pending" | "active" | "completed"
    timestamp: string | null
  }>
  items: OrderLineItem[]
  metadata?: Record<string, unknown>
}

const formatMoney = (value: number | null | undefined, currency = "USD") => {
  if (value == null || !Number.isFinite(value)) return "—"
  // Platform order totals are already normalized to major currency units by the API.
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(value)
}

const formatDateTime = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString() : "—"

const formatAddress = (address: Record<string, unknown> | null | undefined) => {
  if (!address) return "—"
  const parts = [
    address.first_name,
    address.last_name,
    address.address_1,
    address.address_2,
    address.city,
    address.province,
    address.postal_code,
    address.country_code,
    address.phone,
  ]
    .map((part) => (typeof part === "string" && part.trim() ? part.trim() : null))
    .filter(Boolean)
  return parts.length ? parts.join(" · ") : "—"
}

export function OrdersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["platform-orders"],
    queryFn: () => apiFetch<{ orders: OrderRow[]; count: number }>("/admin/platform/orders?limit=50"),
  })

  if (isLoading) {
    return (
      <div>
        <PageHeader title="订单" description="跨店铺订单总览" />
        <TableSkeleton />
      </div>
    )
  }

  const orders = data?.orders ?? []

  return (
    <div>
      <PageHeader title="订单" description={`跨店铺 · 共 ${data?.count ?? 0} 单`} />
      {orders.length === 0 ? (
        <EmptyState title="暂无订单" description="平台上还没有任何订单记录。" />
      ) : (
        <DataTable>
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>订单</DataTableHeaderCell>
              <DataTableHeaderCell>店铺</DataTableHeaderCell>
              <DataTableHeaderCell>买家</DataTableHeaderCell>
              <DataTableHeaderCell>支付</DataTableHeaderCell>
              <DataTableHeaderCell>履约</DataTableHeaderCell>
              <DataTableHeaderCell>金额</DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <tbody>
            {orders.map((order) => (
              <DataTableRow key={order.order_id}>
                <DataTableCell>
                  <Link className="font-medium text-brand hover:underline" to={`/orders/${order.order_id}`}>
                    #{order.display_id ?? order.order_id.slice(-8)}
                  </Link>
                </DataTableCell>
                <DataTableCell>
                  <Link className="hover:text-brand hover:underline" to={`/stores/${order.store_id}`}>
                    {order.store_id}
                  </Link>
                </DataTableCell>
                <DataTableCell>{order.email ?? "—"}</DataTableCell>
                <DataTableCell>
                  <Badge label={order.payment_status} />
                </DataTableCell>
                <DataTableCell>
                  <Badge label={order.fulfillment_status} />
                </DataTableCell>
                <DataTableCell className="font-medium tabular-nums">
                  {formatMoney(order.total, order.currency_code ?? "USD")}
                </DataTableCell>
              </DataTableRow>
            ))}
          </tbody>
        </DataTable>
      )}
    </div>
  )
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const fromStoreId = searchParams.get("store")
  const backTo = fromStoreId ? `/stores/${fromStoreId}` : "/orders"
  const backLabel = fromStoreId ? "← 返回店铺详情" : "← 返回订单列表"

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["platform-order", id],
    enabled: Boolean(id),
    queryFn: () => apiFetch<{ order: OrderDetail }>(`/admin/platform/orders/${id}`),
  })

  if (isLoading) return <TableSkeleton />

  if (isError || !data?.order) {
    return (
      <div>
        <DetailHeader backTo={backTo} backLabel={backLabel} title="订单详情" />
        <EmptyState
          title="无法加载订单"
          description={error instanceof Error ? error.message : "订单不存在或暂无访问权限。"}
        />
      </div>
    )
  }

  const order = data.order
  const currency = order.currency_code ?? "USD"
  const shipment = order.latest_shipment
  const supplier = order.supplier_order ?? order.supplier

  return (
    <div>
      <DetailHeader
        backTo={backTo}
        backLabel={backLabel}
        title={`订单 #${order.display_id ?? order.order_id.slice(-8)}`}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3 text-sm">
          <CardTitle>订单概览</CardTitle>
          <p>
            <span className="text-slate-500">订单 ID：</span>
            <span className="font-mono text-slate-800">{order.order_id}</span>
          </p>
          <p>
            <span className="text-slate-500">下单时间：</span>
            {formatDateTime(order.created_at)}
          </p>
          <p>
            <span className="text-slate-500">店铺：</span>
            <Link className="font-medium text-brand hover:underline" to={`/stores/${order.store_id}`}>
              {order.store_name ?? order.store_id}
            </Link>
            <span className="ml-2 font-mono text-xs text-slate-400">{order.store_id}</span>
          </p>
          <p>
            <span className="text-slate-500">买家邮箱：</span>
            {order.email ?? "—"}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge label={`支付 · ${order.payment_status}`} />
            <Badge label={`履约 · ${order.fulfillment_status}`} />
          </div>
          <p>
            <span className="text-slate-500">支付方式：</span>
            {order.payment_method_label ?? order.mc_payment_status ?? "—"}
          </p>
          <p>
            <span className="text-slate-500">订单金额：</span>
            <span className="text-lg font-semibold tabular-nums">{formatMoney(order.total, currency)}</span>
            <span className="ml-2 text-slate-500">· {order.items_count} 件</span>
          </p>
          {order.platform_checkout_id ? (
            <p>
              <span className="text-slate-500">平台合并结账：</span>
              <span className="font-mono text-xs text-slate-700">{order.platform_checkout_id}</span>
            </p>
          ) : null}
        </Card>

        <Card className="space-y-3 text-sm">
          <CardTitle>收货与物流</CardTitle>
          <p>
            <span className="text-slate-500">收货地址：</span>
            {formatAddress(order.shipping_address ?? undefined)}
          </p>
          <p>
            <span className="text-slate-500">承运商：</span>
            {shipment?.carrier ?? "—"}
          </p>
          <p>
            <span className="text-slate-500">运单号：</span>
            {shipment?.tracking_number ?? "—"}
          </p>
          {shipment?.tracking_url ? (
            <p>
              <span className="text-slate-500">追踪链接：</span>
              <a className="text-brand hover:underline" href={shipment.tracking_url} target="_blank" rel="noreferrer">
                查看物流
              </a>
            </p>
          ) : null}
          <p>
            <span className="text-slate-500">发货时间：</span>
            {formatDateTime(shipment?.shipped_at)}
          </p>
          <p>
            <span className="text-slate-500">签收时间：</span>
            {formatDateTime(shipment?.delivered_at)}
          </p>
        </Card>
      </div>

      {order.related_platform_orders?.length ? (
        <Card className="mt-4">
          <CardTitle>同批平台结账订单</CardTitle>
          <ul className="mt-3 space-y-3 text-sm">
            {order.related_platform_orders.map((related) => (
              <li
                key={related.order_id}
                className="flex items-start justify-between gap-4 border-b border-slate-50 pb-3 last:border-0"
              >
                <div>
                  <Link className="font-medium text-brand hover:underline" to={`/orders/${related.order_id}`}>
                    #{related.display_id ?? related.order_id.slice(-8)}
                  </Link>
                  <p className="mt-1 font-mono text-xs text-slate-500">{related.store_id ?? "—"}</p>
                </div>
                <p className="tabular-nums text-slate-700">
                  {formatMoney(related.total, related.currency_code ?? currency)}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3 text-sm">
          <CardTitle>供应商 / 履约</CardTitle>
          <p>
            <span className="text-slate-500">供应商：</span>
            {supplier?.supplier_id ?? order.fulfillment_order?.supplier ?? "—"}
          </p>
          <p>
            <span className="text-slate-500">供应商订单：</span>
            {supplier?.supplier_order_id ?? order.fulfillment_order?.supplier_order_id ?? "—"}
          </p>
          <p>
            <span className="text-slate-500">供应商状态：</span>
            {supplier?.supplier_status ?? order.fulfillment_order?.status ?? "—"}
          </p>
          <p>
            <span className="text-slate-500">推单时间：</span>
            {formatDateTime(order.fulfillment_order?.pushed_at)}
          </p>
        </Card>

        <Card>
          <CardTitle>履约进度</CardTitle>
          <ol className="mt-4 space-y-3 text-sm">
            {(order.timeline_steps ?? []).map((step) => (
              <li key={step.key} className="flex items-start justify-between gap-4 border-b border-slate-50 pb-2 last:border-0">
                <div>
                  <p className="font-medium text-slate-800">{step.label}</p>
                  <p className="text-xs text-slate-500">{formatDateTime(step.timestamp)}</p>
                </div>
                <Badge
                  label={
                    step.status === "completed" ? "已完成" : step.status === "active" ? "进行中" : "待处理"
                  }
                />
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <Card className="mt-4">
        <CardTitle>商品行</CardTitle>
        <ul className="mt-3 space-y-3 text-sm">
          {order.items.length === 0 ? (
            <li className="text-slate-500">暂无商品行数据</li>
          ) : (
            order.items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-4 border-b border-slate-50 pb-3 last:border-0">
                <div>
                  <p className="font-medium text-slate-900">{item.title ?? item.id}</p>
                  <p className="mt-1 text-xs text-slate-500">× {item.quantity ?? 1}</p>
                </div>
                <div className="text-right tabular-nums text-slate-700">
                  <p>{formatMoney(item.total ?? item.unit_price, currency)}</p>
                  {item.unit_price != null ? (
                    <p className="text-xs text-slate-500">单价 {formatMoney(item.unit_price, currency)}</p>
                  ) : null}
                </div>
              </li>
            ))
          )}
        </ul>
      </Card>
    </div>
  )
}
