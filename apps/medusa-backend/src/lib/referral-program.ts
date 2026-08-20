import { randomBytes } from "node:crypto"
import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { BUYER_REFUND_REQUESTS_MODULE } from "../modules/buyer-refund-requests"
import { STORE_CORE_MODULE } from "../modules/store-core"
import type StoreCoreModuleService from "../modules/store-core/service"
import { resolveBuyerOrderTotals } from "./buyer-order-totals"
import { convertWalletAmount, majorToMinor, minorToMajor } from "./wallet-currency"
import { readOrderStoreId } from "./order-store-context"
import { resolvePayPalPayerIdFromMetadata, resolvePayPalPayoutEmailFromMetadata } from "./customer-payment-methods"

type Row = Record<string, any>
type ReferralSource = "link" | "code" | "email" | "admin"
type TerminalCommissionStatus = "order_cancelled" | "order_refund" | "cancelled"

const FIRST_ORDER_RATE_BPS = 2_500
const FUTURE_ORDER_RATE_BPS = 800
const COMMISSION_CURRENCY = "usd"
const ATTRIBUTION_MONTHS = 12
const REFUND_STATUSES = new Set(["partially_refunded", "refunded", "processed"])

const one = <T>(value: T | T[]) => Array.isArray(value) ? value[0] : value
const core = (container: MedusaContainer) => container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService & Record<string, any>

const asDate = (value: unknown) => {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value)
    if (Number.isFinite(parsed.getTime())) return parsed
  }
  return null
}

const readFee = (metadata: Record<string, unknown> | null | undefined, names: string[]) => {
  for (const name of names) {
    const value = Number(metadata?.[name])
    if (Number.isFinite(value) && value > 0) return value
  }
  return 0
}

export const normalizeReferralCode = (value: unknown) =>
  typeof value === "string" ? value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 24) : ""

export const calculateEligibleReferralAmount = (order: Record<string, unknown>) => {
  const totals = resolveBuyerOrderTotals(order)
  const metadata = order.metadata && typeof order.metadata === "object"
    ? order.metadata as Record<string, unknown>
    : null
  const importFees = readFee(metadata, ["import_fee", "import_fees", "import_tax"])
  const exportFees = readFee(metadata, ["export_fee", "export_fees", "export_tax"])
  return Math.max(0, (totals.subtotal ?? 0) - (totals.discountTotal ?? 0) - importFees - exportFees)
}

export const calculateReferralCommissionUsd = (input: {
  eligibleAmount: number
  orderCurrencyCode: string
  rateBps: number
}) => {
  const eligibleUsd = convertWalletAmount(input.eligibleAmount, input.orderCurrencyCode, COMMISSION_CURRENCY)
  const commissionUsd = eligibleUsd * input.rateBps / 10_000
  return {
    eligibleAmountMinor: majorToMinor(eligibleUsd, COMMISSION_CURRENCY),
    commissionAmountMinor: majorToMinor(commissionUsd, COMMISSION_CURRENCY),
  }
}

const addAttributionWindow = (date: Date, months = ATTRIBUTION_MONTHS) => {
  const next = new Date(date)
  next.setUTCMonth(next.getUTCMonth() + months)
  return next
}

const serializeProgramSettings = (row: Row) => ({
  first_order_rate_percent: Number(row.first_order_rate_bps) / 100,
  future_order_rate_percent: Number(row.future_order_rate_bps) / 100,
  future_order_months: Number(row.attribution_months),
  currency_code: COMMISSION_CURRENCY,
  minimum_payout: Number(process.env.WALLET_MIN_WITHDRAWAL_MAJOR ?? 5),
  payout_schedule: "monthly_20_hkt",
  eligible_amount_excludes: ["shipping", "tax", "import_fee", "export_fee", "coupon", "discount"],
})

export async function getReferralProgramSettings(container: MedusaContainer, storeId: string) {
  const service = core(container)
  const rows = await service.listReferralProgramSettings({ store_id: storeId }, { take: 1 }) as Row[]
  if (rows[0]) return rows[0]
  try {
    return one(await service.createReferralProgramSettings({
      store_id: storeId,
      first_order_rate_bps: FIRST_ORDER_RATE_BPS,
      future_order_rate_bps: FUTURE_ORDER_RATE_BPS,
      attribution_months: ATTRIBUTION_MONTHS,
      currency_code: COMMISSION_CURRENCY,
      metadata: null,
    })) as Row
  } catch (error) {
    const concurrent = await service.listReferralProgramSettings({ store_id: storeId }, { take: 1 }) as Row[]
    if (concurrent[0]) return concurrent[0]
    throw error
  }
}

export async function getReferralProgram(container: MedusaContainer, storeId: string) {
  const settings = await getReferralProgramSettings(container, storeId)
  return {
    name: "Customized Products",
    description: "Custom-print products with AI-powered design and mockup services.",
    ...serializeProgramSettings(settings),
  }
}

export async function updateReferralProgramSettings(container: MedusaContainer, storeId: string, input: {
  firstOrderRatePercent: number
  futureOrderRatePercent: number
  attributionMonths: number
}) {
  for (const [label, value] of [["First-order rate", input.firstOrderRatePercent], ["Future-order rate", input.futureOrderRatePercent]] as const) {
    if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error(`${label} must be between 0 and 100`)
  }
  if (!Number.isInteger(input.attributionMonths) || input.attributionMonths < 1 || input.attributionMonths > 60) {
    throw new Error("Attribution period must be between 1 and 60 months")
  }
  const service = core(container)
  const current = await getReferralProgramSettings(container, storeId)
  const updated = one(await service.updateReferralProgramSettings({
    selector: { id: current.id },
    data: {
      first_order_rate_bps: Math.round(input.firstOrderRatePercent * 100),
      future_order_rate_bps: Math.round(input.futureOrderRatePercent * 100),
      attribution_months: input.attributionMonths,
      metadata: { ...(current.metadata ?? {}), updated_at: new Date().toISOString() },
    },
  })) as Row
  return serializeProgramSettings(updated)
}

const serializeProfile = (row: Row, storefrontUrl: string) => ({
  id: row.id,
  referral_code: row.referral_code,
  status: row.status,
  referral_link: `${storefrontUrl.replace(/\/$/, "")}/account/register?ref=${encodeURIComponent(row.referral_code)}`,
  created_at: row.created_at,
})

const serializeCommission = (row: Row) => ({
  id: row.id,
  order_id: row.order_id,
  order_display_id: row.order_display_id ?? null,
  eligible_amount: minorToMajor(Number(row.eligible_amount_minor), COMMISSION_CURRENCY),
  commission_amount: minorToMajor(Number(row.commission_amount_minor), COMMISSION_CURRENCY),
  currency_code: COMMISSION_CURRENCY,
  rate_percent: Number(row.rate_bps) / 100,
  is_first_order: Boolean(row.is_first_order),
  status: row.status,
  reason: row.reason ?? null,
  order_created_at: row.order_created_at,
  released_at: row.released_at ?? null,
  created_at: row.created_at,
})

const maskEmail = (email?: string | null) => {
  const value = email?.trim()
  if (!value || !value.includes("@")) return null
  const [local, domain] = value.split("@")
  return `${local.slice(0, 2)}${"*".repeat(Math.max(1, Math.min(6, local.length - 2)))}@${domain}`
}

export async function ensureReferralProfile(container: MedusaContainer, storeId: string, customerId: string) {
  const service = core(container)
  const existing = await service.listReferralProfiles({ store_id: storeId, customer_id: customerId }, { take: 1 }) as Row[]
  if (existing[0]) return existing[0]

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = `CII${randomBytes(5).toString("hex").toUpperCase()}`
    const duplicate = await service.listReferralProfiles({ store_id: storeId, referral_code: code }, { take: 1 }) as Row[]
    if (duplicate[0]) continue
    return one(await service.createReferralProfiles({
      store_id: storeId,
      customer_id: customerId,
      referral_code: code,
      status: "active",
      metadata: null,
    })) as Row
  }
  throw new Error("Unable to generate a unique referral code")
}

export async function bindReferralCode(container: MedusaContainer, input: {
  storeId: string
  referredCustomerId: string
  referralCode: string
  source: ReferralSource
}) {
  const service = core(container)
  const code = normalizeReferralCode(input.referralCode)
  if (code.length < 6) throw new Error("Enter a valid referral code")
  const profiles = await service.listReferralProfiles({ store_id: input.storeId, referral_code: code }, { take: 1 }) as Row[]
  const profile = profiles[0]
  if (!profile || profile.status !== "active") throw new Error("Referral code was not found or is inactive")
  if (profile.customer_id === input.referredCustomerId) throw new Error("You cannot use your own referral code")

  const existing = await service.listReferralAttributions({
    store_id: input.storeId,
    referred_customer_id: input.referredCustomerId,
  }, { order: { attributed_at: "DESC" } }) as Row[]
  const active = existing.find((row) => row.status === "active")
  const activeExpiry = asDate(active?.expires_at)
  if (active && activeExpiry && activeExpiry.getTime() <= Date.now()) {
    await service.updateReferralAttributions({
      selector: { id: active.id },
      data: { status: "expired", metadata: { ...(active.metadata ?? {}), expired_at: new Date().toISOString() } },
    })
  } else if (active) {
    if (active.referrer_customer_id === profile.customer_id) return { attribution: active, idempotent: true }
    throw new Error("This account already has a referral attribution")
  }

  const created = one(await service.createReferralAttributions({
    store_id: input.storeId,
    referrer_customer_id: profile.customer_id,
    referred_customer_id: input.referredCustomerId,
    referral_code: code,
    source: input.source,
    status: "active",
    attributed_at: new Date(),
    first_successful_order_id: null,
    first_successful_order_at: null,
    expires_at: null,
    metadata: null,
  })) as Row
  return { attribution: created, idempotent: false }
}

async function retrieveCommissionOrder(container: MedusaContainer, orderId: string) {
  const orderModule = container.resolve(Modules.ORDER) as {
    retrieveOrder: (id: string, config?: Record<string, unknown>) => Promise<Record<string, any>>
  }
  return orderModule.retrieveOrder(orderId, {
    relations: ["items", "payment_collections", "payment_collections.payments", "payment_collections.payments.refunds"],
  })
}

const orderCurrency = (order: Record<string, unknown>) =>
  typeof order.currency_code === "string" && order.currency_code.trim()
    ? order.currency_code.trim().toLowerCase()
    : COMMISSION_CURRENCY

const hasRecordedRefund = (order: Record<string, any>) => {
  for (const collection of order.payment_collections ?? []) {
    if (Number(collection.refunded_amount ?? collection.raw_refunded_amount ?? 0) > 0) return true
    for (const payment of collection.payments ?? []) {
      if (Number(payment.refunded_amount ?? payment.raw_refunded_amount ?? 0) > 0) return true
      if ((payment.refunds ?? []).length > 0) return true
    }
  }
  return false
}

const isOrderCancelled = (order: Record<string, any>) =>
  Boolean(order.canceled_at ?? order.cancelled_at) || ["cancelled", "canceled"].includes(String(order.status ?? "").toLowerCase())

async function hasSuccessfulRefund(container: MedusaContainer, orderId: string) {
  try {
    const refunds = container.resolve(BUYER_REFUND_REQUESTS_MODULE) as {
      listBuyerRefundRequests: (filters: Record<string, unknown>) => Promise<Row[]>
    }
    const rows = await refunds.listBuyerRefundRequests({ order_id: orderId })
    return rows.some((row) => REFUND_STATUSES.has(String(row.status)))
  } catch {
    return false
  }
}

const payerIdentitiesFromOrder = (order: Record<string, any>) => {
  const emails = new Set<string>()
  const payerIds = new Set<string>()
  for (const collection of order.payment_collections ?? []) {
    for (const payment of collection.payments ?? []) {
      const data = payment.data && typeof payment.data === "object" ? payment.data : {}
      for (const candidate of [data.paypal_payer_email, data.payer_email, data.email_address]) {
        if (typeof candidate === "string" && candidate.includes("@")) emails.add(candidate.trim().toLowerCase())
      }
      for (const candidate of [data.paypal_payer_id, data.payer_id]) {
        if (typeof candidate === "string" && candidate.trim()) payerIds.add(candidate.trim())
      }
    }
  }
  return { emails, payerIds }
}

async function hasMatchingPayPalIdentity(container: MedusaContainer, order: Record<string, any>, referrerCustomerId: string) {
  const payer = payerIdentitiesFromOrder(order)
  if (!payer.emails.size && !payer.payerIds.size) return false
  const customers = container.resolve(Modules.CUSTOMER) as {
    retrieveCustomer: (id: string) => Promise<{ metadata?: Record<string, unknown> | null }>
  }
  const referrer = await customers.retrieveCustomer(referrerCustomerId)
  const payoutEmail = resolvePayPalPayoutEmailFromMetadata(referrer.metadata)?.trim().toLowerCase()
  const payoutPayerId = resolvePayPalPayerIdFromMetadata(referrer.metadata)?.trim()
  return Boolean(
    (payoutEmail && payer.emails.has(payoutEmail)) ||
    (payoutPayerId && payer.payerIds.has(payoutPayerId))
  )
}

export async function createPendingReferralCommission(container: MedusaContainer, orderId: string) {
  const service = core(container)
  const existing = await service.listReferralCommissions({ order_id: orderId }, { take: 1 }) as Row[]
  if (existing[0]) return { commission: existing[0], idempotent: true }
  const order = await retrieveCommissionOrder(container, orderId)
  const storeId = readOrderStoreId(order)
  const referredCustomerId = typeof order.customer_id === "string" ? order.customer_id : null
  if (!storeId || !referredCustomerId) return { commission: null, idempotent: false }
  const attributions = await service.listReferralAttributions({
    store_id: storeId,
    referred_customer_id: referredCustomerId,
    status: "active",
  }, { take: 1 }) as Row[]
  const attribution = attributions[0]
  if (!attribution) return { commission: null, idempotent: false }
  const expiresAt = asDate(attribution.expires_at)
  if (expiresAt && expiresAt.getTime() <= Date.now()) {
    await service.updateReferralAttributions({
      selector: { id: attribution.id },
      data: { status: "expired", metadata: { ...(attribution.metadata ?? {}), expired_at: new Date().toISOString() } },
    })
    return { commission: null, idempotent: false }
  }

  const previous = await service.listReferralCommissions({ attribution_id: attribution.id }) as Row[]
  const firstOrderEstimate = !previous.some((row) => !["order_cancelled", "order_refund", "cancelled", "expired", "reversed"].includes(String(row.status)))
  const programSettings = await getReferralProgramSettings(container, storeId)
  const rateBps = firstOrderEstimate ? Number(programSettings.first_order_rate_bps) : Number(programSettings.future_order_rate_bps)
  const amounts = calculateReferralCommissionUsd({
    eligibleAmount: calculateEligibleReferralAmount(order),
    orderCurrencyCode: orderCurrency(order),
    rateBps,
  })
  const orderCreatedAt = asDate(order.created_at) ?? new Date()
  const created = one(await service.createReferralCommissions({
    store_id: storeId,
    attribution_id: attribution.id,
    referrer_customer_id: attribution.referrer_customer_id,
    referred_customer_id: referredCustomerId,
    order_id: orderId,
    order_display_id: typeof order.display_id === "number" ? order.display_id : null,
    order_created_at: orderCreatedAt,
    eligible_amount_minor: amounts.eligibleAmountMinor,
    commission_amount_minor: amounts.commissionAmountMinor,
    currency_code: COMMISSION_CURRENCY,
    rate_bps: rateBps,
    is_first_order: firstOrderEstimate,
    status: "pending",
    released_at: null,
    reason: null,
    metadata: {
      order_currency_code: orderCurrency(order),
      calculation: "product_subtotal_after_discounts_excluding_shipping_tax_import_export",
    },
  })) as Row
  return { commission: created, idempotent: false }
}

async function creditReleasedCommission(container: MedusaContainer, commission: Row) {
  const service = core(container)
  const existing = await service.listBuyerWalletLedgers({
    store_id: commission.store_id,
    customer_id: commission.referrer_customer_id,
    type: "cashback_credit",
    reference_id: commission.id,
  }, { take: 1 }) as Row[]
  if (existing[0]) return existing[0]
  return one(await service.createBuyerWalletLedgers({
    store_id: commission.store_id,
    customer_id: commission.referrer_customer_id,
    type: "cashback_credit",
    amount_minor: Number(commission.commission_amount_minor),
    currency_code: COMMISSION_CURRENCY,
    status: "available",
    source: "referral_commission",
    reference_id: commission.id,
    description: commission.order_display_id ? `Referral commission · Order #${commission.order_display_id}` : "Referral commission",
    metadata: { order_id: commission.order_id, rate_bps: commission.rate_bps },
  })) as Row
}

async function reverseReleasedCommission(container: MedusaContainer, commission: Row, reason: TerminalCommissionStatus) {
  const service = core(container)
  const referenceId = `${commission.id}:reversal`
  const existing = await service.listBuyerWalletLedgers({
    store_id: commission.store_id,
    customer_id: commission.referrer_customer_id,
    type: "adjustment",
    reference_id: referenceId,
  }, { take: 1 }) as Row[]
  if (!existing[0] && Number(commission.commission_amount_minor) > 0) {
    await service.createBuyerWalletLedgers({
      store_id: commission.store_id,
      customer_id: commission.referrer_customer_id,
      type: "adjustment",
      amount_minor: -Number(commission.commission_amount_minor),
      currency_code: COMMISSION_CURRENCY,
      status: "completed",
      source: "referral_commission_reversal",
      reference_id: referenceId,
    description: reason === "order_refund" ? "Referral commission reversed · Order refund" : reason === "cancelled" ? "Referral commission reversed · Policy violation" : "Referral commission reversed · Order cancelled",
      metadata: { commission_id: commission.id, order_id: commission.order_id },
    })
  }
}

export async function cancelReferralCommissionForOrder(container: MedusaContainer, orderId: string, reason: TerminalCommissionStatus) {
  const service = core(container)
  const rows = await service.listReferralCommissions({ order_id: orderId }, { take: 1 }) as Row[]
  const commission = rows[0]
  if (!commission) return null
  if (["order_cancelled", "order_refund", "cancelled"].includes(String(commission.status))) return commission
  if (commission.status === "released") await reverseReleasedCommission(container, commission, reason)
  return one(await service.updateReferralCommissions({
    selector: { id: commission.id },
    data: {
      status: reason,
      commission_amount_minor: 0,
      reason: reason === "order_refund" ? "Order Refund" : reason === "cancelled" ? "Referral policy violation" : "Order Cancelled",
      metadata: {
        ...(commission.metadata ?? {}),
        original_commission_amount_minor: commission.commission_amount_minor,
        reversed_at: new Date().toISOString(),
      },
    },
  })) as Row
}

export async function releaseReferralCommissionForOrder(container: MedusaContainer, orderId: string) {
  const service = core(container)
  const ensured = await createPendingReferralCommission(container, orderId)
  let commission = ensured.commission as Row | null
  if (!commission || commission.status === "released") return commission
  const order = await retrieveCommissionOrder(container, orderId)
  if (isOrderCancelled(order)) return cancelReferralCommissionForOrder(container, orderId, "order_cancelled")
  if (hasRecordedRefund(order) || await hasSuccessfulRefund(container, orderId)) {
    return cancelReferralCommissionForOrder(container, orderId, "order_refund")
  }
  if (String(order.status).toLowerCase() !== "completed") return commission
  if (commission.status === "frozen") return commission

  const attributionRows = await service.listReferralAttributions({ id: commission.attribution_id }, { take: 1 }) as Row[]
  const attribution = attributionRows[0]
  if (!attribution || attribution.status !== "active") return commission
  if (await hasMatchingPayPalIdentity(container, order, attribution.referrer_customer_id)) {
    return cancelReferralCommissionForOrder(container, orderId, "cancelled")
  }
  const all = await service.listReferralCommissions({ attribution_id: attribution.id }) as Row[]
  const orderCreatedAt = asDate(commission.order_created_at) ?? new Date()
  const earlierUnresolved = all.some((row) => {
    if (row.id === commission!.id || !["pending", "frozen"].includes(String(row.status))) return false
    const candidate = asDate(row.order_created_at)
    return candidate ? candidate.getTime() < orderCreatedAt.getTime() : false
  })
  if (earlierUnresolved) return commission

  const previousReleased = all
    .filter((row) => row.id !== commission!.id && row.status === "released")
    .sort((a, b) => (asDate(a.order_created_at)?.getTime() ?? 0) - (asDate(b.order_created_at)?.getTime() ?? 0))
  const isFirstOrder = previousReleased.length === 0
  const completionAt = asDate(order.completed_at) ?? new Date()
  const programSettings = await getReferralProgramSettings(container, commission.store_id)
  const firstOrderAt = isFirstOrder
    ? completionAt
    : asDate(attribution.first_successful_order_at) ?? asDate(previousReleased[0]?.order_created_at) ?? orderCreatedAt
  const expiresAt = asDate(attribution.expires_at) ?? addAttributionWindow(firstOrderAt, Number(programSettings.attribution_months))
  if (!isFirstOrder && orderCreatedAt.getTime() > expiresAt.getTime()) {
    await service.updateReferralAttributions({
      selector: { id: attribution.id },
      data: { status: "expired", metadata: { ...(attribution.metadata ?? {}), expired_at: new Date().toISOString() } },
    })
    return one(await service.updateReferralCommissions({
      selector: { id: commission.id },
      data: { status: "expired", commission_amount_minor: 0, rate_bps: 0, is_first_order: false, reason: "Referral earning window expired" },
    })) as Row
  }

  const rateBps = isFirstOrder ? Number(programSettings.first_order_rate_bps) : Number(programSettings.future_order_rate_bps)
  const amounts = calculateReferralCommissionUsd({
    eligibleAmount: calculateEligibleReferralAmount(order),
    orderCurrencyCode: orderCurrency(order),
    rateBps,
  })
  const overrideMinor = Number(commission.metadata?.admin_commission_override_minor)
  const commissionAmountMinor = Number.isFinite(overrideMinor) && overrideMinor >= 0
    ? overrideMinor
    : amounts.commissionAmountMinor
  commission = one(await service.updateReferralCommissions({
    selector: { id: commission.id },
    data: {
      eligible_amount_minor: amounts.eligibleAmountMinor,
      commission_amount_minor: commissionAmountMinor,
      rate_bps: rateBps,
      is_first_order: isFirstOrder,
      status: "released",
      released_at: new Date(),
      reason: "Order Successful",
    },
  })) as Row
  if (isFirstOrder) {
    await service.updateReferralAttributions({
      selector: { id: attribution.id },
      data: {
        first_successful_order_id: orderId,
        first_successful_order_at: firstOrderAt,
        expires_at: expiresAt,
      },
    })
  }
  await creditReleasedCommission(container, commission)
  return commission
}

export async function getReferralDashboard(container: MedusaContainer, storeId: string, customerId: string) {
  const service = core(container)
  const profile = await ensureReferralProfile(container, storeId, customerId)
  const programSettings = await getReferralProgramSettings(container, storeId)
  const commissions = await service.listReferralCommissions(
    { store_id: storeId, referrer_customer_id: customerId },
    { order: { order_created_at: "DESC" }, take: 100 }
  ) as Row[]
  const attributions = await service.listReferralAttributions({ store_id: storeId, referrer_customer_id: customerId }) as Row[]
  for (const attribution of attributions) {
    const expiry = asDate(attribution.expires_at)
    if (attribution.status !== "active" || !expiry || expiry.getTime() > Date.now()) continue
    await service.updateReferralAttributions({
      selector: { id: attribution.id },
      data: { status: "expired", metadata: { ...(attribution.metadata ?? {}), expired_at: new Date().toISOString() } },
    })
    attribution.status = "expired"
  }
  const referredIds = [...new Set(attributions.map((row) => String(row.referred_customer_id)).filter(Boolean))]
  const customerService = container.resolve(Modules.CUSTOMER) as {
    listCustomers: (filters: Record<string, unknown>, config?: Record<string, unknown>) => Promise<Array<{ id: string; email?: string | null; first_name?: string | null; last_name?: string | null }>>
  }
  const referredCustomers = referredIds.length
    ? await customerService.listCustomers({ id: referredIds }, { select: ["id", "email", "first_name", "last_name"], take: referredIds.length })
    : []
  const referredById = new Map(referredCustomers.map((customer) => [customer.id, customer]))
  const sum = (status: string) => commissions.filter((row) => row.status === status).reduce((total, row) => total + Number(row.commission_amount_minor), 0)
  const storefrontUrl = process.env.STOREFRONT_URL || "http://127.0.0.1:5174"
  return {
    profile: serializeProfile(profile, storefrontUrl),
    rules: serializeProgramSettings(programSettings),
    summary: {
      referred_customers: attributions.length,
      pending_amount: minorToMajor(sum("pending"), COMMISSION_CURRENCY),
      released_amount: minorToMajor(sum("released"), COMMISSION_CURRENCY),
      currency_code: COMMISSION_CURRENCY,
    },
    referred_customers: attributions.map((attribution) => {
      const customer = referredById.get(String(attribution.referred_customer_id))
      const name = [customer?.first_name, customer?.last_name].filter(Boolean).join(" ")
      return {
        id: attribution.referred_customer_id,
        display_name: name || "Referred customer",
        email_masked: maskEmail(customer?.email),
        status: attribution.status,
        attributed_at: attribution.attributed_at,
        first_successful_order_at: attribution.first_successful_order_at ?? null,
        expires_at: attribution.expires_at ?? null,
      }
    }),
    commissions: commissions.map(serializeCommission),
  }
}

export async function listReferralCommissionsForAdmin(container: MedusaContainer, storeId: string) {
  const service = core(container)
  const rows = await service.listReferralCommissions(
    { store_id: storeId },
    { order: { order_created_at: "DESC" }, take: 500 }
  ) as Row[]
  return rows.map((row) => ({
    ...serializeCommission(row),
    referrer_customer_id: row.referrer_customer_id,
    referred_customer_id: row.referred_customer_id,
    attribution_id: row.attribution_id,
  }))
}

export async function updateReferralCommissionByAdmin(container: MedusaContainer, input: {
  storeId: string
  commissionId: string
  action: "freeze" | "unfreeze" | "cancel" | "release" | "adjust"
  amount?: number
  reason?: string
}) {
  const service = core(container)
  const rows = await service.listReferralCommissions({ id: input.commissionId, store_id: input.storeId }, { take: 1 }) as Row[]
  const commission = rows[0]
  if (!commission) throw new Error("Referral commission not found")
  if (input.action === "freeze") {
    if (commission.status !== "pending") throw new Error("Only pending commission can be frozen")
    return one(await service.updateReferralCommissions({ selector: { id: commission.id }, data: { status: "frozen", reason: input.reason?.trim() || "Frozen for review" } }))
  }
  if (input.action === "unfreeze") {
    if (commission.status !== "frozen") throw new Error("Only frozen commission can be resumed")
    return one(await service.updateReferralCommissions({ selector: { id: commission.id }, data: { status: "pending", reason: input.reason?.trim() || null } }))
  }
  if (input.action === "cancel") return cancelReferralCommissionForOrder(container, commission.order_id, "cancelled")
  if (input.action === "release") return releaseReferralCommissionForOrder(container, commission.order_id)

  const amount = Number(input.amount)
  if (!Number.isFinite(amount) || amount < 0) throw new Error("A non-negative USD amount is required")
  const nextMinor = majorToMinor(amount, COMMISSION_CURRENCY)
  const previousMinor = Number(commission.commission_amount_minor)
  if (commission.status === "released" && nextMinor !== previousMinor) {
    await service.createBuyerWalletLedgers({
      store_id: commission.store_id,
      customer_id: commission.referrer_customer_id,
      type: "adjustment",
      amount_minor: nextMinor - previousMinor,
      currency_code: COMMISSION_CURRENCY,
      status: "completed",
      source: "referral_admin_adjustment",
      reference_id: `${commission.id}:adjustment:${Date.now()}`,
      description: input.reason?.trim() || "Referral commission adjustment",
      metadata: { commission_id: commission.id, previous_amount_minor: previousMinor },
    })
  }
  return one(await service.updateReferralCommissions({
    selector: { id: commission.id },
    data: {
      commission_amount_minor: nextMinor,
      reason: input.reason?.trim() || "Adjusted by administrator",
      metadata: {
        ...(commission.metadata ?? {}),
        admin_commission_override_minor: nextMinor,
        adjusted_from_minor: previousMinor,
        adjusted_at: new Date().toISOString(),
      },
    },
  }))
}

export const REFERRAL_PROGRAM_RULES = {
  firstOrderRateBps: FIRST_ORDER_RATE_BPS,
  futureOrderRateBps: FUTURE_ORDER_RATE_BPS,
  attributionMonths: ATTRIBUTION_MONTHS,
  currencyCode: COMMISSION_CURRENCY,
}
