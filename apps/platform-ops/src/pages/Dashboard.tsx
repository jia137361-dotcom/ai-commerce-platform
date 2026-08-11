import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { apiFetch } from "../lib/api-client"
import { PageHeader } from "../components/PageHeader"
import { Card, CardTitle, StatCardsSkeleton } from "../components/ui"

type Overview = {
  overview: {
    totals: { sellers: number; buyers: number; stores: number; orders: number }
    registration_trends: {
      sellers: Array<{ date: string; count: number }>
      buyers: Array<{ date: string; count: number }>
    }
    orders_by_store: Array<{ store_id: string; count: number }>
  }
}

const STAT_META = [
  { label: "卖家", key: "sellers" as const, to: "/sellers", accent: "bg-orange-100 text-brand" },
  { label: "买家", key: "buyers" as const, to: "/buyers", accent: "bg-slate-100 text-slate-700" },
  { label: "店铺", key: "stores" as const, to: "/stores", accent: "bg-emerald-50 text-emerald-700" },
  { label: "订单", key: "orders" as const, to: "/orders", accent: "bg-amber-50 text-amber-700" },
]

export function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["platform-overview"],
    queryFn: () => apiFetch<Overview>("/admin/platform/overview"),
  })

  if (isLoading) {
    return (
      <div>
        <PageHeader title="平台概览" description="买家/卖家注册与订单活动总览" />
        <StatCardsSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader title="平台概览" />
        <Card className="border-red-200 bg-red-50 text-red-700">
          {error instanceof Error ? error.message : "加载失败"}
        </Card>
      </div>
    )
  }

  const overview = data!.overview

  return (
    <div>
      <PageHeader title="平台概览" description="买家/卖家注册与订单活动总览" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_META.map((stat) => (
          <Link key={stat.label} to={stat.to} className="group block">
            <Card className="transition hover:border-brand/30 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <span className={cnBadge(stat.accent)}>{stat.label.slice(0, 1)}</span>
              </div>
              <p className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
                {overview.totals[stat.key]}
              </p>
              <p className="mt-2 text-xs font-medium text-brand opacity-0 transition group-hover:opacity-100">
                查看详情 →
              </p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>近 7 日买家注册</CardTitle>
          <ul className="mt-4 space-y-2.5 text-sm">
            {overview.registration_trends.buyers.map((row) => (
              <li key={row.date} className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-0">
                <span className="text-slate-600">{row.date}</span>
                <span className="font-semibold tabular-nums text-slate-900">{row.count}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardTitle>近 7 日卖家注册</CardTitle>
          <ul className="mt-4 space-y-2.5 text-sm">
            {overview.registration_trends.sellers.map((row) => (
              <li key={row.date} className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-0">
                <span className="text-slate-600">{row.date}</span>
                <span className="font-semibold tabular-nums text-slate-900">{row.count}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-6">
        <CardTitle>订单 Top 店铺</CardTitle>
        <ul className="mt-4 space-y-2.5 text-sm">
          {overview.orders_by_store.map((row) => (
            <li key={row.store_id} className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-0">
              <Link className="font-medium text-brand hover:underline" to={`/stores/${row.store_id}`}>
                {row.store_id}
              </Link>
              <span className="tabular-nums text-slate-600">{row.count} 单</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

function cnBadge(accent: string) {
  return `inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${accent}`
}
