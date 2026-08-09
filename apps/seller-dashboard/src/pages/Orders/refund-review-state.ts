export const REVIEWABLE_REFUND_STATUSES = new Set([
  "manual_review",
  "pending",
  "requested",
  "awaiting_information",
  "approved",
  "refund_failed",
])

export const parsePartialRefundAmount = (value: string, eligibleAmount: number) => {
  const amount = Number(value)
  return Number.isFinite(amount) && amount > 0 && amount <= eligibleAmount ? amount : null
}

export const canReviewRefund = (status: string) => REVIEWABLE_REFUND_STATUSES.has(status)
