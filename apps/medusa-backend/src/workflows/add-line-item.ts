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

const addLineItemStep = createStep(
  "add-line-item-step",
  async (input: AddLineItemWorkflowInput, { container }: { container: MedusaContainer }) => {
    const cartModule = container.resolve(Modules.CART)
    const productModule = container.resolve(Modules.PRODUCT)

    const cart = await cartModule.retrieveCart(input.cart_id)
    const cartStoreId = readStoreIdFromMetadata(cart.metadata)

    const variant = await productModule.retrieveProductVariant(input.variant_id, {
      relations: ["product"],
    })

    const product = variant?.product as Record<string, unknown> | undefined
    const productStoreId = readProductStoreId(product)

    if (productStoreId && cartStoreId && productStoreId !== cartStoreId) {
      throw new CartStoreMismatchError()
    }

    await addToCartWorkflow(container).run({
      input: {
        cart_id: input.cart_id,
        items: [
          {
            variant_id: input.variant_id,
            quantity: input.quantity ?? 1,
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

    return new StepResponse({ lineItem, cart: cartAfter })
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
