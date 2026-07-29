import type { S2bdiyClient } from "./s2bdiy-client"
import { unwrapList, s2bGet, s2bPost } from "./s2bdiy-client"

// ---- Core types ----
export interface S2bBasicProductResponse {
  id: number; code: string; name: string; en_name: string
  purchase_price: number; produce_country: string; warehouse_name: string
  deliver_goods_text: string; product_show_master_image: string; transport_types_arr: unknown[]
  colors: S2bColor[]; sizes: S2bSize[]; items: S2bItem[]; views: S2bView[]
  print_areas: S2bPrintArea[]
  categorys: Array<{ id: number; name: string; en_name: string }>
  product_show_images?: Array<{
    color_id: number
    color_name?: string
    tone?: string
    images: Array<{ src?: string; big_src?: string }>
  }>
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
  const productId = (data.product_id ?? (data as Record<string, unknown>).id ?? (data as Record<string, unknown>).product_id) as string | number
  if (productId === undefined || productId === null) throw new Error(`quickCreate missing product_id: ${JSON.stringify(data)}`)
  return { product_id: productId, product_name: data.product_name, product_code: data.product_code }
}
export async function getProductDetail(client: S2bdiyClient, productId: number | string): Promise<Record<string, unknown>> {
  return client.request<Record<string, unknown>>(`/open/v1/product/${productId}`, { method: "GET" })
}

/** List designed supplier products (newest first when API returns chronological page 1). */
export async function listDesignedProducts(
  client: S2bdiyClient,
  query?: { page?: number; perPage?: number; name?: string }
): Promise<Array<Record<string, unknown>>> {
  const data = await client.request<unknown>("/open/v1/product", {
    method: "GET",
    query: {
      page: query?.page ?? 1,
      per_page: query?.perPage ?? 40,
      name: query?.name,
    },
  })
  if (data && typeof data === "object") {
    const root = data as Record<string, unknown>
    if (Array.isArray(root.data)) return root.data as Array<Record<string, unknown>>
    const nested = root.data
    if (nested && typeof nested === "object" && Array.isArray((nested as Record<string, unknown>).data)) {
      return (nested as Record<string, unknown>).data as Array<Record<string, unknown>>
    }
  }
  return unwrapList<Record<string, unknown>>(data)
}

export function extractMockupImageUrl(productDetail: Record<string, unknown>): string | null {
  const gallery = extractProductMockupGalleryFromS2bDetail(productDetail)
  return gallery[0]?.url ?? null
}

export type S2bProductGalleryItem = {
  id: string
  label: string
  url: string
  kind: "mockup" | "design" | "print_file"
}

const MOCKUP_VIEW_LABELS = ["Front", "Back", "Side", "On-body", "Detail"]

const readImageSrc = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim()) return value.trim()
  if (value && typeof value === "object" && typeof (value as Record<string, unknown>).src === "string") {
    const src = (value as Record<string, unknown>).src as string
    return src.trim() || null
  }
  return null
}

export function extractProductMockupGalleryFromS2bDetail(
  productDetail: Record<string, unknown>
): S2bProductGalleryItem[] {
  const seen = new Set<string>()
  const items: S2bProductGalleryItem[] = []

  const pushMockup = (url: string, label?: string) => {
    if (!url || seen.has(url)) return
    seen.add(url)
    const index = items.length
    items.push({
      id: index === 0 ? "mockup_front" : `mockup_${index + 1}`,
      label: label ?? MOCKUP_VIEW_LABELS[index] ?? `View ${index + 1}`,
      url,
      kind: "mockup",
    })
  }

  const showImages = productDetail.show_images
  if (Array.isArray(showImages)) {
    for (const block of showImages) {
      if (!block || typeof block !== "object") continue
      const row = block as Record<string, unknown>
      const colorName =
        typeof row.color_name === "string" && row.color_name.trim() ? row.color_name.trim() : null
      const images = row.images
      if (!Array.isArray(images)) continue
      images.forEach((image, imageIndex) => {
        const src = readImageSrc(image)
        if (!src) return
        const label =
          images.length > 1 && colorName
            ? `${colorName} ${imageIndex + 1}`
            : colorName ?? undefined
        pushMockup(src, label)
      })
    }
  }

  const variants = productDetail.variants
  if (Array.isArray(variants)) {
    for (const variant of variants) {
      if (!variant || typeof variant !== "object") continue
      const showImages = (variant as Record<string, unknown>).show_images
      const src = readImageSrc(showImages)
      if (src) pushMockup(src)
    }
  }

  return items
}

export function mergeProductGalleryWithS2bMockups(
  existingGallery: unknown,
  mockups: S2bProductGalleryItem[]
): S2bProductGalleryItem[] {
  const preserved: S2bProductGalleryItem[] = []
  if (Array.isArray(existingGallery)) {
    for (const item of existingGallery) {
      if (!item || typeof item !== "object") continue
      const row = item as Record<string, unknown>
      if (row.kind === "mockup") continue
      if (
        typeof row.id === "string" &&
        typeof row.label === "string" &&
        typeof row.url === "string" &&
        (row.kind === "design" || row.kind === "print_file")
      ) {
        preserved.push({
          id: row.id,
          label: row.label,
          url: row.url,
          kind: row.kind,
        })
      }
    }
  }
  return [...mockups, ...preserved]
}

// ---- Standalone (backward compat) ----
export async function getBasicProduct(id: number): Promise<S2bBasicProductResponse> {
  const res = await s2bGet<Record<string, unknown>>(`/open/v1/basicProduct/${id}`)
  return (res.data ?? res) as S2bBasicProductResponse
}
export async function getProduct(id: number): Promise<S2bProductDetailResponse> {
  const res = await s2bGet<Record<string, unknown>>(`/open/v1/product/${id}`)
  return (res.data ?? res) as S2bProductDetailResponse
}
export async function quickCreate(params: S2bQuickCreateRequest): Promise<S2bQuickCreateResponse> {
  const res = await s2bPost<Record<string, unknown>>("/open/v1/product/quickCreate", params)
  return (res.data ?? res) as S2bQuickCreateResponse
}
