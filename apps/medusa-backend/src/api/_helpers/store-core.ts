import type { MedusaRequest } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import type StoreCoreModuleService from "../../modules/store-core/service"
import { STORE_CORE_MODULE } from "../../modules/store-core"

/**
 * 自定义 store-core 模块服务（店铺 / 域名等）。
 */
export function getStoreCoreService(req: MedusaRequest): StoreCoreModuleService {
  return req.scope.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
}

function getProductModuleService(req: MedusaRequest) {
  return req.scope.resolve(Modules.PRODUCT) as unknown as {
    listProductCategories: (
      filters?: Record<string, unknown>,
      config?: { order?: Record<string, string> }
    ) => Promise<Array<{ metadata?: unknown } & Record<string, unknown>>>
  }
}

/**
 * 按店铺过滤分类：无 `metadata.store_id` 视为全店共享；否则须与当前店一致。
 */
export async function listProductCategoriesForStore(
  req: MedusaRequest,
  storeId: string
): Promise<Record<string, unknown>[]> {
  const product = getProductModuleService(req)
  const categories = await product.listProductCategories(
    {},
    { order: { rank: "ASC" } }
  )

  return categories.filter((c) => {
    const meta = c.metadata as Record<string, unknown> | null | undefined
    const sid = meta?.store_id
    if (typeof sid !== "string" || sid.length === 0) {
      return true
    }
    return sid === storeId
  })
}

export function normalizeCategory(category: Record<string, unknown>) {
  return {
    id: category.id,
    name: category.name,
    handle: category.handle,
    description: category.description ?? null,
    is_active: category.is_active,
    is_internal: category.is_internal,
    rank: category.rank,
    parent_category_id: category.parent_category_id ?? null,
    metadata: category.metadata ?? null,
  }
}
