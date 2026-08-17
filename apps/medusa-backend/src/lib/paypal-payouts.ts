import { getConfiguredPayPalClient } from "../modules/paypal/client"
import { minorToMajor, walletCurrencyDigits } from "./wallet-currency"

export type PayPalPayoutMode = "disabled" | "mock" | "sandbox"

type PayPalPayoutResponse = {
  batch_header?: {
    payout_batch_id?: string
    batch_status?: string
    errors?: { message?: string }
  }
  items?: Array<{
    payout_item_id?: string
    transaction_status?: string
    errors?: { message?: string }
  }>
}

export const resolvePayPalPayoutMode = (): PayPalPayoutMode => {
  const configured = process.env.PAYPAL_PAYOUTS_MODE?.trim().toLowerCase()
  if (configured === "mock") return "mock"
  if (configured === "sandbox" && getConfiguredPayPalClient()) return "sandbox"
  if (!configured && process.env.NODE_ENV !== "production") return "mock"
  return "disabled"
}

export const maskPayoutEmail = (email?: string | null) => {
  const value = email?.trim()
  if (!value || !value.includes("@")) return null
  const [local, domain] = value.split("@")
  return `${local.slice(0, 2)}${"*".repeat(Math.max(1, Math.min(6, local.length - 2)))}@${domain}`
}

const payoutValue = (amountMinor: number, currencyCode: string) =>
  minorToMajor(amountMinor, currencyCode).toFixed(walletCurrencyDigits(currencyCode))

export async function createPayPalPayout(input: {
  withdrawalId: string
  receiverEmail: string
  amountMinor: number
  currencyCode: string
  note?: string
}) {
  const mode = resolvePayPalPayoutMode()
  if (mode === "disabled") throw new Error("PayPal Payouts is not enabled")
  if (mode === "mock") {
    return {
      mode,
      batchId: `MOCK-${input.withdrawalId}`,
      itemId: `MOCK-ITEM-${input.withdrawalId}`,
      status: "paid" as const,
    }
  }

  const client = getConfiguredPayPalClient()
  if (!client) throw new Error("PayPal sandbox credentials are not configured")
  const payload = await client.request<PayPalPayoutResponse>(
    "/v1/payments/payouts",
    {
      method: "POST",
      body: JSON.stringify({
        sender_batch_header: {
          sender_batch_id: input.withdrawalId.slice(0, 30),
          email_subject: "Your CiiVerse cashback is on the way",
        },
        items: [{
          recipient_type: "EMAIL",
          receiver: input.receiverEmail,
          amount: {
            value: payoutValue(input.amountMinor, input.currencyCode),
            currency: input.currencyCode.toUpperCase(),
          },
          sender_item_id: input.withdrawalId.slice(0, 30),
          note: input.note?.slice(0, 4000) || "CiiVerse cashback withdrawal",
        }],
      }),
    },
    `wallet-payout:${input.withdrawalId}`
  )
  const batchStatus = payload.batch_header?.batch_status?.toUpperCase()
  const item = payload.items?.[0]
  const itemStatus = item?.transaction_status?.toUpperCase()
  const failed = batchStatus === "DENIED" || itemStatus === "FAILED" || itemStatus === "BLOCKED" || itemStatus === "RETURNED"
  if (failed) {
    throw new Error(item?.errors?.message || payload.batch_header?.errors?.message || "PayPal rejected the payout")
  }
  const paid = itemStatus === "SUCCESS"
  return {
    mode,
    batchId: payload.batch_header?.payout_batch_id || null,
    itemId: item?.payout_item_id || null,
    status: paid ? "paid" as const : "processing" as const,
  }
}

export async function retrievePayPalPayout(batchId: string) {
  if (resolvePayPalPayoutMode() !== "sandbox") return { status: "processing" as const }
  const client = getConfiguredPayPalClient()
  if (!client) return { status: "processing" as const }
  const payload = await client.request<PayPalPayoutResponse>(
    `/v1/payments/payouts/${encodeURIComponent(batchId)}?fields=items`
  )
  const batchStatus = payload.batch_header?.batch_status?.toUpperCase()
  const item = payload.items?.[0]
  const itemStatus = item?.transaction_status?.toUpperCase()
  if (itemStatus === "SUCCESS") return { status: "paid" as const, itemId: item?.payout_item_id || null }
  if (["FAILED", "BLOCKED", "RETURNED", "REFUNDED", "REVERSED"].includes(itemStatus || "") || batchStatus === "DENIED") {
    return {
      status: "failed" as const,
      itemId: item?.payout_item_id || null,
      error: item?.errors?.message || payload.batch_header?.errors?.message || "PayPal payout failed",
    }
  }
  return { status: "processing" as const, itemId: item?.payout_item_id || null }
}
