import { apiFetch } from "./client"
import type { Category, PlatformProduct, Product } from "./types"

export const listProducts = (storeId: string) =>
  apiFetch<{ store_id: string; count: number; products: Product[] }>("/store/products", {
    storeId,
    publishable: true,
  })

export const getProduct = (storeId: string, productId: string) =>
  apiFetch<{ product: Product }>(`/store/products/${encodeURIComponent(productId)}`, {
    storeId,
    publishable: true,
  })

export const listCategories = (storeId: string) =>
  apiFetch<{ store_id: string; count: number; categories: Category[] }>("/store/product-categories", {
    storeId,
    publishable: true,
  })

export const listPlatformProducts = (storeId: string, token?: string) =>
  apiFetch<{ count: number; platform_products: PlatformProduct[] }>(
    token ? "/admin/platform-products" : "/store/platform-products",
    { storeId, publishable: !token, adminToken: token }
  )

export const createAiDraft = (
  storeId: string,
  token: string,
  body: {
    prompt: string
    platform_product_id?: string
    supplier_product_id?: string
    supplier_variant_id?: string
    print_position?: string
    medusa_product_id?: string
    medusa_variant_id?: string
  }
) =>
  apiFetch<{ product_id: string; product: Product; generation?: Record<string, unknown> }>(
    "/admin/ai/generate-and-draft",
    { method: "POST", storeId, adminToken: token, body }
  )

export const createDraftProduct = (storeId: string, token: string, body: Partial<Product> & { title: string; price: number }) =>
  apiFetch<{ product_id: string; product: Product }>("/admin/products/draft", {
    method: "POST",
    storeId,
    adminToken: token,
    body,
  })

export const publishProduct = (storeId: string, token: string, productId: string) =>
  apiFetch<{ product_id: string; product: Product }>(`/admin/products/${encodeURIComponent(productId)}/publish`, {
    method: "POST",
    storeId,
    adminToken: token,
    body: {},
  })
