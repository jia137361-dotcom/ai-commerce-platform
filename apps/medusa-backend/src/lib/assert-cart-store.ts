import type { MedusaRequest } from "@medusajs/framework/http"
import { DEFAULT_STORE_ID, resolveCurrentStore } from "./store-context"
import { CartStoreAccessError } from "./cart-store-error"

/** 从购物车 metadata 读取店铺；缺失时视为默认店（与创建购物车时的兜底一致）。 */
export function readCartStoreId(cart: { metadata?: Record<string, unknown> | null }): string {
  const raw = cart.metadata?.store_id
  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw.trim()
  }
  return DEFAULT_STORE_ID
}

/**
 * PDF：cart.store_id == current_store_id
 * 这里用 metadata.store_id 表示 cart 所属店，与 resolveCurrentStore(req) 对齐。
 */
export function assertCartBelongsToCurrentStore(
  req: MedusaRequest,
  cart: { metadata?: Record<string, unknown> | null }
): void {
  const currentStoreId = resolveCurrentStore(req).store_id
  const cartStoreId = readCartStoreId(cart)
  if (cartStoreId !== currentStoreId) {
    throw new CartStoreAccessError()
  }
}
