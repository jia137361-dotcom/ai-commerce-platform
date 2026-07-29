/**
 * S2BDIY Supplier Adapter
 *
 * Wraps existing S2BDIY modules into the generic SupplierAdapter interface.
 */

import type { SupplierAdapter, CatalogResult, ProductDetailView, SyncData } from "../adapter"
import { getS2bdiyConfig } from "./config"
import { getS2bdiyAccessToken } from "./s2bdiy-auth"
import { getBasicProduct } from "./s2bdiy-product"

const SUPPLIER_ID = "sup_s2bdiy"

async function fetchCatalog(params: {
  page: number
  perPage: number
  categoryId?: number
  keyword?: string
}): Promise<CatalogResult> {
  const config = getS2bdiyConfig()
  if (!config) throw new Error("S2BDIY not configured")

  const token = await getS2bdiyAccessToken(config)
  const baseUrl = config.apiBaseUrl.replace(/\/$/, "")

  const query = new URLSearchParams({
    page: String(params.page),
    per_page: String(params.perPage),
  })
  if (params.categoryId) query.set("category_id", String(params.categoryId))
  if (params.keyword) query.set("keyword", params.keyword)

  const resp = await fetch(`${baseUrl}/open/v1/basicProduct?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!resp.ok) {
    throw new Error(`S2BDIY catalog API failed: ${resp.status}`)
  }

  const body = await resp.json()
  if (
    body &&
    typeof body === "object" &&
    (body as Record<string, unknown>).status_code !== undefined &&
    Number((body as Record<string, unknown>).status_code) !== 200
  ) {
    const message = String((body as Record<string, unknown>).msg ?? "S2BDIY catalog business error")
    throw new Error(`S2BDIY catalog API failed: ${message}`)
  }
  const data = body.data ?? body

  return {
    data: data.data ?? data,
    total: data.total ?? 0,
    page: data.current_page ?? params.page,
    per_page: data.per_page ?? params.perPage,
    last_page: data.last_page ?? 1,
  }
}

export const s2bdiyAdapter: SupplierAdapter = {
  supplierId: SUPPLIER_ID,

  async listProducts(params) {
    return fetchCatalog(params)
  },

  async getProductDetail(productId) {
    const data = await getBasicProduct(Number(productId))
    const d = data as unknown as Record<string, unknown>
    return {
      id: data.id,
      name: data.name,
      en_name: data.en_name,
      colors: (d.colors ?? []) as ProductDetailView["colors"],
      sizes: (d.sizes ?? []) as ProductDetailView["sizes"],
      views: (d.views ?? []) as ProductDetailView["views"],
      print_areas: (d.print_areas ?? []) as ProductDetailView["print_areas"],
      items: (d.items ?? []) as ProductDetailView["items"],
      product_show_images: (d.product_show_images ?? []) as ProductDetailView["product_show_images"],
      categorys: (d.categorys ?? []) as ProductDetailView["categorys"],
      produce_country: data.produce_country,
      warehouse_name: data.warehouse_name,
      deliver_goods_text: data.deliver_goods_text,
    }
  },

  async syncProduct(productId) {
    const data = await getBasicProduct(Number(productId))
    return {
      id: data.id,
      name: data.name,
      en_name: data.en_name,
      purchase_price: data.purchase_price,
      product_show_master_image: data.product_show_master_image,
      product_show_images: data.product_show_images,
      produce_country: data.produce_country,
      warehouse_name: data.warehouse_name,
      deliver_goods_text: data.deliver_goods_text,
      colors: data.colors,
      sizes: data.sizes,
      items: data.items,
      views: data.views,
      print_areas: data.print_areas,
      categorys: (data as unknown as Record<string, unknown>).categorys as SyncData["categorys"],
      raw: data as unknown as Record<string, unknown>,
    }
  },
}
