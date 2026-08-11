import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ApiError, apiFetch } from "../lib/api-client"
import { Button } from "./ui/Button"
import { Card } from "./ui/Card"

const formatConnectError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "Unable to start Stripe onboarding"
  if (message.toLowerCase().includes("stripe connect is not enabled")) {
    return {
      title: "平台 Stripe 账号尚未开通 Connect",
      message:
        "请先在 Stripe Dashboard 开通 Connect（测试环境：https://dashboard.stripe.com/test/connect），完成平台 Connect 设置后再点击「绑定 Stripe 收款账号」。",
      code: error instanceof ApiError ? error.code : undefined,
    }
  }
  return {
    title: "绑定收款账号失败",
    message,
    code: error instanceof ApiError ? error.code : undefined,
  }
}

export type SellerStripeConnectStatus = {
  configured: boolean
  connected: boolean
  account_id?: string | null
  charges_enabled: boolean
  payouts_enabled: boolean
  details_submitted: boolean
  onboarding_required: boolean
  dashboard_url?: string | null
}

export function SellerStripeConnectSection() {
  const queryClient = useQueryClient()
  const [message, setMessage] = useState<string>()
  const [errorInfo, setErrorInfo] = useState<{ title: string; message: string; code?: string }>()
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["stripe-connect"],
    queryFn: () =>
      apiFetch<{ stripe_connect: SellerStripeConnectStatus }>("/admin/stripe-connect"),
  })

  const startOnboarding = useMutation({
    mutationFn: () =>
      apiFetch<{ onboarding_url: string }>("/admin/stripe-connect", { method: "POST" }),
    onSuccess: (payload) => {
      setErrorInfo(undefined)
      if (payload.onboarding_url) {
        window.location.assign(payload.onboarding_url)
      }
    },
    onError: (error: unknown) => {
      setMessage(undefined)
      setErrorInfo(formatConnectError(error))
    },
  })

  const refreshStatus = useMutation({
    mutationFn: () =>
      apiFetch<{ stripe_connect: SellerStripeConnectStatus; retried_payout_count?: number }>(
        "/admin/stripe-connect/refresh",
        { method: "POST" }
      ),
    onSuccess: (payload) => {
      setErrorInfo(undefined)
      queryClient.setQueryData(["stripe-connect"], { stripe_connect: payload.stripe_connect })
      const retried = payload.retried_payout_count ?? 0
      setMessage(
        payload.stripe_connect.connected
          ? retried > 0
            ? `收款账号已就绪，已补发 ${retried} 笔待结算订单款项。`
            : "收款账号已就绪，买家确认收货后款项会自动转入此账号。"
          : "Stripe 账号尚未完成验证，请继续完成绑定流程。"
      )
    },
    onError: (error: unknown) => {
      setMessage(undefined)
      setErrorInfo(formatConnectError(error))
    },
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const connectState = params.get("stripe_connect")
    if (!connectState) return
    void refreshStatus.mutateAsync().finally(() => {
      params.delete("stripe_connect")
      const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`
      window.history.replaceState({}, "", next)
    })
  }, [])

  const status = data?.stripe_connect

  return (
    <Card className="mx-auto mt-6 max-w-2xl">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">收款账号</h2>
          <p className="mt-1 text-sm text-slate-600">
            绑定 Stripe 收款账号后，买家确认收货时订单款项会自动转入您的账户（与买家绑定支付方式类似）。
          </p>
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-500">正在检查 Stripe 收款状态…</p>
        ) : !status?.configured ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            服务端未配置 <code>STRIPE_API_KEY</code>，请联系管理员启用 Stripe 后再绑定收款账号。
          </div>
        ) : status.connected ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-medium">收款账号已绑定</p>
            <p className="mt-1">账号：{status.account_id ?? "已连接"}</p>
            <p className="mt-1">买家确认收货后，款项将自动结算到此 Stripe 账户。</p>
            {status.dashboard_url ? (
              <a
                className="mt-3 inline-block text-sm font-semibold text-emerald-800 underline"
                href={status.dashboard_url}
                target="_blank"
                rel="noreferrer"
              >
                打开 Stripe 收款面板
              </a>
            ) : null}
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-medium">尚未绑定收款账号</p>
            <p className="mt-1">
              若买家在您绑定前已确认收货，相关款项会暂存为待结算；绑定完成后系统会自动补发。
            </p>
          </div>
        )}

        {errorInfo ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            <p className="font-medium">{errorInfo.title}</p>
            <p className="mt-1">{errorInfo.message}</p>
            {errorInfo.code ? <p className="mt-2 text-xs text-red-700">错误码：{errorInfo.code}</p> : null}
          </div>
        ) : null}

        {message ? <p className="text-sm text-slate-600">{message}</p> : null}

        <div className="flex flex-wrap gap-3">
          {status?.configured && !status.connected ? (
            <Button
              type="button"
              disabled={startOnboarding.isPending}
              onClick={() => startOnboarding.mutate()}
            >
              {startOnboarding.isPending ? "跳转 Stripe…" : "绑定 Stripe 收款账号"}
            </Button>
          ) : null}
          {status?.configured ? (
            <Button
              type="button"
              variant="outline"
              disabled={refreshStatus.isPending}
              onClick={() => refreshStatus.mutate()}
            >
              {refreshStatus.isPending ? "刷新中…" : "刷新状态"}
            </Button>
          ) : null}
          {!isLoading ? (
            <Button type="button" variant="ghost" onClick={() => void refetch()}>
              重新加载
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
