import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { STORE_CORE_MODULE } from "../modules/store-core"
import type StoreCoreModuleService from "../modules/store-core/service"
import { resolvePayPalPayoutEmailFromMetadata } from "./customer-payment-methods"
import { createPayPalPayout, maskPayoutEmail, resolvePayPalPayoutMode, retrievePayPalPayout } from "./paypal-payouts"
import { convertWalletAmount, isPayPalPayoutCurrency, majorToMinor, minorToMajor } from "./wallet-currency"

type WalletRow = Record<string, any>

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
  currency_code: row.currency_code,
  status: row.status,
  request_id: row.request_id ?? null,
  provider: row.provider,
  paypal_email_masked: maskPayoutEmail(row.paypal_email),
  provider_batch_id: row.provider_batch_id ?? null,
  error_message: row.error_message ?? null,
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
      await service.updateBuyerWalletLedgers({
        selector: { reference_id: withdrawal.id, type: "withdrawal_debit" },
        data: { status: result.status === "paid" ? "completed" : "failed" },
      })
      await service.updateBuyerWalletWithdrawals({
        selector: { id: withdrawal.id },
        data: { status, provider_item_id: result.itemId ?? withdrawal.provider_item_id ?? null, error_message: result.status === "failed" ? result.error : null },
      })
      withdrawal.status = status
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
    minimum_withdrawal: Number(process.env.WALLET_MIN_WITHDRAWAL_MAJOR ?? 1),
    withdrawal_fee: 0,
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
    if (!isPayPalPayoutCurrency(currencyCode)) {
      throw new Error(`${currencyCode.toUpperCase()} is not supported by PayPal Payouts`)
    }
    const amountMinor = majorToMinor(input.amount, currencyCode)
    const minimum = Number(process.env.WALLET_MIN_WITHDRAWAL_MAJOR ?? 1)
    if (!Number.isFinite(input.amount) || input.amount < minimum || amountMinor <= 0) {
      throw new Error(`Minimum withdrawal is ${minimum} ${currencyCode.toUpperCase()}`)
    }
    const ledger = await service.listBuyerWalletLedgers({ store_id: input.storeId, customer_id: input.customerId }) as WalletRow[]
    const available = calculateWalletBalances(ledger)[currencyCode] ?? 0
    if (available < amountMinor) throw new Error("Wallet balance is insufficient")
    const withdrawal = one(await service.createBuyerWalletWithdrawals({
      store_id: input.storeId,
      customer_id: input.customerId,
      request_id: input.requestId,
      amount_minor: amountMinor,
      currency_code: currencyCode,
      paypal_email: paypalEmail,
      status: "processing",
      provider: "paypal",
      provider_batch_id: null,
      provider_item_id: null,
      error_message: null,
      metadata: { payout_mode: resolvePayPalPayoutMode() },
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
      description: "PayPal withdrawal",
      metadata: null,
    })
    return { withdrawal, paypalEmail, amountMinor, currencyCode, existing: null }
  })

  const service = core(container)
  if (prepared.existing) {
    return {
      withdrawal: serializeWithdrawal(prepared.existing),
      wallet: await getBuyerWallet(container, input.storeId, input.customerId),
      idempotent: true,
    }
  }
  try {
    const payout = await createPayPalPayout({
      withdrawalId: prepared.withdrawal.id,
      receiverEmail: prepared.paypalEmail,
      amountMinor: prepared.amountMinor,
      currencyCode: prepared.currencyCode,
    })
    const withdrawalStatus = payout.status === "paid" ? "paid" : "processing"
    const ledgerStatus = payout.status === "paid" ? "completed" : "processing"
    await service.updateBuyerWalletLedgers({
      selector: { reference_id: prepared.withdrawal.id, type: "withdrawal_debit" },
      data: { status: ledgerStatus },
    })
    const updated = one(await service.updateBuyerWalletWithdrawals({
      selector: { id: prepared.withdrawal.id },
      data: { status: withdrawalStatus, provider_batch_id: payout.batchId, provider_item_id: payout.itemId },
    })) as WalletRow
    return { withdrawal: serializeWithdrawal(updated), wallet: await getBuyerWallet(container, input.storeId, input.customerId), idempotent: false }
  } catch (error) {
    const message = error instanceof Error ? error.message : "PayPal payout failed"
    await service.updateBuyerWalletLedgers({ selector: { reference_id: prepared.withdrawal.id, type: "withdrawal_debit" }, data: { status: "failed" } })
    await service.updateBuyerWalletWithdrawals({ selector: { id: prepared.withdrawal.id }, data: { status: "failed", error_message: message } })
    throw error
  }
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
