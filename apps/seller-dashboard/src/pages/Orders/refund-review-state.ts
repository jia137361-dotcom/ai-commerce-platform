export const REVIEWABLE_REFUND_STATUSES = new Set([
  "manual_review",
  "pending",
  "requested",
  "awaiting_information",
  "approved",
  "refund_failed",
])

export const parsePartialRefundAmount = (value: string, eligibleAmountMinor: number) => {
  const amountMajor = Number(value)
  const amountMinor = Math.round(amountMajor * 100)
  return Number.isFinite(amountMajor) && amountMinor > 0 && amountMinor <= eligibleAmountMinor
    ? amountMinor
    : null
}

export const canReviewRefund = (status: string) => REVIEWABLE_REFUND_STATUSES.has(status)
