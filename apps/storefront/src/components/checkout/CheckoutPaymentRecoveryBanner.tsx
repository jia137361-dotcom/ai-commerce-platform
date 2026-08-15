import { useEffect, useMemo, useState } from "react"
import type { BuyerPaymentAttempt } from "../../lib/buyer-api"
import { Card } from "../ui/Card"

const formatRemaining = (expiresAt: string | null) => {
  if (!expiresAt) return "--:--"
  const remainingMs = Math.max(0, Date.parse(expiresAt) - Date.now())
  const totalSeconds = Math.ceil(remainingMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

export function CheckoutPaymentRecoveryBanner({
  attempt,
}: {
  attempt: BuyerPaymentAttempt | null
}) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!attempt?.expiresAt) return undefined
    const id = window.setInterval(() => setTick((value) => value + 1), 1000)
    return () => window.clearInterval(id)
  }, [attempt?.expiresAt])

  const content = useMemo(() => {
    if (!attempt) return null
    const remaining = formatRemaining(attempt.expiresAt)
    const action = attempt.recoveryAction
    if (action === "wait") {
      return {
        title: "Payment is processing.",
        copy: "We are waiting for the payment network to finish. Do not start another payment.",
        remaining,
        allowRetry: false,
      }
    }
    if (action === "complete_order") {
      return {
        title: "Payment was confirmed.",
        copy: "Your order is being restored. Do not pay again.",
        remaining,
        allowRetry: true,
      }
    }
    if (action === "expired") {
      return {
        title: "Payment window expired.",
        copy: "This unpaid order remains in your orders. Re-add its items from there to start a new checkout.",
        remaining: "00:00",
        allowRetry: false,
      }
    }
    if (attempt.status === "payment_failed" || attempt.status === "requires_action") {
      return {
        title: "Payment was not completed.",
        copy: "You can continue this checkout without creating a second payment.",
        remaining,
        allowRetry: true,
      }
    }
    return {
      title: "Payment window is reserved.",
      copy: "You can leave and return to continue this same payment.",
      remaining,
      allowRetry: false,
    }
  }, [attempt, tick])

  if (!attempt || !content || attempt.recoveryAction === "completed") return null

  return (
    <Card as="section" className="buyer-checkout-recovery-banner">
      <div>
        <strong>{content.title}</strong>
        <p>{content.copy}</p>
        <span>Your checkout is reserved for: {content.remaining}</span>
      </div>
    </Card>
  )
}
