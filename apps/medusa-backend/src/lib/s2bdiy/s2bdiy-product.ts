import type { S2bdiyClient } from "./s2bdiy-client"
import { unwrapList } from "./s2bdiy-client"

export type BasicProductDetail = Record<string, unknown>

export async function listBasicProducts(
  client: S2bdiyClient,
  query?: { page?: number; per_page?: number }
): Promise<BasicProductDetail[]> {
  const data = await client.request<unknown>("/open/v1/basicProduct", {
    method: "GET",
    query: {
      page: query?.page ?? 1,
      per_page: query?.per_page ?? 20,
    },
  })
  if (data && typeof data === "object" && Array.isArray((data as Record<string, unknown>).data)) {
    return (data as Record<string, unknown>).data as BasicProductDetail[]
  }
  return unwrapList<BasicProductDetail>(data)
}

export async function getBasicProductDetail(
  client: S2bdiyClient,
  basicProductId: number | string
): Promise<BasicProductDetail> {
  return client.request<BasicProductDetail>(`/open/v1/basicProduct/${basicProductId}`, {
    method: "GET",
  })
}

export type QuickCreateInput = {
  size_id: number
  color_id: number
  basic_product_id: number
  name: string
  material_id: number | string
  view_id: number
  design_type?: number
}

export type QuickCreateResult = {
  product_id: number | string
  product_name?: string
  product_code?: string
}

export async function quickCreateProduct(
  client: S2bdiyClient,
  input: QuickCreateInput
): Promise<QuickCreateResult> {
  const designType = input.design_type ?? 1
  const body = {
    size_id: input.size_id,
    color_id: input.color_id,
    product_design: {
      basic_product_id: input.basic_product_id,
      name: input.name,
      views: [
        {
          view_id: input.view_id,
          objects: [
            {
              type: "image",
              material_id: Number(input.material_id),
              design_type: designType,
            },
          ],
        },
      ],
    },
  }

  const data = await client.request<QuickCreateResult>("/open/v1/product/quickCreate", {
    method: "POST",
    body,
  })

  const productId =
    data.product_id ?? (data as Record<string, unknown>).id ?? (data as Record<string, unknown>).product_id
  if (productId === undefined || productId === null) {
    throw new Error(`quickCreate missing product_id: ${JSON.stringify(data)}`)
  }
  return {
    product_id: productId,
    product_name: data.product_name,
    product_code: data.product_code,
  }
}

export async function getProductDetail(
  client: S2bdiyClient,
  productId: number | string
): Promise<Record<string, unknown>> {
  return client.request<Record<string, unknown>>(`/open/v1/product/${productId}`, { method: "GET" })
}

export function extractMockupImageUrl(productDetail: Record<string, unknown>): string | null {
  const variants = productDetail.variants
  if (Array.isArray(variants)) {
    for (const variant of variants) {
      if (!variant || typeof variant !== "object") continue
      const showImages = (variant as Record<string, unknown>).show_images
      if (typeof showImages === "string" && showImages.length > 0) {
        return showImages
      }
      if (Array.isArray(showImages) && showImages.length > 0) {
        const first = showImages[0]
        if (typeof first === "string") return first
        if (first && typeof first === "object" && typeof (first as Record<string, unknown>).src === "string") {
          return (first as Record<string, unknown>).src as string
        }
      }
    }
  }

  const showImages = productDetail.show_images
  if (Array.isArray(showImages) && showImages.length > 0) {
    const block = showImages[0]
    if (block && typeof block === "object") {
      const images = (block as Record<string, unknown>).images
      if (Array.isArray(images) && images.length > 0) {
        const img = images[0]
        if (img && typeof img === "object" && typeof (img as Record<string, unknown>).src === "string") {
          return (img as Record<string, unknown>).src as string
        }
      }
    }
  }
  return null
}
