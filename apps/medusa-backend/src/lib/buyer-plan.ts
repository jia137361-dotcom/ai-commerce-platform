import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export type BuyerPlanId = "free" | "ai_creative"
export type BuyerPlanStatus = "active" | "past_due" | "canceled"

export type BuyerPlanCatalogEntry = {
  id: BuyerPlanId
  name: string
  priceLabel: string
  monthlyPriceUsd: number
  aiCreditsMonthly: number
  productLimit: number
  storageLimitBytes: number
  discountPercent: number
  description: string
}

export type BuyerPlanSnapshot = {
  planId: BuyerPlanId
  planName: string
  planStatus: BuyerPlanStatus
  priceLabel: string
  aiCreditsRemaining: number
  aiCreditsMonthly: number
  productLimit: number
  storageLimitBytes: number
  storageUsedBytes: number
  discountPercent: number
  planRenewsAt: string | null
  stripeSubscriptionId: string | null
  canUseAi: boolean
}

const GB = 1024 * 1024 * 1024

export const BUYER_PLAN_CATALOG: Record<BuyerPlanId, BuyerPlanCatalogEntry> = {
  free: {
    id: "free",
    name: "Free",
    priceLabel: "$0/month",
    monthlyPriceUsd: 0,
    aiCreditsMonthly: 5,
    productLimit: 25,
    storageLimitBytes: 2 * GB,
    discountPercent: 0,
    description: "Start your business with AI tools",
  },
  ai_creative: {
    id: "ai_creative",
    name: "AI Creative",
    priceLabel: "From $9/month",
    monthlyPriceUsd: 9,
    aiCreditsMonthly: 60,
    productLimit: 300,
    storageLimitBytes: 10 * GB,
    discountPercent: 25,
    description: "Create and design extensively with AI tools",
  },
}

const asPlanId = (value: unknown): BuyerPlanId =>
  value === "ai_creative" ? "ai_creative" : "free"

const asStatus = (value: unknown): BuyerPlanStatus => {
  if (value === "past_due" || value === "canceled") return value
  return "active"
}

const asNonNegInt = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return Math.floor(value)
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Math.max(0, Math.floor(Number(value)))
  }
  return fallback
}

export class BuyerPlanError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status = 400) {
    super(message)
    this.code = code
    this.status = status
  }
}

/** Pure read: missing metadata => Free defaults. */
export function readBuyerPlanFromMetadata(
  metadata?: Record<string, unknown> | null
): BuyerPlanSnapshot {
  const meta = metadata ?? {}
  const planId = asPlanId(meta.plan_id)
  const catalog = BUYER_PLAN_CATALOG[planId]
  const monthly = asNonNegInt(meta.ai_credits_monthly, catalog.aiCreditsMonthly)
  const remaining =
    meta.ai_credits_remaining === undefined || meta.ai_credits_remaining === null
      ? monthly
      : asNonNegInt(meta.ai_credits_remaining, monthly)
  const status = asStatus(meta.plan_status)

  return {
    planId,
    planName: catalog.name,
    planStatus: status,
    priceLabel: catalog.priceLabel,
    aiCreditsRemaining: remaining,
    aiCreditsMonthly: monthly,
    productLimit: asNonNegInt(meta.product_limit, catalog.productLimit),
    storageLimitBytes: asNonNegInt(meta.storage_limit_bytes, catalog.storageLimitBytes),
    storageUsedBytes: asNonNegInt(meta.storage_used_bytes, 0),
    discountPercent: asNonNegInt(meta.plan_discount_percent, catalog.discountPercent),
    planRenewsAt: typeof meta.plan_renews_at === "string" ? meta.plan_renews_at : null,
    stripeSubscriptionId:
      typeof meta.stripe_subscription_id === "string" ? meta.stripe_subscription_id : null,
    canUseAi: status === "active" && remaining > 0,
  }
}

export function buildPlanMetadataPatch(
  existing: Record<string, unknown> | null | undefined,
  snapshot: BuyerPlanSnapshot
): Record<string, unknown> {
  return {
    ...(existing ?? {}),
    plan_id: snapshot.planId,
    plan_status: snapshot.planStatus,
    ai_credits_remaining: snapshot.aiCreditsRemaining,
    ai_credits_monthly: snapshot.aiCreditsMonthly,
    product_limit: snapshot.productLimit,
    storage_limit_bytes: snapshot.storageLimitBytes,
    storage_used_bytes: snapshot.storageUsedBytes,
    plan_discount_percent: snapshot.discountPercent,
    plan_renews_at: snapshot.planRenewsAt,
    stripe_subscription_id: snapshot.stripeSubscriptionId,
  }
}

type CustomerModule = {
  retrieveCustomer: (id: string) => Promise<{ id: string; metadata?: Record<string, unknown> | null }>
  updateCustomers: (id: string, data: { metadata: Record<string, unknown> }) => Promise<unknown>
}

const resolveCustomerModule = (container: MedusaContainer): CustomerModule =>
  container.resolve(Modules.CUSTOMER) as CustomerModule

export async function getBuyerPlanSnapshot(
  container: MedusaContainer,
  customerId: string
): Promise<BuyerPlanSnapshot> {
  const customerModule = resolveCustomerModule(container)
  const customer = await customerModule.retrieveCustomer(customerId)
  return readBuyerPlanFromMetadata(customer.metadata as Record<string, unknown> | null)
}

/** Ensure Free defaults are written once so ME UI sees concrete numbers. */
export async function ensureBuyerPlanMetadata(
  container: MedusaContainer,
  customerId: string
): Promise<BuyerPlanSnapshot> {
  const customerModule = resolveCustomerModule(container)
  const customer = await customerModule.retrieveCustomer(customerId)
  const meta = (customer.metadata ?? {}) as Record<string, unknown>
  const snapshot = readBuyerPlanFromMetadata(meta)
  const needsWrite =
    meta.plan_id === undefined ||
    meta.ai_credits_remaining === undefined ||
    meta.ai_credits_monthly === undefined

  if (needsWrite) {
    await customerModule.updateCustomers(customerId, {
      metadata: buildPlanMetadataPatch(meta, snapshot),
    })
  }
  return snapshot
}

export async function consumeBuyerAiCredit(
  container: MedusaContainer,
  customerId: string,
  amount = 1
): Promise<BuyerPlanSnapshot> {
  if (amount < 1) throw new BuyerPlanError("VALIDATION_ERROR", "amount must be >= 1")

  const customerModule = resolveCustomerModule(container)
  const customer = await customerModule.retrieveCustomer(customerId)
  const meta = (customer.metadata ?? {}) as Record<string, unknown>
  const snapshot = readBuyerPlanFromMetadata(meta)

  if (snapshot.planStatus !== "active") {
    throw new BuyerPlanError("PLAN_INACTIVE", "Your plan is not active", 403)
  }
  if (snapshot.aiCreditsRemaining < amount) {
    throw new BuyerPlanError(
      "AI_CREDITS_EXHAUSTED",
      "No AI image credits remaining. Upgrade your plan to continue.",
      402
    )
  }

  const next: BuyerPlanSnapshot = {
    ...snapshot,
    aiCreditsRemaining: snapshot.aiCreditsRemaining - amount,
    canUseAi: snapshot.aiCreditsRemaining - amount > 0,
  }

  await customerModule.updateCustomers(customerId, {
    metadata: buildPlanMetadataPatch(meta, next),
  })
  return next
}

/** Demo upgrade without Stripe — sets plan + refreshes monthly credits. */
export async function setBuyerPlanId(
  container: MedusaContainer,
  customerId: string,
  planId: BuyerPlanId
): Promise<BuyerPlanSnapshot> {
  const catalog = BUYER_PLAN_CATALOG[planId]
  const customerModule = resolveCustomerModule(container)
  const customer = await customerModule.retrieveCustomer(customerId)
  const meta = (customer.metadata ?? {}) as Record<string, unknown>
  const renews = new Date()
  renews.setMonth(renews.getMonth() + 1)

  const next: BuyerPlanSnapshot = {
    planId,
    planName: catalog.name,
    planStatus: "active",
    priceLabel: catalog.priceLabel,
    aiCreditsRemaining: catalog.aiCreditsMonthly,
    aiCreditsMonthly: catalog.aiCreditsMonthly,
    productLimit: catalog.productLimit,
    storageLimitBytes: catalog.storageLimitBytes,
    storageUsedBytes: asNonNegInt(meta.storage_used_bytes, 0),
    discountPercent: catalog.discountPercent,
    planRenewsAt: renews.toISOString(),
    stripeSubscriptionId:
      typeof meta.stripe_subscription_id === "string" ? meta.stripe_subscription_id : null,
    canUseAi: catalog.aiCreditsMonthly > 0,
  }

  await customerModule.updateCustomers(customerId, {
    metadata: {
      ...buildPlanMetadataPatch(meta, next),
      ai_credits_period_start: new Date().toISOString(),
    },
  })
  return next
}

export const serializeBuyerPlan = (snapshot: BuyerPlanSnapshot) => ({
  plan_id: snapshot.planId,
  plan_name: snapshot.planName,
  plan_status: snapshot.planStatus,
  price_label: snapshot.priceLabel,
  ai_credits_remaining: snapshot.aiCreditsRemaining,
  ai_credits_monthly: snapshot.aiCreditsMonthly,
  product_limit: snapshot.productLimit,
  storage_limit_bytes: snapshot.storageLimitBytes,
  storage_used_bytes: snapshot.storageUsedBytes,
  plan_discount_percent: snapshot.discountPercent,
  plan_renews_at: snapshot.planRenewsAt,
  stripe_subscription_id: snapshot.stripeSubscriptionId,
  can_use_ai: snapshot.canUseAi,
})

export const serializePlanCatalog = () =>
  (Object.keys(BUYER_PLAN_CATALOG) as BuyerPlanId[]).map((id) => {
    const entry = BUYER_PLAN_CATALOG[id]
    return {
      id: entry.id,
      name: entry.name,
      price_label: entry.priceLabel,
      monthly_price_usd: entry.monthlyPriceUsd,
      ai_credits_monthly: entry.aiCreditsMonthly,
      product_limit: entry.productLimit,
      storage_limit_bytes: entry.storageLimitBytes,
      discount_percent: entry.discountPercent,
      description: entry.description,
    }
  })
