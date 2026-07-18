/**
 * After checkout, promote Custom Design (buyer_design) drafts to published
 * so review/share and order-linked storefront detail work.
 */

import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { STORE_CORE_MODULE } from "../modules/store-core"
import type StoreCoreModuleService from "../modules/store-core/service"
import { readMcProductIdsFromOrder } from "./product-reviews"

function isBuyerDesignProduct(product: Record<string, unknown>) {
  const metadata =
    product.metadata && typeof product.metadata === "object"
      ? (product.metadata as Record<string, unknown>)
      : {}
  if (metadata.buyer_design === true || metadata.design_source === "buyer_sdk") {
    return true
  }
  const tags = Array.isArray(product.tags) ? product.tags : []
  return tags.some(
    (tag) => tag === "buyer-diy" || tag === "my-design" || tag === "custom-design"
  )
}

export async function publishBuyerDesignsFromOrder(
  container: MedusaContainer,
  input: { orderId: string; storeId: string }
): Promise<string[]> {
  const orderModule = container.resolve(Modules.ORDER)
  const storeCore = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const order = await orderModule.retrieveOrder(input.orderId, {
    relations: ["items"],
  })

  const productIds = readMcProductIdsFromOrder(order as unknown as Record<string, unknown>)
  if (!productIds.length) return []

  const publishedIds: string[] = []
  for (const productId of productIds) {
    const rows = await storeCore.listProducts(
      { id: productId, store_id: input.storeId },
      { take: 1 }
    )
    const product = Array.isArray(rows) ? rows[0] : null
    if (!product || !isBuyerDesignProduct(product as Record<string, unknown>)) {
      continue
    }
    if (product.status === "published" || product.status === "archived") {
      continue
    }

    await storeCore.updateProducts({
      selector: { id: productId, store_id: input.storeId },
      data: {
        status: "published",
        metadata: {
          ...((product.metadata as Record<string, unknown> | null) ?? {}),
          published_from_order_id: input.orderId,
          published_at: new Date().toISOString(),
        },
      },
    })
    publishedIds.push(productId)
  }

  if (publishedIds.length && process.env.NODE_ENV !== "production") {
    console.info("[checkout-complete] published buyer designs", {
      order_id: input.orderId,
      product_ids: publishedIds,
    })
  }

  return publishedIds
}
