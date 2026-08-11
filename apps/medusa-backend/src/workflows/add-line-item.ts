import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { addToCartWorkflow } from "@medusajs/medusa/core-flows"
import { CartStoreMismatchError } from "../lib/cart-store-error"
import { ensureDefaultSalesChannelStockLocation } from "../lib/ensure-native-bridge-cartable"
import { ensureVariantHasPriceSet } from "../lib/ensure-variant-price-set"
import { buildLineItemProductionMetadata } from "../lib/line-item-production-metadata"
import { findStoreCoreVariantRow } from "../lib/native-product-variants"
import { resolveProductRequiresShipping } from "../lib/product-shipping"
import { isProductAvailableInRegion } from "../lib/product-regions"
import { resolveLinkedProductForVariant } from "../lib/resolve-linked-product"
import { isProductCartEligible } from "../lib/product-cart-eligible"
import { STORE_CORE_MODULE } from "../modules/store-core"
import type StoreCoreModuleService from "../modules/store-core/service"

export type AddLineItemWorkflowInput = {
  cart_id: string
  variant_id: string
  quantity?: number
  unit_price?: number
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

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  if (value && typeof value === "object") {
    const objectValue = value as { value?: unknown; numeric?: unknown }
    return readNumber(objectValue.value ?? objectValue.numeric)
  }
  return null
}

async function calculateVariantUnitPrice(
  container: any,
  input: {
    priceSetId: string
    cart: Record<string, unknown>
    quantity: number
  }
) {
  const pricingModule = container.resolve(Modules.PRICING) as unknown as {
    calculatePrices: (
      filters: Record<string, unknown>,
      context?: Record<string, unknown>
    ) => Promise<Array<Record<string, unknown>>>
  }

  const pricingContext = {
    currency_code:
      typeof input.cart.currency_code === "string" ? input.cart.currency_code : "usd",
    region_id:
      typeof input.cart.region_id === "string" ? input.cart.region_id : undefined,
    sales_channel_id:
      typeof input.cart.sales_channel_id === "string"
        ? input.cart.sales_channel_id
        : undefined,
    customer_id:
      typeof input.cart.customer_id === "string" ? input.cart.customer_id : undefined,
    quantity: input.quantity,
  }

  const calculatedPrices = await pricingModule.calculatePrices(
    { id: [input.priceSetId] },
    { context: pricingContext }
  )
  const calculatedPrice = calculatedPrices.find(
    (price) =>
      price.id === input.priceSetId ||
      price.price_set_id === input.priceSetId
  )
  const calculatedAmount = readNumber(
    calculatedPrice?.calculated_amount ?? calculatedPrice?.amount
  )

  if (process.env.NODE_ENV !== "production") {
    console.info("[add-line-item] pricing context", {
      cart_id: input.cart.id,
      region_id: pricingContext.region_id,
      sales_channel_id: pricingContext.sales_channel_id,
      currency_code: pricingContext.currency_code,
      customer_id: pricingContext.customer_id,
      quantity: pricingContext.quantity,
      price_set_id: input.priceSetId,
      calculated_amount: calculatedAmount,
    })
  }

  if (calculatedAmount === null) {
    throw new Error(
      `Unable to calculate unit price for price set ${input.priceSetId}`
    )
  }

  return calculatedAmount
}

const addLineItemStep = createStep(
  "add-line-item-step",
  async (input: AddLineItemWorkflowInput, { container }: { container: any }) => {
    await ensureDefaultSalesChannelStockLocation(container)
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
    let linkedProduct = resolveLinkedProductForVariant(
      linkedProducts as Record<string, unknown>[],
      { storeId: cartStoreId }
    )
    if (!linkedProduct) {
      const metadata = variant?.metadata as Record<string, unknown> | null | undefined
      const linkedId = typeof metadata?.mc_product_id === "string" ? metadata.mc_product_id : null
      if (linkedId) {
        const rows = await storeCoreService.listProducts({ id: linkedId })
        linkedProduct = rows[0] as unknown as Record<string, unknown> | undefined
      }
    }

    if (!linkedProduct) {
      throw new Error("variant_id must be linked to a store-core product")
    }

    if (cartStoreId && linkedProduct.store_id !== cartStoreId) {
      throw new CartStoreMismatchError()
    }

    if (!isProductCartEligible(linkedProduct as Record<string, unknown>)) {
      throw new Error("Product is not available for purchase")
    }

    const cartRegionId =
      typeof cart.region_id === "string" && cart.region_id.length > 0 ? cart.region_id : null
    if (!isProductAvailableInRegion(linkedProduct as Record<string, unknown>, cartRegionId)) {
      throw new Error("Product is not available in the cart region")
    }

    const selectedVariantRow = findStoreCoreVariantRow(linkedProduct, input.variant_id)
    const linkedPrice = selectedVariantRow?.price && selectedVariantRow.price > 0
      ? selectedVariantRow.price
      : typeof linkedProduct.price === "number" && linkedProduct.price > 0
        ? linkedProduct.price
        : 19.99
    const priceSetId = await ensureVariantHasPriceSet(container, {
      variantId: input.variant_id,
      amount: Math.round(linkedPrice * 100),
      currencyCode: cart.currency_code || "usd",
    })

    const quantity = input.quantity ?? 1
    const calculatedUnitPrice =
      typeof input.unit_price === "number" && Number.isFinite(input.unit_price)
        ? input.unit_price
        : await calculateVariantUnitPrice(container, {
            priceSetId,
            cart: cart as unknown as Record<string, unknown>,
            quantity,
          })

    const productionMetadata = await buildLineItemProductionMetadata(
      storeCoreService,
      linkedProduct,
      input.variant_id
    )
    const requiresShipping = resolveProductRequiresShipping(
      linkedProduct as Record<string, unknown>
    )

    if (process.env.NODE_ENV !== "production") {
      console.info("[add-line-item] add-to-cart payload", {
        cart_id: input.cart_id,
        variant_id: input.variant_id,
        quantity,
        region_id: cart.region_id,
        sales_channel_id: cart.sales_channel_id,
        currency_code: cart.currency_code,
        unit_price: calculatedUnitPrice,
        price_set_id: priceSetId,
        requires_shipping: requiresShipping,
      })
    }

    await addToCartWorkflow(container).run({
      input: {
        cart_id: input.cart_id,
        items: [
          {
            variant_id: input.variant_id,
            quantity,
            unit_price: calculatedUnitPrice,
            requires_shipping: requiresShipping,
            metadata: productionMetadata as unknown as Record<string, unknown>,
          },
        ],
      },
    })

    const cartAfter = await cartModule.retrieveCart(input.cart_id, {
      relations: ["items"],
    })

    const items = cartAfter.items ?? []
    const matching = items.filter((i: any) => i.variant_id === input.variant_id)
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
    const finalMatching = finalItems.filter((i: any) => i.variant_id === input.variant_id)
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
