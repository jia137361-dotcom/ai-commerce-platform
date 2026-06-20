import type { MedusaContainer } from "@medusajs/framework/types"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { ensureDefaultSalesChannelStockLocation } from "../lib/ensure-native-bridge-cartable"
import { resolveDefaultRegionId } from "../lib/resolve-default-region"
import { resolveDefaultSalesChannelId } from "../lib/resolve-default-sales-channel"

export type CreateCartWorkflowInput = {
  store_id: string
  customer_email?: string
  currency_code?: string
  region_id?: string
}

const createCartStep = createStep(
  "create-cart-step",
  async (input: CreateCartWorkflowInput, { container }: { container: MedusaContainer }) => {
    await ensureDefaultSalesChannelStockLocation(container)
    const cartModule = container.resolve(Modules.CART)
    const currencyCode = input.currency_code || "usd"
    const regionId =
      input.region_id ?? (await resolveDefaultRegionId(container, currencyCode))
    const salesChannelId = await resolveDefaultSalesChannelId(container)

    const cart = await cartModule.createCarts({
      currency_code: currencyCode,
      region_id: regionId,
      sales_channel_id: salesChannelId,
      email: input.customer_email,
      metadata: {
        store_id: input.store_id,
      },
    })

    return new StepResponse({ cart })
  }
)

const createCartWorkflow = createWorkflow(
  "create-cart-workflow",
  function (input: CreateCartWorkflowInput) {
    const { cart } = createCartStep(input)
    return new WorkflowResponse({ cart })
  }
)

export default createCartWorkflow
