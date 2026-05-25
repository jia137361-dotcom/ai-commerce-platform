import { s2bGet, s2bPost } from "./s2bdiy-client"

export interface S2bCreateOrderRequest {
  third_order_id: string
  platform: number
  order_items: Array<{
    supplier_product_id: number
    size_id: number
    color_id: number
    num: number
  }>
  logistics_id: number
  order_address: {
    name: string
    phone: string
    country: string
    province: string
    city: string
    district: string
    address: string
    postcode: string
    email: string
  }
}

export interface S2bCreateOrderResponse {
  order_id: number
  order_no: string
}

export async function createOrder(
  params: S2bCreateOrderRequest
): Promise<S2bCreateOrderResponse> {
  return s2bPost<S2bCreateOrderResponse>("/open/v1/order", params)
}

export interface S2bOrderDetailResponse {
  id: number
  order_no: string
  status: number
  status_text: string
  pay_status: number
  pay_status_text: string
  product_amount: number
  shipping_amount: number
  total_amount: number
  order_items: Array<{
    show_image: string
    basic_product_id: number
    supplier_product_id: number
    supplier_product_name: string
    supplier_size_id: number
    supplier_color_id: number
    supplier_size_name: string
    supplier_color_name: string
    quantity: number
    product_amount: number
    total_amount: number
  }>
  order_logistics: {
    logistics_platform_id: number
    logistics_name: string
    logistics_track_number: string
    logistics_status: number
    oss_file_src: string
  } | null
}

export async function getOrder(id: number): Promise<S2bOrderDetailResponse> {
  return s2bGet<S2bOrderDetailResponse>(`/open/v1/order/${id}`)
}

export async function payOrder(ids: number[]): Promise<unknown> {
  return s2bPost("/open/v1/orderPay", { ids })
}
