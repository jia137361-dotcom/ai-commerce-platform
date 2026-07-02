import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows"
import { isStripeConfigured } from "./stripe-client"

export const STRIPE_PROVIDER_ID = "pp_stripe_stripe"

export async function ensureStripePaymentProvidersOnRegions(container: MedusaContainer) {
  if (!isStripeConfigured()) {
    return { enabled: false as const, reason: "STRIPE_API_KEY is not configured" }
  }

  const paymentModule = container.resolve(Modules.PAYMENT) as {
    listPaymentProviders: (filters?: object) => Promise<Array<{ id: string }>>
  }
  const registeredProviders = await paymentModule.listPaymentProviders({})
  if (!registeredProviders.some((provider) => provider.id === STRIPE_PROVIDER_ID)) {
    return {
      enabled: false as const,
      reason: `${STRIPE_PROVIDER_ID} is not registered. Restart Medusa after setting STRIPE_API_KEY.`,
    }
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

  const updated: string[] = []
  for (const region of regions) {
    const existing = (region.payment_providers ?? [])
      .map((provider) => provider.id)
      .filter((id): id is string => Boolean(id))
    if (existing.includes(STRIPE_PROVIDER_ID)) continue

    const paymentProviders = Array.from(new Set([...existing, STRIPE_PROVIDER_ID]))
    await updateRegionsWorkflow(container).run({
      input: {
        selector: { id: region.id },
        update: { payment_providers: paymentProviders },
      },
    })
    updated.push(region.id)
  }

  return { enabled: true as const, updated }
}
