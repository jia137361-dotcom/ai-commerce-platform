import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { STORE_CORE_MODULE } from "../modules/store-core"
import type StoreCoreModuleService from "../modules/store-core/service"
import { resolveProductRequiresShipping } from "./product-shipping"

type CartLineItem = {
  id?: string
  requires_shipping?: boolean | null
  metadata?: Record<string, unknown> | null
  variant_id?: string | null
}

const readMcProductId = (item: CartLineItem) => {
  const meta = item.metadata ?? {}
  const fromMeta = meta.mc_product_id
  return typeof fromMeta === "string" && fromMeta.length ? fromMeta : null
}

export async function syncCartLineItemShippingRequirements(
  container: MedusaContainer,
  cartId: string,
  items: CartLineItem[] | null | undefined
) {
  if (!items?.length) {
    return false
  }

  const storeCoreService = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService
  const cartModule = container.resolve(Modules.CART) as {
    updateLineItems: (
      selector: { id: string },
      data: { requires_shipping: boolean }
    ) => Promise<unknown>
  }

  let changed = false

  for (const item of items) {
    if (!item.id) continue

    let mcProduct: Record<string, unknown> | null = null
    const mcProductId = readMcProductId(item)
    if (mcProductId) {
      const rows = await storeCoreService.listProducts({ id: mcProductId })
      mcProduct = (rows[0] as Record<string, unknown> | undefined) ?? null
    }

    if (!mcProduct && item.variant_id) {
      const rows = await storeCoreService.listProducts({
        medusa_variant_id: item.variant_id,
      })
      mcProduct = (rows[0] as Record<string, unknown> | undefined) ?? null
    }

    if (!mcProduct) continue

    const expected = resolveProductRequiresShipping(mcProduct)
    if (item.requires_shipping === expected) continue

    await cartModule.updateLineItems({ id: item.id }, { requires_shipping: expected })
    item.requires_shipping = expected
    changed = true
  }

  if (changed && process.env.NODE_ENV !== "production") {
    console.info("[cart-shipping-sync] updated line item flags", { cart_id: cartId })
  }

  return changed
}
