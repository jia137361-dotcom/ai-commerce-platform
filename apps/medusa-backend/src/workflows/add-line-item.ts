import type { MedusaContainer } from "@medusajs/framework/types"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { addToCartWorkflow } from "@medusajs/medusa/core-flows"
import { CartStoreMismatchError } from "../lib/cart-store-error"
import { ensureVariantHasPriceSet } from "../lib/ensure-variant-price-set"
import { buildLineItemProductionMetadata } from "../lib/line-item-production-metadata"
import { resolveLinkedProductForVariant } from "../lib/resolve-linked-product"
import { STORE_CORE_MODULE } from "../modules/store-core"
import type StoreCoreModuleService from "../modules/store-core/service"

export type AddLineItemWorkflowInput = {
  cart_id: string
  variant_id: string
  quantity?: number
}

function readStoreIdFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): string | undefined {
  const v = metadata?.store_id
  return typeof v === "string" && v.length > 0 ? v : undefined
}

function readProductStoreId(product: Record<string, unknown> | null | undefined): string | undefined {
  if (!product) return undefined
  const top = product.store_id
  if (typeof top === "string" && top.length > 0) return top
  const meta = product.metadata as Record<string, unknown> | null | undefined
  return readStoreIdFromMetadata(meta)
}

function readProductStatus(product: Record<string, unknown> | null | undefined): string | undefined {
  const status = product?.status
  return typeof status === "string" ? status : undefined
}

const addLineItemStep = createStep(
  "add-line-item-step",
  async (input: AddLineItemWorkflowInput, { container }: { container: MedusaContainer }) => {
    const cartModule = container.resolve(Modules.CART)
    const productModule = container.resolve(Modules.PRODUCT)
    const storeCoreService = container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService

    const cart = await cartModule.retrieveCart(input.cart_id)
    const cartStoreId = readStoreIdFromMetadata(cart.metadata)

    const variant = await productModule.retrieveProductVariant(input.variant_id, {
      relations: ["product"],
    })

    const product = variant?.product as Record<string, unknown> | undefined
    const productStoreId = readProductStoreId(product)
    const variantStoreId = readStoreIdFromMetadata(
      variant?.metadata as Record<string, unknown> | null | undefined
    )

    if (
      (productStoreId && cartStoreId && productStoreId !== cartStoreId) ||
      (variantStoreId && cartStoreId && variantStoreId !== cartStoreId)
    ) {
      throw new CartStoreMismatchError()
    }

    const linkedProducts = await storeCoreService.listProducts({
      medusa_variant_id: input.variant_id,
    })
    const linkedProduct = resolveLinkedProductForVariant(
      linkedProducts as Record<string, unknown>[],
      { storeId: cartStoreId }
    )

    if (!linkedProduct) {
      throw new Error("variant_id must be linked to a store-core product")
    }

    if (cartStoreId && linkedProduct.store_id !== cartStoreId) {
      throw new CartStoreMismatchError()
    }

    if (readProductStatus(linkedProduct) !== "published") {
      throw new Error("Product must be published")
    }

    const linkedPrice =
      typeof linkedProduct.price === "number" && linkedProduct.price > 0
        ? linkedProduct.price
        : 19.99
    await ensureVariantHasPriceSet(container, {
      variantId: input.variant_id,
      amount: Math.round(linkedPrice * 100),
      currencyCode: cart.currency_code || "usd",
    })

    const productionMetadata = await buildLineItemProductionMetadata(
      storeCoreService,
      linkedProduct
    )

    await addToCartWorkflow(container).run({
      input: {
        cart_id: input.cart_id,
        items: [
          {
            variant_id: input.variant_id,
            quantity: input.quantity ?? 1,
            metadata: productionMetadata as unknown as Record<string, unknown>,
          },
        ],
      },
    })

    const cartAfter = await cartModule.retrieveCart(input.cart_id, {
      relations: ["items"],
    })

    const items = cartAfter.items ?? []
    const matching = items.filter((i) => i.variant_id === input.variant_id)
    const lineItem = matching[matching.length - 1]

    if (lineItem?.id) {
      await cartModule.updateLineItems(
        { id: lineItem.id },
        { metadata: productionMetadata as unknown as Record<string, unknown> }
      )
    }

    const cartFinal = await cartModule.retrieveCart(input.cart_id, {
      relations: ["items"],
    })
    const finalItems = cartFinal.items ?? []
    const finalMatching = finalItems.filter((i) => i.variant_id === input.variant_id)
    const finalLineItem = finalMatching[finalMatching.length - 1]

    return new StepResponse({ lineItem: finalLineItem ?? lineItem, cart: cartFinal })
  }
)

const addLineItemWorkflow = createWorkflow(
  "add-line-item-workflow",
  function (input: AddLineItemWorkflowInput) {
    const { lineItem, cart } = addLineItemStep(input)
    return new WorkflowResponse({ lineItem, cart })
  }
)

export default addLineItemWorkflow
