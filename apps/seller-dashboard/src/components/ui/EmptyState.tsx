import { cn } from "../../lib/cn"
import { Button } from "./Button"

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-8 py-12 text-center">
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h3>
      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{description}</p>
      {actionLabel && onAction ? (
        <Button className="mt-6" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-surface-muted)]", className)} />
}

export function TableSkeleton() {
  return (
    <div className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-8 py-10 text-center" role="status">
      <span className="mx-auto block h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary)] border-r-transparent" aria-hidden="true" />
      <p className="mt-3 text-sm font-medium text-[var(--color-text-secondary)]">{label}</p>
    </div>
  )
}

export function ErrorState({
  title = "Something went wrong",
  description = "Please try again.",
  actionLabel,
  onAction,
}: {
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-red-200 bg-red-50 px-8 py-10 text-center" role="alert">
      <h3 className="text-base font-semibold text-[var(--color-danger)]">{title}</h3>
      <p className="mt-2 text-sm text-red-700">{description}</p>
      {actionLabel && onAction ? (
        <Button className="mt-5" variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  )
}
