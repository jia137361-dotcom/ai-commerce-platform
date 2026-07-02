import type { S2bdiyClient } from "./s2bdiy-client"
import { unwrapList, s2bGet, s2bPost } from "./s2bdiy-client"

// ---- Core types ----
export interface S2bBasicProductResponse {
  id: number; code: string; name: string; en_name: string
  purchase_price: number; produce_country: string; warehouse_name: string
  deliver_goods_text: string; product_show_master_image: string; transport_types_arr: unknown[]
  colors: S2bColor[]; sizes: S2bSize[]; items: S2bItem[]; views: S2bView[]
}
export interface S2bColor { id: number; name: string }
export interface S2bSize { id: number; name: string }
export interface S2bItem { id: number; code: string; size_id: number; color_id: number; price: number; weight: number; length: number; width: number; height: number }
export interface S2bView { id: number; name: string; en_name: string; tip_level: number; print_areas: S2bPrintArea[] }
export interface S2bPrintArea { view_id: number; width: number; height: number }
export interface S2bQuickCreateRequest {
  size_id: number; color_id: number
  product_design: { basic_product_id: number; name: string; views: Array<{ view_id: number; objects: Array<{ type: "image"; material_id: number; design_type: number }> }> }
}
export interface S2bQuickCreateResponse { product_id: number; product_name: string; product_code: string }
export interface S2bProductDetailResponse { id: number; product_name: string; product_code: string; show_images: S2bShowImage[]; variants: S2bProductVariant[] }
export interface S2bShowImage { images: Array<{ src: string }> }
export interface S2bProductVariant { id: number; size_id: number; color_id: number; size_name: string; color_name: string; weight: number; length: number; width: number; height: number; show_images: S2bShowImage[] }

export type BasicProductDetail = Record<string, unknown>
export type QuickCreateInput = { size_id: number; color_id: number; basic_product_id: number; name: string; material_id: number | string; view_id: number; design_type?: number }
export type QuickCreateResult = { product_id: number | string; product_name?: string; product_code?: string }

// ---- Client-based (Dev2 compat) ----
export async function listBasicProducts(client: S2bdiyClient, query?: { page?: number; per_page?: number }): Promise<BasicProductDetail[]> {
  const data = await client.request<unknown>("/open/v1/basicProduct", { method: "GET", query: { page: query?.page ?? 1, per_page: query?.per_page ?? 20 } })
  if (data && typeof data === "object" && Array.isArray((data as Record<string, unknown>).data)) return (data as Record<string, unknown>).data as BasicProductDetail[]
  return unwrapList<BasicProductDetail>(data)
}
export async function getBasicProductDetail(client: S2bdiyClient, basicProductId: number | string): Promise<BasicProductDetail> {
  return client.request<BasicProductDetail>(`/open/v1/basicProduct/${basicProductId}`, { method: "GET" })
}
export async function quickCreateProduct(client: S2bdiyClient, input: QuickCreateInput): Promise<QuickCreateResult> {
  const designType = input.design_type ?? 1
  const body = { size_id: input.size_id, color_id: input.color_id, product_design: { basic_product_id: input.basic_product_id, name: input.name, views: [{ view_id: input.view_id, objects: [{ type: "image", material_id: Number(input.material_id), design_type: designType }] }] } }
  const data = await client.request<QuickCreateResult>("/open/v1/product/quickCreate", { method: "POST", body })
  const productId = data.product_id ?? (data as Record<string, unknown>).id ?? (data as Record<string, unknown>).product_id
  if (productId === undefined || productId === null) throw new Error(`quickCreate missing product_id: ${JSON.stringify(data)}`)
  return { product_id: productId, product_name: data.product_name, product_code: data.product_code }
}
export async function getProductDetail(client: S2bdiyClient, productId: number | string): Promise<Record<string, unknown>> {
  return client.request<Record<string, unknown>>(`/open/v1/product/${productId}`, { method: "GET" })
}
export function extractMockupImageUrl(productDetail: Record<string, unknown>): string | null {
  const variants = productDetail.variants
  if (Array.isArray(variants)) {
    for (const variant of variants) {
      if (!variant || typeof variant !== "object") continue
      const showImages = (variant as Record<string, unknown>).show_images
      if (typeof showImages === "string" && showImages.length > 0) return showImages
      if (Array.isArray(showImages) && showImages.length > 0) {
        const first = showImages[0]
        if (typeof first === "string") return first
        if (first && typeof first === "object" && typeof (first as Record<string, unknown>).src === "string") return (first as Record<string, unknown>).src as string
      }
    }
  }
  const showImages = productDetail.show_images
  if (Array.isArray(showImages) && showImages.length > 0) {
    const block = showImages[0] as Record<string, unknown> | undefined
    if (block) {
      const images = block.images as Array<Record<string, unknown>> | undefined
      if (Array.isArray(images) && images.length > 0 && typeof images[0]?.src === "string") return images[0].src as string
    }
  }
  return null
}

// ---- Standalone (backward compat) ----
export async function getBasicProduct(id: number): Promise<S2bBasicProductResponse> { return s2bGet(`/open/v1/basicProduct/${id}`) }
export async function getProduct(id: number): Promise<S2bProductDetailResponse> { return s2bGet(`/open/v1/product/${id}`) }
export async function quickCreate(params: S2bQuickCreateRequest): Promise<S2bQuickCreateResponse> { return s2bPost("/open/v1/product/quickCreate", params) }
