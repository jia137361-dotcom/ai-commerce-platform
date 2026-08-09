import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export type EnsureVariantPriceSetInput = {
  variantId: string
  amount: number
  currencyCode: string
}

/** Medusa cart 加购要求 variant 已链接 price_set（仅 createProducts 的 prices 字段不足以保证落库）。 */
export async function ensureVariantHasPriceSet(
  container: MedusaContainer,
  input: EnsureVariantPriceSetInput
): Promise<string> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = (await query.graph({
    entity: "variant",
    fields: ["id", "price_set.id"],
    filters: { id: [input.variantId] },
  })) as { data: Array<{ id: string; price_set?: { id?: string } | null }> }

  const existingPriceSetId = data[0]?.price_set?.id
  if (existingPriceSetId) {
    const pricingModule = container.resolve(Modules.PRICING) as {
      updatePriceSets?: (
        data: Array<{ id: string; prices: Array<{ amount: number; currency_code: string }> }>
      ) => Promise<unknown>
    }
    if (typeof pricingModule.updatePriceSets === "function") {
      await pricingModule.updatePriceSets([
        {
          id: existingPriceSetId,
          prices: [{ amount: input.amount, currency_code: input.currencyCode }],
        },
      ])
    }
    return existingPriceSetId
  }

  const pricingModule = container.resolve(Modules.PRICING) as {
    createPriceSets: (
      data: Array<{ prices: Array<{ amount: number; currency_code: string }> }>
    ) => Promise<Array<{ id: string }>>
  }
  const remoteLink = container.resolve(ContainerRegistrationKeys.LINK)

  const [priceSet] = await pricingModule.createPriceSets([
    {
      prices: [
        {
          amount: input.amount,
          currency_code: input.currencyCode,
        },
      ],
    },
  ])

  if (!priceSet?.id) {
    throw new Error(`Failed to create price set for variant ${input.variantId}`)
  }

  await remoteLink.create([
    {
      [Modules.PRODUCT]: { variant_id: input.variantId },
      [Modules.PRICING]: { price_set_id: priceSet.id },
    },
  ])

  return priceSet.id
}
