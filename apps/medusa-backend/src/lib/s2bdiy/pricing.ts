export type S2bdiyPricingInput = {
  costCny: number
  shippingCny?: number | null
  multiplier?: number | null
  exchangeRate?: number | null
}

export type S2bdiyPricingResult = {
  costUsd: number
  shippingUsd: number
  recommendedPriceUsd: number
  multiplier: number
  exchangeRate: number
}

const DEFAULT_EXCHANGE_RATE = 6.77
const SHIPPING_BUFFER_RATE = 1.02

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function getDefaultS2bdiyMarkupMultiplier(costCny: number): number {
  if (costCny >= 40) return 3
  if (costCny <= 20) return 2.3
  const t = (costCny - 20) / 20
  return roundMoney(2.3 + t * 0.7)
}

export function calculateS2bdiyRecommendedUsdPrice(
  input: S2bdiyPricingInput
): S2bdiyPricingResult {
  const costCny = Number(input.costCny)
  if (!Number.isFinite(costCny) || costCny < 0) {
    throw new Error("costCny must be a non-negative number")
  }

  const shippingCny = Number(input.shippingCny ?? 0)
  if (!Number.isFinite(shippingCny) || shippingCny < 0) {
    throw new Error("shippingCny must be a non-negative number")
  }

  const exchangeRate =
    input.exchangeRate && Number.isFinite(Number(input.exchangeRate)) && Number(input.exchangeRate) > 0
      ? Number(input.exchangeRate)
      : Number(process.env.S2BDIY_CNY_USD_EXCHANGE_RATE ?? DEFAULT_EXCHANGE_RATE)

  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
    throw new Error("exchangeRate must be a positive number")
  }

  const multiplier =
    input.multiplier && Number.isFinite(Number(input.multiplier)) && Number(input.multiplier) > 0
      ? Number(input.multiplier)
      : Number(process.env.S2BDIY_PRICE_MULTIPLIER ?? getDefaultS2bdiyMarkupMultiplier(costCny))

  if (!Number.isFinite(multiplier) || multiplier <= 0) {
    throw new Error("multiplier must be a positive number")
  }

  const costUsd = costCny / exchangeRate
  const shippingUsd = (shippingCny / exchangeRate) * SHIPPING_BUFFER_RATE

  return {
    costUsd: roundMoney(costUsd),
    shippingUsd: roundMoney(shippingUsd),
    recommendedPriceUsd: roundMoney(costUsd * multiplier + shippingUsd),
    multiplier,
    exchangeRate,
  }
}
