/**
 * Supplier Adapter Interface
 *
 * Every supplier (S2BDIY, 1688, Printful, etc.) implements this interface.
 * The sync service and catalog API use adapters to stay supplier-agnostic.
 */

export type CatalogProduct = {
  id: number | string
  code: string
  name: string
  en_name?: string
  purchase_price: string
  view_image_src: string
  blank_design_image?: string
  categorys?: Array<{ id: number; name: string; en_name: string }>
}

export type CatalogResult = {
  data: CatalogProduct[]
  total: number
  page: number
  per_page: number
  last_page: number
}

export type ProductDetailView = {
  id: number
  name: string
  en_name?: string
  colors: Array<{ id: number; name: string; en_name: string; tone: string }>
  sizes: Array<{ id: number; name: string }>
  views: Array<{ id: number; name: string; en_name: string }>
  print_areas: Array<{ view_id: number; width: string; height: string }>
  items: Array<{ id: number; code: string; size_id: number; color_id: number; price: string; weight: number }>
  product_show_images: Array<{ color_id: number; color_name: string; images: Array<{ src: string }> }>
  categorys: Array<{ id: number; name: string; en_name: string }>
}

export type SyncData = {
  id: number | string
  code?: string
  name: string
  en_name?: string
  purchase_price: number | string
  product_show_master_image?: string
  produce_country?: string
  warehouse_name?: string
  deliver_goods_text?: string
  colors?: Array<{ id: number; name: string; en_name?: string; tone?: string }>
  sizes?: Array<{ id: number; name: string }>
  items?: Array<{ id: number; code: string; size_id: number; color_id: number; price: number | string; weight: number; length?: number; width?: number; height?: number }>
  views?: Array<{ id: number; name: string; en_name?: string; tip_level?: number }>
  print_areas?: Array<{ view_id: number; width: string | number; height: string | number }>
  categorys?: Array<{ id: number; name: string; en_name?: string }>
  raw?: Record<string, unknown>
}

export interface SupplierAdapter {
  supplierId: string

  /** Browse the supplier's product catalog */
  listProducts(params: {
    page: number
    perPage: number
    categoryId?: number
    keyword?: string
  }): Promise<CatalogResult>

  /** Get full detail of one product (colors, sizes, images, categories) */
  getProductDetail(productId: string | number): Promise<ProductDetailView>

  /** Fetch raw product data for syncing into mc_supplier_product */
  syncProduct(productId: string | number): Promise<SyncData>
}
