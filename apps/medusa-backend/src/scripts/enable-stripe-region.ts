import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows"

const STRIPE_PROVIDER_ID = "pp_stripe_stripe"

export default async function enableStripeRegion({ container }: ExecArgs) {
  if (!process.env.STRIPE_API_KEY?.startsWith("sk_test_")) {
    throw new Error("STRIPE_API_KEY must be a Stripe test-mode secret key before enabling the region provider")
  }

  const paymentModule = container.resolve(Modules.PAYMENT) as {
    listPaymentProviders: (filters?: object) => Promise<Array<{ id: string }>>
  }
  const registeredProviders = await paymentModule.listPaymentProviders({})
  if (!registeredProviders.some((provider) => provider.id === STRIPE_PROVIDER_ID)) {
    throw new Error(`${STRIPE_PROVIDER_ID} is not registered. Check medusa-config.ts and restart Medusa.`)
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: regions } = (await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "payment_providers.id"],
  })) as {
    data: Array<{
      id: string
      name?: string
      currency_code?: string
      payment_providers?: Array<{ id?: string }>
    }>
  }

  if (!regions.length) {
    throw new Error("No region exists. Run the normal bootstrap/seed path before Stripe region setup.")
  }

  for (const region of regions) {
    const existing = (region.payment_providers ?? [])
      .map((provider) => provider.id)
      .filter((id): id is string => Boolean(id))
    const paymentProviders = Array.from(new Set([...existing, STRIPE_PROVIDER_ID]))
    await updateRegionsWorkflow(container).run({
      input: {
        selector: { id: region.id },
        update: { payment_providers: paymentProviders },
      },
    })
    console.log(`STRIPE_REGION_ENABLED=${region.id}:${region.currency_code ?? "unknown"}:${paymentProviders.join(",")}`)
  }
}
