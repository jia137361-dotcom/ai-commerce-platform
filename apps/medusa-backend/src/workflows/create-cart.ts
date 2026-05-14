import type { MedusaContainer } from "@medusajs/framework/types"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

export type CreateCartWorkflowInput = {
  store_id: string
  customer_email?: string
  currency_code?: string
  region_id?: string
}

const createCartStep = createStep(
  "create-cart-step",
  async (input: CreateCartWorkflowInput, { container }: { container: MedusaContainer }) => {
    const cartModule = container.resolve(Modules.CART)

    const cart = await cartModule.createCarts({
      currency_code: input.currency_code || "usd",
      region_id: input.region_id,
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
