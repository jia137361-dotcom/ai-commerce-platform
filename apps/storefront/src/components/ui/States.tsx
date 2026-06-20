import type { ReactNode } from "react"
import { Button } from "./Button"

export function LoadingState({ label = "Loading...", className = "" }: { label?: string; className?: string }) {
  return (
    <div className={["state-box", "buyer-ui-state", "buyer-ui-loading", className].filter(Boolean).join(" ")} role="status">
      <span className="state-spinner buyer-ui-state-spinner" aria-hidden="true" />
      <strong>{label}</strong>
    </div>
  )
}

export function ErrorState({
  title = "Something went wrong",
  message,
  action,
  className = "",
}: {
  title?: string
  message?: string
  action?: { label: string; onClick: () => void }
  className?: string
}) {
  return (
    <div className={["state-box", "error-state", "buyer-ui-state", "buyer-ui-error", className].filter(Boolean).join(" ")} role="alert">
      <strong>{title}</strong>
      {message && <p>{message}</p>}
      {action && <Button variant="secondary" onClick={action.onClick}>{action.label}</Button>}
    </div>
  )
}

export function EmptyState({
  title,
  message,
  action,
  icon,
  className = "",
}: {
  title: string
  message?: string
  action?: { label: string; href: string }
  icon?: ReactNode
  className?: string
}) {
  return (
    <div className={["state-box", "empty-state", "buyer-ui-state", "buyer-ui-empty", className].filter(Boolean).join(" ")}>
      {icon ?? <div className="empty-illustration buyer-ui-state-icon" aria-hidden="true">0</div>}
      <strong>{title}</strong>
      {message && <p>{message}</p>}
      {action && <Button href={action.href}>{action.label}</Button>}
    </div>
  )
}
