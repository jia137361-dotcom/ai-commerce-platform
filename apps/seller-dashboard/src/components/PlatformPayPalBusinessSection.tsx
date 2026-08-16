import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "../lib/api-client"
import { Button } from "./ui/Button"
import { Card } from "./ui/Card"

type PlatformPayPalBusinessStatus = {
  configured: boolean
  environment: "sandbox" | null
  merchant_id: string | null
  dashboard_url: string | null
}

export function PlatformPayPalBusinessSection() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["platform-paypal-business"],
    queryFn: () => apiFetch<{ paypal_business: PlatformPayPalBusinessStatus }>("/admin/paypal-business"),
  })
  const status = data?.paypal_business

  return (
    <Card className="mx-auto mt-6 max-w-2xl">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">平台 PayPal Business 收款账户</h2>
          <p className="mt-1 text-sm text-slate-600">
            当前单店的 PayPal 订单会直接入账到平台配置的 Business 账户。
          </p>
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-500">正在检查 PayPal 收款账户状态…</p>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            <p className="font-medium">无法读取 PayPal 收款账户状态</p>
            <p className="mt-1">{error instanceof Error ? error.message : "请刷新后重试。"}</p>
          </div>
        ) : status?.configured ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-medium">PayPal Sandbox Business 收款账户已配置</p>
            <p className="mt-1">Merchant ID：{status.merchant_id ?? "未设置 PAYPAL_MERCHANT_ID"}</p>
            <p className="mt-1">买家完成 PayPal capture 后，可在 Sandbox Activity 中查看入账。</p>
            {status.dashboard_url ? (
              <a
                className="mt-3 inline-block text-sm font-semibold text-emerald-800 underline"
                href={status.dashboard_url}
                target="_blank"
                rel="noreferrer"
              >
                打开 PayPal Sandbox Dashboard
              </a>
            ) : null}
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            服务端尚未完成 PayPal Sandbox 配置。需要设置 <code>PAYPAL_CLIENT_ID</code>、<code>PAYPAL_CLIENT_SECRET</code> 与 <code>PAYPAL_ENVIRONMENT=sandbox</code>。
          </div>
        )}

        <Button type="button" variant="outline" disabled={isFetching} onClick={() => void refetch()}>
          {isFetching ? "刷新中…" : "刷新状态"}
        </Button>
      </div>
    </Card>
  )
}
