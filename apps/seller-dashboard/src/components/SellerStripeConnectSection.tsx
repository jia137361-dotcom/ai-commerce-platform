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
        "请使用配置 STRIPE_API_KEY 的同一 Stripe 账号，在测试环境 https://dashboard.stripe.com/test/connect 先完成平台账户激活及 Connect 平台资料，再点击「绑定 Stripe 收款账号」。",
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
  requirements_due?: string[]
  requirements_disabled_reason?: string | null
  account_country?: string | null
  platform_country?: string | null
  country_mismatch: boolean
  account_missing: boolean
  test_mode: boolean
}

export function SellerStripeConnectSection() {
  const queryClient = useQueryClient()
  const [message, setMessage] = useState<string>()
  const [errorInfo, setErrorInfo] = useState<{ title: string; message: string; code?: string }>()
  const [connectCountry, setConnectCountry] = useState("HK")
  const { data, isLoading, error: statusError, refetch } = useQuery({
    queryKey: ["stripe-connect"],
    queryFn: () =>
      apiFetch<{ stripe_connect: SellerStripeConnectStatus }>("/admin/stripe-connect"),
  })

  const startOnboarding = useMutation<{ onboarding_url: string }, unknown, { replace: boolean; country: string }>({
    mutationFn: ({ replace, country }) =>
      apiFetch<{ onboarding_url: string }>("/admin/stripe-connect", {
        method: "POST",
        body: JSON.stringify({ replace, country }),
      }),
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

  useEffect(() => {
    if (status?.platform_country) setConnectCountry(status.platform_country)
  }, [status?.platform_country])

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
        ) : statusError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            <p className="font-medium">无法读取 Stripe 收款状态</p>
            <p className="mt-1">{statusError instanceof Error ? statusError.message : "请刷新后重试。"}</p>
          </div>
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
            {status?.account_missing ? (
              <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-red-900">
                <p className="font-medium">原 Stripe 收款账号已不存在</p>
                <p className="mt-1">请重新绑定新的 Stripe Connect 收款账号。新账号完成验证后，系统会重试可结算订单。</p>
              </div>
            ) : null}
            {status?.country_mismatch ? (
              <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-red-900">
                <p className="font-medium">当前 Stripe 收款账号的地区无法接收平台转账</p>
                <p className="mt-1">
                  平台账户地区为 {status.platform_country ?? "未知"}，当前收款账号地区为 {status.account_country ?? "未知"}。
                  这不影响买家使用其他地区的银行卡或钱包支付，但当前平台的 Stripe Connect 资金流不能向该地区结算。
                  请按卖家的合法经营地区配置兼容的 Connect 结算方案后，再重新绑定并补发此前失败的结算。
                </p>
              </div>
            ) : null}
            {status?.requirements_due?.length ? (
              <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-3 text-amber-900">
                <p className="font-medium">Stripe 仍需要补充资料</p>
                <p className="mt-1 font-mono text-xs">{status.requirements_due.join(", ")}</p>
                {status.test_mode && status.requirements_due.includes("individual.id_number") ? (
                  <p className="mt-2">这是测试模式：在 Stripe 的身份号码字段填写测试值 <code>000000000</code>，再点击 Confirm。</p>
                ) : null}
              </div>
            ) : null}
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
            <>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                收款账户国家/地区
                <select
                  value={connectCountry}
                  onChange={(event) => setConnectCountry(event.target.value)}
                  disabled={startOnboarding.isPending}
                  className="rounded border border-slate-300 bg-white px-2 py-1"
                >
                  <option value="HK">Hong Kong</option>
                  <option value="US">United States</option>
                </select>
              </label>
              <Button
                type="button"
                disabled={startOnboarding.isPending}
                onClick={() =>
                  startOnboarding.mutate({
                    replace: status?.country_mismatch === true || status?.account_missing === true,
                    country: connectCountry,
                  })
                }
              >
                {startOnboarding.isPending
                  ? "跳转 Stripe…"
                  : status?.country_mismatch || status?.account_missing
                    ? "重新绑定 Stripe 收款账号"
                    : "绑定 Stripe 收款账号"}
              </Button>
            </>
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
