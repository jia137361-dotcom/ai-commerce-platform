import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows"

export const PAYPAL_PROVIDER_ID = "pp_paypal_paypal"

export async function ensurePayPalPaymentProvidersOnRegions(container: MedusaContainer) {
  if (
    !process.env.PAYPAL_CLIENT_ID ||
    !process.env.PAYPAL_CLIENT_SECRET ||
    process.env.PAYPAL_ENVIRONMENT !== "sandbox"
  ) {
    return { enabled: false as const, reason: "PayPal Sandbox credentials are not configured" }
  }
  const paymentModule = container.resolve(Modules.PAYMENT) as {
    listPaymentProviders: (filters?: object) => Promise<Array<{ id: string }>>
  }
  const providers = await paymentModule.listPaymentProviders({})
  if (!providers.some((provider) => provider.id === PAYPAL_PROVIDER_ID)) {
    return {
      enabled: false as const,
      reason: `${PAYPAL_PROVIDER_ID} is not registered. Restart Medusa after configuring PayPal Sandbox.`,
    }
  }
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: regions } = (await query.graph({
    entity: "region",
    fields: ["id", "payment_providers.id"],
  })) as { data: Array<{ id: string; payment_providers?: Array<{ id?: string }> }> }
  const updated: string[] = []
  for (const region of regions) {
    const existing = (region.payment_providers ?? [])
      .map((provider) => provider.id)
      .filter((id): id is string => Boolean(id))
    if (existing.includes(PAYPAL_PROVIDER_ID)) continue
    await updateRegionsWorkflow(container).run({
      input: {
        selector: { id: region.id },
        update: { payment_providers: [...new Set([...existing, PAYPAL_PROVIDER_ID])] },
      },
    })
    updated.push(region.id)
  }
  return { enabled: true as const, updated }
}
