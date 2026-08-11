/**
 * Shared pricing utilities for CNY → USD conversion with tiered markup.
 *
 * Formula: retail_usd = (cny_price / rate) × tiered_markup
 * Tiered markup: 20 CNY → 3x, 40 CNY → 2.3x, linear interpolation between.
 */

const DEFAULT_RATE = 6.77
const DEFAULT_MARKUP_MIN = 2.3
const DEFAULT_MARKUP_MAX = 3.0
const TIER_LOW_CNY = 20
const TIER_HIGH_CNY = 40

function getEnvFloat(key: string, fallback: number): number {
  const raw = process.env[key]
  if (!raw) return fallback
  const n = parseFloat(raw)
  return Number.isFinite(n) ? n : fallback
}

export function calculateTieredMarkup(cnyPrice: number): number {
  const rate = getEnvFloat("AI_WORKER_USD_CNY_RATE", DEFAULT_RATE)
  const markupMin = getEnvFloat("AI_WORKER_PRICE_MARKUP_MIN", DEFAULT_MARKUP_MIN)
  const markupMax = getEnvFloat("AI_WORKER_PRICE_MARKUP_MAX", DEFAULT_MARKUP_MAX)

  const usdBase = cnyPrice / rate
  const thresholdLow = TIER_LOW_CNY / rate
  const thresholdHigh = TIER_HIGH_CNY / rate

  if (usdBase <= thresholdLow) return markupMax
  if (usdBase >= thresholdHigh) return markupMin

  const t = (usdBase - thresholdLow) / (thresholdHigh - thresholdLow)
  return Math.round((markupMax - t * (markupMax - markupMin)) * 100) / 100
}

export function calculateRetailPriceUsd(cnyPrice: number): number {
  const rate = getEnvFloat("AI_WORKER_USD_CNY_RATE", DEFAULT_RATE)
  const markup = calculateTieredMarkup(cnyPrice)
  return Math.round((cnyPrice / rate) * markup * 100) / 100
}

export function convertCnyToUsd(cnyAmount: number): number {
  const rate = getEnvFloat("AI_WORKER_USD_CNY_RATE", DEFAULT_RATE)
  return Math.round((cnyAmount / rate) * 100) / 100
}

export function convertShippingCnyToUsdWithMargin(cnyAmount: number, marginPercent = 2): number {
  const rate = getEnvFloat("AI_WORKER_USD_CNY_RATE", DEFAULT_RATE)
  return Math.round((cnyAmount / rate) * (1 + marginPercent / 100) * 100) / 100
}
