import { apiFetch } from "./client"
import type { SupplierProduct } from "./types"

export const listSupplierProducts = (storeId: string, token?: string) =>
  apiFetch<{ count: number; supplier_products: SupplierProduct[] }>(
    token ? "/admin/supplier-products" : "/store/supplier-products",
    { storeId, publishable: !token, adminToken: token }
  )

export const syncS2bBasicProduct = (storeId: string, token: string, basicProductId: number, supplierId = "sup_s2bdiy") =>
  apiFetch<Record<string, unknown>>("/admin/supplier-products/sync-basic-product", {
    method: "POST",
    storeId,
    adminToken: token,
    body: { basic_product_id: basicProductId, supplier_id: supplierId },
  })
