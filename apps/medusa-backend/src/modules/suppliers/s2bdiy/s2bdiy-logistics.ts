import { s2bGet } from "./s2bdiy-client"

export interface S2bLogisticsCalcRequest {
  basic_product_id: number
  platform: number
  num: number
  country: string
  province?: string
  postcode?: string
  weight: number
  length: number
  width: number
  height: number
}

export interface S2bLogisticsChannel {
  logistics_platform_id: number
  name: string
  en_name: string
  full_en_name: string
  day_from: number
  day_to: number
  amount: number
  min_amount: number
  max_amount: number
}

export async function calculateLogistics(
  params: S2bLogisticsCalcRequest
): Promise<S2bLogisticsChannel[]> {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined) query.set(k, String(v))
  })
  return s2bGet<S2bLogisticsChannel[]>(
    `/open/v1/logisticsCalculation?${query.toString()}`
  )
}

export interface S2bOrderLogisticsChannel {
  logistics_platform_id: number
  amount: number
  day_from: number
  day_to: number
}

export async function getOrderLogistics(
  orderNo: string
): Promise<S2bOrderLogisticsChannel[]> {
  return s2bGet<S2bOrderLogisticsChannel[]>(
    `/open/v1/logistics/orderLogistics?order_no=${orderNo}`
  )
}
