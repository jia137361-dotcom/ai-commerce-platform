import { apiFetch } from "../../../lib/api-client"

export type S2bCatalogItem = {
  id: number
  code?: string
  name?: string
  en_name?: string
  purchase_price?: string | number
  view_image_src?: string
  blank_design_image?: string
  categorys?: Array<{ id?: number; name?: string; en_name?: string }>
  synced_product?: {
    product_id: string
    status: string
    title?: string
  } | null
}

export type S2bCatalogDetail = {
  id: number
  name?: string
  en_name?: string
  items?: Array<{ id?: number | string }>
  colors?: unknown[]
  sizes?: unknown[]
  categorys?: Array<{ id?: number; name?: string; en_name?: string }>
}

export type S2bCategory = {
  id: number
  name?: string
  en_name?: string
  parent_id?: number | null
  children?: S2bCategory[]
}

export type ImportPreviewRow = {
  row_number: number
  source_product_id: string
  source_variant_id: string
  supplier_sku: string
  publish_action: string
  valid: boolean
  errors: string[]
}

export type ImportPreview = {
  total_rows: number
  valid_rows: number
  invalid_rows: number
  rows: ImportPreviewRow[]
}

export type ImportedDraftProduct = {
  product_id: string
  title: string
  description?: string | null
  status: string
  price?: number | null
  image_url?: string | null
  variants?: Array<Record<string, unknown>>
  category_ids?: string[]
  ship_from_country?: string | null
  ship_from_label?: string | null
  metadata?: Record<string, unknown>
}

export const fetchS2bCatalog = (params: URLSearchParams) =>
  apiFetch<{ data: S2bCatalogItem[]; total: number; page: number; per_page: number; last_page: number }>(
    `/admin/supplier-catalog?${params.toString()}`
  )

export const fetchS2bDetail = (id: number) =>
  apiFetch<{ data: S2bCatalogDetail }>(`/admin/supplier-catalog/${id}?supplier_id=sup_s2bdiy`)

export const fetchS2bCategories = () =>
  apiFetch<{ categories: S2bCategory[] }>("/admin/s2bdiy/categories")

export const exportS2bCsv = (sourceProductIds: number[]) =>
  apiFetch<{ csv: string; filename: string }>("/admin/s2b-product-import/export-csv", {
    method: "POST",
    body: JSON.stringify({
      supplier_id: "sup_s2bdiy",
      source_product_ids: sourceProductIds,
    }),
  })

export const exportAllFilteredS2bCsv = async (input: { keyword?: string; categoryId?: string }) => {
  const ids: number[] = []
  const perPage = 200
  let page = 1
  let lastPage = 1
  do {
    const params = new URLSearchParams({
      supplier_id: "sup_s2bdiy",
      page: String(page),
      per_page: String(perPage),
    })
    if (input.keyword) params.set("keyword", input.keyword)
    if (input.categoryId) params.set("category_id", input.categoryId)
    const result = await fetchS2bCatalog(params)
    ids.push(...result.data.map((item) => Number(item.id)).filter(Number.isFinite))
    lastPage = result.last_page || page
    page += 1
  } while (page <= lastPage)
  return exportS2bCsv([...new Set(ids)])
}

export const previewS2bCsv = (csv: string) =>
  apiFetch<ImportPreview>("/admin/s2b-product-import/preview", {
    method: "POST",
    body: JSON.stringify({ csv }),
  })

export const importS2bCsv = (csv: string) =>
  apiFetch<{ imported_product_ids: string[]; skipped_rows: number[]; preview: ImportPreview }>(
    "/admin/s2b-product-import/import",
    {
      method: "POST",
      body: JSON.stringify({ csv }),
    }
  )

export const fetchImportedDrafts = (params: URLSearchParams) =>
  apiFetch<{ products: ImportedDraftProduct[]; count: number }>(
    `/admin/s2b-product-import/drafts?${params.toString()}`
  )

export const publishImportedDrafts = (input: { product_ids?: string[]; filters?: Record<string, string> }) =>
  apiFetch<{ published_count: number; failed_count: number; failed: Array<{ product_id: string; message: string }> }>(
    "/admin/s2b-product-import/publish",
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  )

export const downloadText = (filename: string, text: string) => {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
