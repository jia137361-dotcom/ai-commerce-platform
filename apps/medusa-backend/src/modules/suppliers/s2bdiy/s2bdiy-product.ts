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

export type S2bdiyEnglishProductInfo = {
  english_name: string | null
  english_description: string | null
  english_material: string | null
  english_technology: string | null
  delivery_note: string | null
  colors: Array<{ id: string; name: string }>
  sizes: Array<{ id: string; name: string }>
  views: Array<{ id: string; name: string }>
  categories: Array<{ id: string; name: string }>
  images: string[]
  blank_design_images: string[]
  produce_area: string | null
  produce_country: string | null
  warehouse: string | null
  variants: Array<Record<string, unknown>>
  print_areas: Array<Record<string, unknown>>
  basic_details: Array<{ label: string; value: string }>
  size_chart: { columns: string[]; rows: Array<Record<string, string>> } | null
  packaging_specs: { columns: string[]; rows: Array<Record<string, string>> } | null
  official_images: Array<{ url: string; color_name: string | null }>
}

const englishText = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null

const englishName = (value: unknown): string | null => {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  return englishText(row.en_name)
}

const imageUrl = (value: unknown): string | null => {
  if (typeof value === "string" && /^https?:\/\//.test(value.trim())) return value.trim()
  if (value && typeof value === "object") {
    const row = value as Record<string, unknown>
    return imageUrl(row.src ?? row.image_src ?? row.url)
  }
  return null
}

/** Convert a S2BDIY detail payload into the English-only UI contract. */
export function normalizeS2bdiyEnglishProduct(
  product: Record<string, unknown>
): S2bdiyEnglishProductInfo {
  const collectImages = (value: unknown): string[] => {
    const result: string[] = []
    const visit = (item: unknown) => {
      if (Array.isArray(item)) return item.forEach(visit)
      const url = imageUrl(item)
      if (url && !result.includes(url)) result.push(url)
      if (item && typeof item === "object") {
        const row = item as Record<string, unknown>
        if (row.images) visit(row.images)
      }
    }
    visit(value)
    return result
  }
  const list = (key: string) => Array.isArray(product[key]) ? product[key] : []
  const mapNames = (key: string) => list(key).flatMap((item) => {
    const id = item && typeof item === "object" ? (item as Record<string, unknown>).id : null
    const name = englishName(item)
    return id != null && name ? [{ id: String(id), name }] : []
  })
  const scalar = (value: unknown): string | null => {
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
    return englishText(value)
  }
  const sizeNameById = new Map(
    list("sizes").flatMap((item) => {
      const row = item && typeof item === "object" ? item as Record<string, unknown> : {}
      const id = row.id == null ? null : String(row.id)
      const name = englishName(item) ?? scalar(row.name)
      return id && name ? [[id, name] as const] : []
    })
  )
  const sizeAttributeLabels: Record<string, string> = {
    "合适身高": "Suitable height",
    "衣长": "Body length",
    "胸宽": "Chest width",
    "建议体重": "Recommended weight",
  }
  const itemRows = list("items").map((item) => {
    const row = item && typeof item === "object" ? item as Record<string, unknown> : {}
    const sizeId = row.size_id == null ? null : String(row.size_id)
    return {
      Size: sizeNameById.get(sizeId ?? "") ?? sizeId ?? "",
      Weight: scalar(row.weight) ?? "",
      Length: scalar(row.length) ?? "",
      Width: scalar(row.width) ?? "",
      Height: scalar(row.height) ?? "",
    }
  }).filter((row) => Object.values(row).some(Boolean))
  const table = (
    value: unknown,
    aliases: Array<[string, string]>,
    fallback: Array<Record<string, string>>,
  ) => {
    const source = Array.isArray(value) ? value : fallback
    const rows = source.flatMap((item) => {
      if (!item || typeof item !== "object") return []
      const sourceRow = item as Record<string, unknown>
      const normalized = Object.fromEntries(
        aliases.flatMap(([key, label]) => {
          const value = scalar(sourceRow[key] ?? sourceRow[label])
          return value ? [[label, value]] : []
        })
      ) as Record<string, string>
      return Object.keys(normalized).length ? [normalized] : []
    })
    if (!rows.length) return null
    return {
      columns: aliases.map(([, label]) => label).filter((label) => rows.some((row) => row[label])),
      rows,
    }
  }
  const basicDetails = [
    ["Product", englishText(product.en_name)],
    ["Product code", scalar(product.code)],
    ["Product number", scalar(product.id)],
    ["Material", englishText(product.en_product_material_text)],
    ["Technology", englishText(product.en_product_technology_text)],
    ["Production area", englishText(product.produce_area_text) ?? scalar(product.produce_area)],
    ["Production country", englishText(product.produce_country_text) ?? englishText(product.produce_country)],
    ["Warehouse", englishText(product.warehouse_name)],
    ["Delivery", englishText(product.deliver_goods_text)],
  ].flatMap(([label, value]) => value ? [{ label, value }] : [])
  const officialImages = Array.isArray(product.product_show_images)
    ? product.product_show_images.flatMap((block) => {
      if (!block || typeof block !== "object") return []
      const row = block as Record<string, unknown>
      const colorName = englishText(row.color_name) ?? englishText(row.tone)
      return Array.isArray(row.images)
        ? row.images.flatMap((image) => {
          const url = imageUrl(image)
          return url ? [{ url, color_name: colorName }] : []
        })
        : []
    })
    : []
  const sizeAliases: Array<[string, string]> = [
    ["size", "Size"], ["size_name", "Size"], ["weight", "Weight"],
    ["length", "Length"], ["width", "Width"], ["height", "Height"],
    ["chest", "Chest"], ["bust", "Bust"], ["body_length", "Body length"],
  ]
  const packagingAliases: Array<[string, string]> = [
    ["size", "Size"], ["size_name", "Size"], ["length", "Length"],
    ["width", "Width"], ["height", "Height"], ["volume", "Volume"],
    ["weight", "Weight"], ["max_qty", "Max quantity"],
  ]
  const liveSizeRows = list("attr_values").flatMap((item) => {
    if (!item || typeof item !== "object") return []
    const row = item as Record<string, unknown>
    const sizeId = row.size_id == null ? null : String(row.size_id)
    const size = englishText(row.size_name) ?? sizeNameById.get(sizeId ?? "") ?? sizeId
    if (!size || !Array.isArray(row.attr_value)) return []
    const attributes = row.attr_value.reduce<Record<string, string>>((result, attribute) => {
      if (!attribute || typeof attribute !== "object") return result
      const source = attribute as Record<string, unknown>
      const sourceLabel = englishText(source.attr_name_en) ?? englishText(source.attr_name)
      const label = sourceLabel ? sizeAttributeLabels[sourceLabel] ?? sourceLabel : null
      const value = scalar(source.attr_value)
      if (label && value) result[label] = value
      return result
    }, {})
    return Object.keys(attributes).length ? [{ Size: size, ...attributes }] : []
  })
  const livePackagingRows = list("size_specifications").flatMap((item) => {
    if (!item || typeof item !== "object") return []
    const row = item as Record<string, unknown>
    const sizeId = row.size_id == null ? null : String(row.size_id)
    const size = englishText(row.size_name) ?? sizeNameById.get(sizeId ?? "") ?? sizeId
    if (!size) return []
    const weight = scalar(row.weight)
    const length = scalar(row.length)
    const width = scalar(row.width)
    const height = scalar(row.height)
    const volume = scalar(row.volume)
    return [{
      Size: size,
      ...(weight ? { Weight: `${weight} kg` } : {}),
      ...(length ? { Length: `${length} cm` } : {}),
      ...(width ? { Width: `${width} cm` } : {}),
      ...(height ? { Height: `${height} cm` } : {}),
      ...(volume ? { Volume: `${volume} cm³` } : {}),
    }]
  })

  return {
    english_name: englishText(product.en_name),
    english_description: englishText(product.en_desc),
    english_material: englishText(product.en_product_material_text),
    english_technology: englishText(product.en_product_technology_text),
    delivery_note: englishText(product.deliver_goods_text),
    colors: mapNames("colors"),
    sizes: mapNames("sizes"),
    views: mapNames("views"),
    categories: mapNames("categorys"),
    images: collectImages(product.product_show_images ?? product.product_show_master_image ?? product.view_image_src),
    blank_design_images: collectImages(product.blank_design_images ?? product.blank_design_image),
    // The API's *_text fields are localized Chinese in the current account;
    // expose stable country/area codes instead of leaking localized text.
    produce_area: englishText(product.produce_area),
    produce_country: englishText(product.produce_country),
    warehouse: englishText(product.warehouse_name),
    variants: list("items").filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object")),
    print_areas: list("print_areas").filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object")),
    basic_details: basicDetails,
    size_chart: liveSizeRows.length
      ? { columns: ["Size", ...Object.keys(liveSizeRows.reduce<Record<string, string>>((columns, row) => { Object.keys(row).forEach((key) => { columns[key] = key }); return columns }, {})).filter((key) => key !== "Size")], rows: liveSizeRows }
      : table(product.size_chart ?? product.size_table ?? product.size_info, sizeAliases, itemRows),
    packaging_specs: livePackagingRows.length
      ? { columns: ["Size", "Weight", "Length", "Width", "Height", "Volume"].filter((key) => livePackagingRows.some((row) => key in row)), rows: livePackagingRows }
      : table(product.packaging_specs ?? product.package_specs ?? product.packing_specs, packagingAliases, itemRows),
    official_images: officialImages,
  }
}

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
