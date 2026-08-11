import type { S2bdiyClient } from "./s2bdiy-client"
import { unwrapList, s2bGet } from "./s2bdiy-client"

// ---- Types ----
export type LogisticsOption = { logistics_platform_id?: number | string; name?: string; amount?: number; day_from?: number; day_to?: number }
export type LogisticsCalculationInput = { basic_product_id: number | string; platform: number; num: number; country: string; province?: string; postcode?: string; weight: number; length: number; width: number; height: number }
export interface S2bLogisticsCalcRequest { basic_product_id: number; platform: number; num: number; country: string; province?: string; postcode?: string; weight: number; length: number; width: number; height: number }
export interface S2bLogisticsChannel { logistics_platform_id: number; name: string; en_name: string; full_en_name: string; day_from: number; day_to: number; amount: number; min_amount: number; max_amount: number }
export interface S2bOrderLogisticsChannel { logistics_platform_id: number; amount: number; day_from: number; day_to: number }

export type SubmitLogisticsInput = {
  order_id: number | string
  logistics_platform_id: number
  logistics_no: string
  logistics_company?: string
}

// ---- Client-based (Dev2 compat) ----
export async function calculateLogisticsClient(
  client: S2bdiyClient,
  input: LogisticsCalculationInput,
  options?: { timeoutMs?: number }
): Promise<LogisticsOption[]> {
  const data = await client.request<unknown>("/open/v1/logisticsCalculation", {
    method: "GET",
    timeoutMs: options?.timeoutMs,
    query: {
      basic_product_id: input.basic_product_id,
      platform: input.platform,
      num: input.num,
      country: input.country,
      province: input.province ?? "",
      postcode: input.postcode ?? "",
      weight: input.weight,
      length: input.length,
      width: input.width,
      height: input.height,
    },
  })
  if (data && typeof data === "object" && Array.isArray((data as Record<string, unknown>).data)) {
    return (data as Record<string, unknown>).data as LogisticsOption[]
  }
  return unwrapList<LogisticsOption>(data)
}
export function resolveLogisticsPlatformId(options: LogisticsOption[]): string | null {
  const picked = pickLogisticsOption(options, true)
  if (picked?.logistics_platform_id != null) return String(picked.logistics_platform_id)
  const fallback = process.env.S2BDIY_TEST_LOGISTICS_ID
  return fallback && fallback.length > 0 ? fallback : null
}
export async function getOrderLogisticsClient(client: S2bdiyClient, orderNo: string | number): Promise<LogisticsOption[]> {
  const data = await client.request<unknown>("/open/v1/logistics/orderLogistics", { method: "GET", query: { order_no: orderNo } })
  return unwrapList<LogisticsOption>(data)
}
export function pickLogisticsOption(options: LogisticsOption[], preferFreeShipping = true): LogisticsOption | null {
  if (!options.length) return null
  if (preferFreeShipping) { const free = options.find((o) => (o.name ?? "").includes("包邮")); if (free) return free }
  return options[0]
}

// ---- Submit logistics to S2BDIY ----
export async function submitOrderLogisticsClient(
  client: S2bdiyClient,
  input: SubmitLogisticsInput
): Promise<Record<string, unknown>> {
  return client.request<Record<string, unknown>>(
    `/open/v1/order/${input.order_id}/logistics`,
    {
      method: "POST",
      body: {
        logistics_platform_id: input.logistics_platform_id,
        logistics_no: input.logistics_no,
        logistics_company: input.logistics_company ?? "",
      },
    }
  )
}

// ---- Standalone (backward compat) ----
export async function calculateLogistics(params: S2bLogisticsCalcRequest): Promise<S2bLogisticsChannel[]> {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined) query.set(k, String(v)) })
  return s2bGet(`/open/v1/logisticsCalculation?${query.toString()}`)
}
export async function getOrderLogistics(orderNo: string): Promise<S2bOrderLogisticsChannel[]> { return s2bGet(`/open/v1/logistics/orderLogistics?order_no=${orderNo}`) }
export async function submitOrderLogistics(input: SubmitLogisticsInput): Promise<unknown> {
  const { getS2bdiyAccessToken } = await import("./s2bdiy-auth.js")
  const apiBaseUrl = (process.env.S2BDIY_BASE_URL || process.env.S2BDIY_API_BASE_URL)!.replace(/\/$/, "")
  const token = await getS2bdiyAccessToken({
    apiBaseUrl,
    appKey: process.env.S2BDIY_APP_KEY!,
    appSecret: process.env.S2BDIY_APP_SECRET!,
    platformId: Number(process.env.S2BDIY_PLATFORM_ID || "99"),
  })
  const res = await fetch(`${apiBaseUrl}/open/v1/order/${input.order_id}/logistics`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      logistics_platform_id: input.logistics_platform_id,
      logistics_no: input.logistics_no,
      logistics_company: input.logistics_company ?? "",
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`S2BDIY POST /open/v1/order/${input.order_id}/logistics failed: ${res.status} ${text}`)
  }
  return res.json()
}
