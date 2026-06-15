export type StoreId = string

export type Product = {
  product_id: string
  store_id: string
  title: string
  description?: string | null
  status: "draft" | "published" | "unpublished" | "archived"
  source?: "manual" | "ai"
  supplier_id?: string | null
  platform_product_id?: string | null
  basic_product_id?: string | null
  supplier_product_id?: string | null
  supplier_variant_id?: string | null
  supplier_material_id?: string | null
  supplier_size_id?: string | null
  supplier_color_id?: string | null
  view_id?: string | null
  design_type?: number | null
  medusa_product_id?: string | null
  medusa_variant_id?: string | null
  is_cart_addable: boolean
  image_url?: string | null
  design_image_url?: string | null
  mockup_image_url?: string | null
  print_file_url?: string | null
  tags?: string[]
  price?: number | null
  cost?: number | null
  category_ids?: string[]
  variants?: unknown[]
  metadata?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export type Category = {
  category_id: string
  store_id: string
  name: string
  slug: string
  description?: string | null
  sort_order?: number
}

export type CartLineItem = {
  id: string
  title?: string
  quantity: number
  variant_id?: string
  product_id?: string
  product_title?: string
  unit_price?: number
  metadata?: Record<string, unknown>
}

export type Cart = {
  cart_id: string
  id?: string
  store_id?: string
  items?: CartLineItem[]
  currency_code?: string
  total?: number
  subtotal?: number
}

export type OrderSummary = {
  id?: string
  order_id: string
  display_id?: number
  order_number?: number
  email?: string
  store_id?: string
  payment_status?: string | null
  fulfillment_status?: string | null
  created_at?: string
  order?: Record<string, unknown>
}

export type SupplierProduct = {
  supplier_product_id: string
  supplier_id: string
  platform_product_id?: string
  name: string
  category?: string
  base_cost?: number
  currency?: string
  variants?: SupplierVariant[]
  print_specs?: Array<Record<string, unknown>>
  design_templates?: Array<Record<string, unknown>>
}

export type SupplierVariant = {
  supplier_variant_id: string
  supplier_product_id: string
  color?: string
  size?: string
  sku?: string
}

export type PlatformProduct = {
  platform_product_id: string
  title: string
  category?: string
  description?: string
}
