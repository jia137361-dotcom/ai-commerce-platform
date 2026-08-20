import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { STORE_CORE_MODULE } from "../modules/store-core"
import type StoreCoreModuleService from "../modules/store-core/service"
import { resolvePayPalPayoutEmailFromMetadata } from "./customer-payment-methods"
import { createPayPalPayout, maskPayoutEmail, resolvePayPalPayoutMode, retrievePayPalPayout } from "./paypal-payouts"
import { convertWalletAmount, isPayPalPayoutCurrency, majorToMinor, minorToMajor } from "./wallet-currency"

type WalletRow = Record<string, any>
type WithdrawalAction = "approve" | "reject" | "retry"

const PAYOUT_CURRENCY_CODE = "usd"
const MAX_AUTOMATIC_RETRIES = 3
const HKT_OFFSET_MS = 8 * 60 * 60 * 1000

const payoutUserFeeBps = () => Math.max(0, Number(process.env.PAYPAL_PAYOUT_USER_FEE_BPS ?? 200))
const payoutUserFeeCapMinor = () => majorToMinor(Math.max(0, Number(process.env.PAYPAL_PAYOUT_USER_FEE_CAP_MAJOR ?? 50)), PAYOUT_CURRENCY_CODE)
export const calculatePayoutUserFeeMinor = (amountMinor: number) =>
  Math.min(Math.round(Math.max(0, amountMinor) * payoutUserFeeBps() / 10_000), payoutUserFeeCapMinor())

const one = <T>(value: T | T[]) => Array.isArray(value) ? value[0] : value
const core = (container: MedusaContainer) => container.resolve(STORE_CORE_MODULE) as StoreCoreModuleService & Record<string, any>

const customerModule = (container: MedusaContainer) => container.resolve(Modules.CUSTOMER) as {
  retrieveCustomer: (id: string) => Promise<{ id: string; email?: string | null; first_name?: string | null; last_name?: string | null; metadata?: Record<string, unknown> | null }>
  listCustomers: (filters: Record<string, unknown>, config?: Record<string, unknown>) => Promise<Array<{ id: string; email?: string | null; first_name?: string | null; last_name?: string | null; metadata?: Record<string, unknown> | null }>>
}

const readPreferredCurrency = (metadata?: Record<string, unknown> | null) => {
  const raw = metadata?.buyer_preferences
  const value = raw && typeof raw === "object" ? (raw as Record<string, unknown>).currency_code : null
  return typeof value === "string" && value.trim().toLowerCase() !== "auto" ? value.trim().toLowerCase() : null
}

const countsForBalance = (row: WalletRow) => {
  if (row.type === "cashback_credit" || row.type === "adjustment") {
    return row.status === "available" || row.status === "completed"
  }
  return row.type === "withdrawal_debit" && (row.status === "processing" || row.status === "completed")
}

export const calculateWalletBalances = (rows: WalletRow[]) => {
  const balances: Record<string, number> = {}
  for (const row of rows) {
    if (!countsForBalance(row)) continue
    const currency = String(row.currency_code).toLowerCase()
    const amount = Number(row.amount_minor)
    balances[currency] = (balances[currency] ?? 0) + (row.type === "withdrawal_debit" ? -amount : amount)
  }
  return balances
}

const serializeLedger = (row: WalletRow) => ({
  id: row.id,
  type: row.type,
  amount: minorToMajor(Number(row.amount_minor), row.currency_code),
  amount_minor: Number(row.amount_minor),
  currency_code: row.currency_code,
  status: row.status,
  affects_balance: countsForBalance(row),
  description: row.description ?? null,
  source: row.source ?? null,
  reference_id: row.reference_id ?? null,
  created_at: row.created_at,
})

const serializeWithdrawal = (row: WalletRow) => ({
  id: row.id,
  amount: minorToMajor(Number(row.amount_minor), row.currency_code),
  amount_minor: Number(row.amount_minor),
  payout_amount: minorToMajor(Number(row.payout_amount_minor ?? row.amount_minor), row.currency_code),
  payout_amount_minor: Number(row.payout_amount_minor ?? row.amount_minor),
  currency_code: row.currency_code,
  status: row.status,
  fee: row.fee_minor === null || row.fee_minor === undefined ? null : minorToMajor(Number(row.fee_minor), row.currency_code),
  fee_minor: row.fee_minor === null || row.fee_minor === undefined ? null : Number(row.fee_minor),
  provider_fee: row.provider_fee_minor === null || row.provider_fee_minor === undefined ? null : minorToMajor(Number(row.provider_fee_minor), row.currency_code),
  provider_fee_minor: row.provider_fee_minor === null || row.provider_fee_minor === undefined ? null : Number(row.provider_fee_minor),
  request_id: row.request_id ?? null,
  provider: row.provider,
  paypal_email_masked: maskPayoutEmail(row.paypal_email),
  provider_batch_id: row.provider_batch_id ?? null,
  failure_kind: row.failure_kind ?? null,
  retry_count: Number(row.retry_count ?? 0),
  error_message: row.error_message ?? null,
  approved_at: row.approved_at ?? null,
  processing_at: row.processing_at ?? null,
  paid_at: row.paid_at ?? null,
  rejected_at: row.rejected_at ?? null,
  created_at: row.created_at,
  updated_at: row.updated_at,
})

async function reconcileWithdrawals(container: MedusaContainer, rows: WalletRow[]) {
  const service = core(container)
  for (const withdrawal of rows.filter((row) => row.status === "processing" && row.provider_batch_id).slice(0, 5)) {
    try {
      const result = await retrievePayPalPayout(withdrawal.provider_batch_id)
      if (result.status === "processing") continue
      const status = result.status === "paid" ? "paid" : "failed"
      if (result.status === "paid" && result.feeCurrency === withdrawal.currency_code && result.feeMinor !== null) {
        await reconcileWithdrawalFee(container, withdrawal, result.feeMinor)
      }
      await service.updateBuyerWalletLedgers({
        selector: { reference_id: withdrawal.id, type: "withdrawal_debit" },
        data: { status: result.status === "paid" ? "completed" : "processing" },
      })
      await service.updateBuyerWalletWithdrawals({
        selector: { id: withdrawal.id },
        data: {
          status,
          provider_item_id: result.itemId ?? withdrawal.provider_item_id ?? null,
          fee_minor: result.status === "paid" && result.feeCurrency === withdrawal.currency_code ? result.feeMinor : withdrawal.fee_minor ?? null,
          provider_fee_minor: result.feeCurrency === withdrawal.currency_code ? result.feeMinor : withdrawal.provider_fee_minor ?? null,
          paid_at: result.status === "paid" ? new Date() : withdrawal.paid_at ?? null,
          failure_kind: result.status === "failed" ? classifyPayoutFailure(result.issue, result.error) : null,
          error_message: result.status === "failed" ? result.error : null,
        },
      })
      withdrawal.status = status
      withdrawal.provider_item_id = result.itemId ?? withdrawal.provider_item_id ?? null
      withdrawal.fee_minor = result.status === "paid" && result.feeCurrency === withdrawal.currency_code ? result.feeMinor : withdrawal.fee_minor ?? null
      withdrawal.provider_fee_minor = result.feeCurrency === withdrawal.currency_code ? result.feeMinor : withdrawal.provider_fee_minor ?? null
      withdrawal.paid_at = result.status === "paid" ? new Date() : withdrawal.paid_at ?? null
      withdrawal.failure_kind = result.status === "failed" ? classifyPayoutFailure(result.issue, result.error) : null
      withdrawal.error_message = result.status === "failed" ? result.error : null
    } catch {
      // A status refresh is best-effort; a temporary PayPal error must not release held funds.
    }
  }
}

export async function getBuyerWallet(container: MedusaContainer, storeId: string, customerId: string) {
  const service = core(container)
  const customer = await customerModule(container).retrieveCustomer(customerId)
  const withdrawals = await service.listBuyerWalletWithdrawals(
    { store_id: storeId, customer_id: customerId },
    { order: { created_at: "DESC" }, take: 50 }
  ) as WalletRow[]
  await reconcileWithdrawals(container, withdrawals)
  const ledger = await service.listBuyerWalletLedgers(
    { store_id: storeId, customer_id: customerId },
    { order: { created_at: "DESC" }, take: 100 }
  ) as WalletRow[]
  const minorBalances = calculateWalletBalances(ledger)
  const balances = Object.entries(minorBalances).map(([currencyCode, amountMinor]) => ({
    currency_code: currencyCode,
    amount_minor: amountMinor,
    amount: minorToMajor(amountMinor, currencyCode),
    withdrawal_supported: isPayPalPayoutCurrency(currencyCode),
  }))
  return {
    store_id: storeId,
    customer_id: customerId,
    preferred_currency: readPreferredCurrency(customer.metadata),
    paypal_email_masked: maskPayoutEmail(resolvePayPalPayoutEmailFromMetadata(customer.metadata)),
    paypal_account_bound: Boolean(resolvePayPalPayoutEmailFromMetadata(customer.metadata)),
    payout_mode: resolvePayPalPayoutMode(),
    payout_currency_code: PAYOUT_CURRENCY_CODE,
    minimum_withdrawal: Number(process.env.WALLET_MIN_WITHDRAWAL_MAJOR ?? 5),
    withdrawal_fee: 0,
    withdrawal_fee_mode: "estimated_then_paypal_actual",
    withdrawal_fee_rate_percent: payoutUserFeeBps() / 100,
    withdrawal_fee_cap: minorToMajor(payoutUserFeeCapMinor(), PAYOUT_CURRENCY_CODE),
    payout_schedule: { timezone: "Asia/Hong_Kong", day_of_month: 20 },
    balances,
    ledger: ledger.map(serializeLedger),
    withdrawals: withdrawals.map(serializeWithdrawal),
  }
}

export async function grantBuyerCashback(container: MedusaContainer, input: {
  storeId: string
  customerId: string
  amount: number
  currencyCode: string
  description?: string
  referenceId?: string
}) {
  const customer = await customerModule(container).retrieveCustomer(input.customerId)
  const sourceCurrency = input.currencyCode.toLowerCase()
  const targetCurrency = readPreferredCurrency(customer.metadata) ?? sourceCurrency
  const creditedAmount = convertWalletAmount(input.amount, sourceCurrency, targetCurrency)
  const service = core(container)
  if (input.referenceId) {
    const existing = await service.listBuyerWalletLedgers({
      store_id: input.storeId,
      customer_id: input.customerId,
      reference_id: input.referenceId,
      type: "cashback_credit",
    }, { take: 1 }) as WalletRow[]
    if (existing[0]) return { entry: serializeLedger(existing[0]), wallet: await getBuyerWallet(container, input.storeId, input.customerId), idempotent: true }
  }
  const created = one(await service.createBuyerWalletLedgers({
    store_id: input.storeId,
    customer_id: input.customerId,
    type: "cashback_credit",
    amount_minor: majorToMinor(creditedAmount, targetCurrency),
    currency_code: targetCurrency,
    status: "available",
    source: "seller_demo",
    reference_id: input.referenceId ?? null,
    description: input.description?.trim() || "Seller cashback",
    metadata: {
      source_amount: input.amount,
      source_currency_code: sourceCurrency,
      conversion_applied: sourceCurrency !== targetCurrency,
    },
  })) as WalletRow
  return { entry: serializeLedger(created), wallet: await getBuyerWallet(container, input.storeId, input.customerId), idempotent: false }
}

export async function requestBuyerWithdrawal(container: MedusaContainer, input: {
  storeId: string
  customerId: string
  amount: number
  currencyCode: string
  requestId: string
}) {
  const locking = container.resolve(Modules.LOCKING) as { execute: <T>(key: string, job: () => Promise<T>) => Promise<T> }
  const prepared = await locking.execute(`buyer-wallet:${input.storeId}:${input.customerId}:${input.currencyCode}`, async () => {
    const service = core(container)
    const existing = await service.listBuyerWalletWithdrawals({
      store_id: input.storeId,
      customer_id: input.customerId,
      request_id: input.requestId,
    }, { take: 1 }) as WalletRow[]
    if (existing[0]) return { existing: existing[0] }
    const customer = await customerModule(container).retrieveCustomer(input.customerId)
    const paypalEmail = resolvePayPalPayoutEmailFromMetadata(customer.metadata)
    if (!paypalEmail) throw new Error("Bind a PayPal account with an email before withdrawing")
    const currencyCode = input.currencyCode.toLowerCase()
    if (currencyCode !== PAYOUT_CURRENCY_CODE) {
      throw new Error(`PayPal withdrawals are paid in ${PAYOUT_CURRENCY_CODE.toUpperCase()}`)
    }
    if (!isPayPalPayoutCurrency(currencyCode)) {
      throw new Error(`${currencyCode.toUpperCase()} is not supported by PayPal Payouts`)
    }
    const amountMinor = majorToMinor(input.amount, currencyCode)
    const feeMinor = calculatePayoutUserFeeMinor(amountMinor)
    const payoutAmountMinor = amountMinor - feeMinor
    const minimum = Number(process.env.WALLET_MIN_WITHDRAWAL_MAJOR ?? 5)
    if (!Number.isFinite(input.amount) || input.amount < minimum || amountMinor <= 0) {
      throw new Error(`Minimum withdrawal is ${minimum} ${currencyCode.toUpperCase()}`)
    }
    if (payoutAmountMinor <= 0) throw new Error("Withdrawal amount does not cover the payout fee")
    const ledger = await service.listBuyerWalletLedgers({ store_id: input.storeId, customer_id: input.customerId }) as WalletRow[]
    const available = calculateWalletBalances(ledger)[currencyCode] ?? 0
    if (available < amountMinor) throw new Error("Wallet balance is insufficient")
    const withdrawal = one(await service.createBuyerWalletWithdrawals({
      store_id: input.storeId,
      customer_id: input.customerId,
      request_id: input.requestId,
      amount_minor: amountMinor,
      payout_amount_minor: payoutAmountMinor,
      currency_code: currencyCode,
      paypal_email: paypalEmail,
      status: "pending",
      provider: "paypal",
      provider_batch_id: null,
      provider_item_id: null,
      fee_minor: feeMinor,
      provider_fee_minor: null,
      failure_kind: null,
      retry_count: 0,
      approved_at: null,
      processing_at: null,
      paid_at: null,
      rejected_at: null,
      error_message: null,
      metadata: { payout_mode: resolvePayPalPayoutMode(), settlement_timezone: "Asia/Hong_Kong", settlement_day: 20 },
    })) as WalletRow
    await service.createBuyerWalletLedgers({
      store_id: input.storeId,
      customer_id: input.customerId,
      type: "withdrawal_debit",
      amount_minor: amountMinor,
      currency_code: currencyCode,
      status: "processing",
      source: "paypal_payout",
      reference_id: withdrawal.id,
      description: "PayPal withdrawal · awaiting merchant approval",
      metadata: null,
    })
    return { withdrawal, paypalEmail, amountMinor, currencyCode, existing: null }
  })

  if (prepared.existing) {
    return {
      withdrawal: serializeWithdrawal(prepared.existing),
      wallet: await getBuyerWallet(container, input.storeId, input.customerId),
      idempotent: true,
    }
  }
  return {
    withdrawal: serializeWithdrawal(prepared.withdrawal),
    wallet: await getBuyerWallet(container, input.storeId, input.customerId),
    idempotent: false,
  }
}

const RECIPIENT_FAILURE_ISSUES = new Set([
  "RECEIVER_UNREGISTERED",
  "RECEIVER_COUNTRY_NOT_ALLOWED",
  "RECIPIENT_IS_NOT_SUPPORTED",
  "INVALID_EMAIL",
  "ACCOUNT_RESTRICTED",
])

const classifyPayoutFailure = (issue?: string | null, message?: string | null) => {
  const normalizedIssue = issue?.trim().toUpperCase()
  if (normalizedIssue && RECIPIENT_FAILURE_ISSUES.has(normalizedIssue)) return "recipient"
  const normalizedMessage = message?.toLowerCase() ?? ""
  if (/receiver|recipient|email|country|account restricted/.test(normalizedMessage)) return "recipient"
  if (/authentication|credential|merchant|permission|configuration|timeout|network|server/.test(normalizedMessage)) return "platform"
  return "unknown"
}

async function reconcileWithdrawalFee(container: MedusaContainer, withdrawal: WalletRow, actualFeeMinor: number) {
  const service = core(container)
  const estimatedFeeMinor = Number(withdrawal.fee_minor ?? 0)
  const adjustmentMinor = estimatedFeeMinor - actualFeeMinor
  if (!adjustmentMinor) return
  const referenceId = `${withdrawal.id}:fee-adjustment`
  const existing = await service.listBuyerWalletLedgers({
    store_id: withdrawal.store_id,
    customer_id: withdrawal.customer_id,
    type: "adjustment",
    reference_id: referenceId,
  }, { take: 1 }) as WalletRow[]
  if (existing[0]) return
  await service.createBuyerWalletLedgers({
    store_id: withdrawal.store_id,
    customer_id: withdrawal.customer_id,
    type: "adjustment",
    amount_minor: adjustmentMinor,
    currency_code: withdrawal.currency_code,
    status: "completed",
    source: "paypal_payout_fee_reconciliation",
    reference_id: referenceId,
    description: adjustmentMinor > 0 ? "PayPal payout fee refund" : "PayPal payout fee adjustment",
    metadata: { withdrawal_id: withdrawal.id, estimated_fee_minor: estimatedFeeMinor, actual_fee_minor: actualFeeMinor },
  })
}

async function processBuyerWithdrawalUnlocked(container: MedusaContainer, withdrawal: WalletRow) {
  const service = core(container)
  const attempt = Number(withdrawal.retry_count ?? 0) + 1
  const processing = one(await service.updateBuyerWalletWithdrawals({
    selector: { id: withdrawal.id },
    data: {
      status: "processing",
      processing_at: new Date(),
      retry_count: attempt,
      failure_kind: null,
      error_message: null,
    },
  })) as WalletRow
  try {
    const payout = await createPayPalPayout({
      withdrawalId: processing.id,
      attemptKey: `${processing.id}-r${attempt}`,
      receiverEmail: processing.paypal_email,
      amountMinor: Number(processing.payout_amount_minor ?? processing.amount_minor),
      currencyCode: processing.currency_code,
    })
    if (payout.status === "paid" && payout.feeCurrency === processing.currency_code && payout.feeMinor !== null) {
      await reconcileWithdrawalFee(container, processing, payout.feeMinor)
    }
    const status = payout.status === "paid" ? "paid" : "processing"
    await service.updateBuyerWalletLedgers({
      selector: { reference_id: processing.id, type: "withdrawal_debit" },
      data: { status: payout.status === "paid" ? "completed" : "processing", description: "PayPal withdrawal" },
    })
    return one(await service.updateBuyerWalletWithdrawals({
      selector: { id: processing.id },
      data: {
        status,
        provider_batch_id: payout.batchId,
        provider_item_id: payout.itemId,
        fee_minor: payout.status === "paid" && payout.feeCurrency === processing.currency_code ? payout.feeMinor : processing.fee_minor,
        provider_fee_minor: payout.feeCurrency === processing.currency_code ? payout.feeMinor : null,
        paid_at: payout.status === "paid" ? new Date() : null,
      },
    })) as WalletRow
  } catch (error) {
    const message = error instanceof Error ? error.message : "PayPal payout failed"
    const issue = typeof (error as { paypalIssue?: unknown } | null)?.paypalIssue === "string"
      ? String((error as { paypalIssue: string }).paypalIssue)
      : null
    const failureKind = classifyPayoutFailure(issue, message)
    return one(await service.updateBuyerWalletWithdrawals({
      selector: { id: processing.id },
      data: { status: "failed", failure_kind: failureKind, error_message: message },
    })) as WalletRow
  }
}

async function processBuyerWithdrawal(container: MedusaContainer, withdrawal: WalletRow) {
  const locking = container.resolve(Modules.LOCKING) as { execute: <T>(key: string, job: () => Promise<T>) => Promise<T> }
  return locking.execute(`buyer-wallet-withdrawal:${withdrawal.id}`, async () => {
    const rows = await core(container).listBuyerWalletWithdrawals({ id: withdrawal.id }, { take: 1 }) as WalletRow[]
    const latest = rows[0]
    if (!latest) throw new Error("Withdrawal not found")
    const retryableFailure = latest.status === "failed" && latest.failure_kind === "platform" && Number(latest.retry_count ?? 0) < MAX_AUTOMATIC_RETRIES
    if (latest.status !== "approved" && !retryableFailure) return latest
    return processBuyerWithdrawalUnlocked(container, latest)
  })
}

export const isHongKongSettlementDay = (date = new Date()) =>
  new Date(date.getTime() + HKT_OFFSET_MS).getUTCDate() === 20

export async function processMonthlyBuyerWithdrawals(container: MedusaContainer, input: { now?: Date; force?: boolean } = {}) {
  const now = input.now ?? new Date()
  if (!input.force && !isHongKongSettlementDay(now)) return { processed: 0, skipped: "outside_settlement_day", withdrawals: [] }
  const service = core(container)
  const rows = await service.listBuyerWalletWithdrawals({}, { order: { approved_at: "ASC" }, take: 500 }) as WalletRow[]
  const eligible = rows.filter((row) =>
    row.status === "approved" ||
    (row.status === "failed" && row.failure_kind === "platform" && Number(row.retry_count ?? 0) < MAX_AUTOMATIC_RETRIES)
  )
  const processed: WalletRow[] = []
  for (const row of eligible) processed.push(await processBuyerWithdrawal(container, row))
  return { processed: processed.length, skipped: null, withdrawals: processed.map(serializeWithdrawal) }
}

export async function listBuyerWithdrawalsForAdmin(container: MedusaContainer, storeId: string) {
  const rows = await core(container).listBuyerWalletWithdrawals(
    { store_id: storeId },
    { order: { created_at: "DESC" }, take: 500 }
  ) as WalletRow[]
  return rows.map(serializeWithdrawal)
}

export async function updateBuyerWithdrawalByAdmin(container: MedusaContainer, input: {
  storeId: string
  withdrawalId: string
  action: WithdrawalAction
  reason?: string
}) {
  const service = core(container)
  const rows = await service.listBuyerWalletWithdrawals({ id: input.withdrawalId, store_id: input.storeId }, { take: 1 }) as WalletRow[]
  const withdrawal = rows[0]
  if (!withdrawal) throw new Error("Withdrawal not found")
  if (input.action === "approve") {
    if (withdrawal.status !== "pending") throw new Error("Only pending withdrawals can be approved")
    const updated = one(await service.updateBuyerWalletWithdrawals({
      selector: { id: withdrawal.id },
      data: { status: "approved", approved_at: new Date(), error_message: null },
    })) as WalletRow
    return serializeWithdrawal(updated)
  }
  if (input.action === "reject") {
    if (!["pending", "approved", "failed"].includes(String(withdrawal.status))) throw new Error("This withdrawal cannot be rejected")
    await service.updateBuyerWalletLedgers({
      selector: { reference_id: withdrawal.id, type: "withdrawal_debit" },
      data: { status: "cancelled", description: "PayPal withdrawal · rejected" },
    })
    const updated = one(await service.updateBuyerWalletWithdrawals({
      selector: { id: withdrawal.id },
      data: { status: "rejected", rejected_at: new Date(), error_message: input.reason?.trim() || "Rejected by merchant" },
    })) as WalletRow
    return serializeWithdrawal(updated)
  }
  if (withdrawal.status !== "failed") throw new Error("Only failed withdrawals can be retried")
  const customer = await customerModule(container).retrieveCustomer(withdrawal.customer_id)
  const paypalEmail = resolvePayPalPayoutEmailFromMetadata(customer.metadata)
  if (!paypalEmail) throw new Error("The buyer must bind a valid PayPal account before retrying")
  const ledger = await service.listBuyerWalletLedgers({ store_id: input.storeId, customer_id: withdrawal.customer_id }) as WalletRow[]
  const available = calculateWalletBalances(ledger)[String(withdrawal.currency_code).toLowerCase()] ?? 0
  const debitRows = await service.listBuyerWalletLedgers({ reference_id: withdrawal.id, type: "withdrawal_debit" }, { take: 1 }) as WalletRow[]
  if (debitRows[0]?.status !== "processing" && available < Number(withdrawal.amount_minor)) throw new Error("Wallet balance is insufficient for retry")
  await service.updateBuyerWalletLedgers({
    selector: { reference_id: withdrawal.id, type: "withdrawal_debit" },
    data: { status: "processing", description: "PayPal withdrawal · approved for retry" },
  })
  const updated = one(await service.updateBuyerWalletWithdrawals({
    selector: { id: withdrawal.id },
    data: { status: "approved", approved_at: new Date(), paypal_email: paypalEmail, failure_kind: null, error_message: input.reason?.trim() || null },
  })) as WalletRow
  return serializeWithdrawal(updated)
}

export async function listCashbackBuyers(container: MedusaContainer, storeId: string, query = "") {
  const customers = await customerModule(container).listCustomers({}, { take: 500, select: ["id", "email", "first_name", "last_name", "metadata"] })
  const needle = query.trim().toLowerCase()
  const filtered = needle ? customers.filter((customer) => [customer.id, customer.email, customer.first_name, customer.last_name].some((value) => value?.toLowerCase().includes(needle))) : customers
  const service = core(container)
  const ledger = await service.listBuyerWalletLedgers({ store_id: storeId }) as WalletRow[]
  const byCustomer = new Map<string, WalletRow[]>()
  for (const row of ledger) byCustomer.set(row.customer_id, [...(byCustomer.get(row.customer_id) ?? []), row])
  return filtered.slice(0, 100).map((customer) => ({
    id: customer.id,
    email: customer.email ?? null,
    first_name: customer.first_name ?? null,
    last_name: customer.last_name ?? null,
    preferred_currency: readPreferredCurrency(customer.metadata),
    paypal_account_bound: Boolean(resolvePayPalPayoutEmailFromMetadata(customer.metadata)),
    balances: Object.entries(calculateWalletBalances(byCustomer.get(customer.id) ?? [])).map(([currency, amountMinor]) => ({ currency_code: currency, amount: minorToMajor(amountMinor, currency) })),
  }))
}
