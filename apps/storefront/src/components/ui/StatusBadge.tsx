import type { ReactNode } from "react"

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger"

type StatusBadgeProps = {
  children: ReactNode
  tone?: StatusTone
  title?: string
  className?: string
}

export const statusToneFor = (status?: string | null): StatusTone => {
  const value = status?.trim().toLowerCase() ?? ""
  if (["failed", "canceled", "cancelled", "rejected"].includes(value)) return "danger"
  if (["completed", "delivered", "refunded", "processed"].includes(value)) return "success"
  if (["shipped", "fulfilled", "partially_fulfilled"].includes(value)) return "info"
  if (["pending", "authorized", "processing", "waiting", "not_fulfilled"].includes(value)) return "warning"
  return "neutral"
}

export function StatusBadge({ children, tone = "neutral", title, className = "" }: StatusBadgeProps) {
  return (
    <span
      className={["buyer-ui-status", `buyer-ui-status--${tone}`, className].filter(Boolean).join(" ")}
      title={title}
    >
      {children}
    </span>
  )
}
