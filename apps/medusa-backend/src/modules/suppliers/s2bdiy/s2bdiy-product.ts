import { s2bGet, s2bPost } from "./s2bdiy-client"

// ---- Basic Product ----

export interface S2bBasicProductResponse {
  id: number
  code: string
  name: string
  en_name: string
  purchase_price: number
  produce_country: string
  warehouse_name: string
  deliver_goods_text: string
  product_show_master_image: string
  transport_types_arr: unknown[]
  colors: S2bColor[]
  sizes: S2bSize[]
  items: S2bItem[]
  views: S2bView[]
}

export interface S2bColor {
  id: number
  name: string
}

export interface S2bSize {
  id: number
  name: string
}

export interface S2bItem {
  id: number
  code: string
  size_id: number
  color_id: number
  price: number
  weight: number
  length: number
  width: number
  height: number
}

export interface S2bView {
  id: number
  name: string
  en_name: string
  tip_level: number
  print_areas: S2bPrintArea[]
}

export interface S2bPrintArea {
  view_id: number
  width: number
  height: number
}

export async function getBasicProduct(id: number): Promise<S2bBasicProductResponse> {
  return s2bGet<S2bBasicProductResponse>(`/open/v1/basicProduct/${id}`)
}

// ---- Supplier Product (quickCreate result) ----

export interface S2bQuickCreateRequest {
  size_id: number
  color_id: number
  product_design: {
    basic_product_id: number
    name: string
    views: Array<{
      view_id: number
      objects: Array<{
        type: "image"
        material_id: number
        design_type: number
      }>
    }>
  }
}

export interface S2bQuickCreateResponse {
  product_id: number
  product_name: string
  product_code: string
}

export async function quickCreate(params: S2bQuickCreateRequest): Promise<S2bQuickCreateResponse> {
  return s2bPost<S2bQuickCreateResponse>("/open/v1/product/quickCreate", params)
}

// ---- Product Detail ----

export interface S2bProductDetailResponse {
  id: number
  product_name: string
  product_code: string
  show_images: S2bShowImage[]
  variants: S2bProductVariant[]
}

export interface S2bShowImage {
  images: Array<{ src: string }>
}

export interface S2bProductVariant {
  id: number
  size_id: number
  color_id: number
  size_name: string
  color_name: string
  weight: number
  length: number
  width: number
  height: number
  show_images: S2bShowImage[]
}

export async function getProduct(id: number): Promise<S2bProductDetailResponse> {
  return s2bGet<S2bProductDetailResponse>(`/open/v1/product/${id}`)
}
