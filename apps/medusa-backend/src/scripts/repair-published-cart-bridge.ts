import type { ExecArgs } from "@medusajs/framework/types"
import { ensureDefaultSalesChannelStockLocation, ensureNativeBridgeCartable } from "../lib/ensure-native-bridge-cartable"
import { resolveNativeBridgeForPublish } from "../lib/native-product-bridge"
import { readString } from "../lib/product-cart-bridge"
import {
  ensureNativeProductShippingProfile,
  mergeRequiresShippingIntoMetadata,
  resolveProductRequiresShipping,
} from "../lib/product-shipping"
import { DEFAULT_STORE_ID } from "../lib/store-context"
import { STORE_CORE_MODULE } from "../modules/store-core"
import type StoreCoreModuleService from "../modules/store-core/service"

export default async function repairPublishedCartBridge({ container }: ExecArgs) {
  const storeId = process.env.DEFAULT_STORE_ID ?? DEFAULT_STORE_ID
  const storeCore = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService

  const stockLocation = await ensureDefaultSalesChannelStockLocation(container)
  const products = await storeCore.listProducts({ store_id: storeId })
  const broken = products.filter(
    (product) => product.status === "published" && !readString(product.medusa_variant_id)
  )

  const repaired: Array<{ product_id: string; medusa_variant_id: string }> = []
  const shippingSynced: Array<{ product_id: string; requires_shipping: boolean }> = []

  for (const product of broken) {
    const productId = readString(product.id)
    if (!productId) continue

    const bridge = await resolveNativeBridgeForPublish(
      container,
      product as Record<string, unknown>,
      storeId
    )
    await ensureNativeBridgeCartable(container, bridge)
    await storeCore.updateProducts({
      selector: { id: productId, store_id: storeId },
      data: {
        medusa_product_id: bridge.medusaProductId,
        medusa_variant_id: bridge.medusaVariantId,
      },
    })
    repaired.push({ product_id: productId, medusa_variant_id: bridge.medusaVariantId })
  }

  for (const product of products) {
    const productId = readString(product.id)
    const medusaProductId = readString(product.medusa_product_id)
    if (!productId || product.status !== "published") continue

    const requiresShipping = resolveProductRequiresShipping(product as Record<string, unknown>)
    await storeCore.updateProducts({
      selector: { id: productId, store_id: storeId },
      data: {
        metadata: mergeRequiresShippingIntoMetadata(
          (product.metadata as Record<string, unknown> | null) ?? {},
          requiresShipping
        ),
      },
    })

    if (medusaProductId && requiresShipping) {
      await ensureNativeProductShippingProfile(container, medusaProductId)
    }

    shippingSynced.push({ product_id: productId, requires_shipping: requiresShipping })
  }

  console.log(
    JSON.stringify(
      {
        store_id: storeId,
        stock_location: stockLocation,
        repaired_count: repaired.length,
        repaired,
        shipping_synced_count: shippingSynced.length,
        shipping_synced: shippingSynced,
      },
      null,
      2
    )
  )
}
