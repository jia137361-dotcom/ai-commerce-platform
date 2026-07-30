import { useEffect, useId, useRef } from "react"
import { cn } from "../../lib/cn"

export function Modal({
  open,
  title,
  children,
  onClose,
  footer,
}: {
  open: boolean
  title: string
  children: React.ReactNode
  onClose: () => void
  footer?: React.ReactNode
}) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    const previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusableSelector = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",")
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
        return
      }
      if (event.key !== "Tab" || !dialogRef.current) return
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) => element.offsetParent !== null
      )
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKeyDown)
    window.setTimeout(() => dialogRef.current?.querySelector<HTMLElement>(focusableSelector)?.focus(), 0)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown)
      previousActiveElement?.focus()
    }
  }, [onClose, open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-modal)]"
        role="dialog"
        aria-modal
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h2>
          <button type="button" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]" onClick={onClose} aria-label="Close dialog">
            ×
          </button>
        </div>
        <div className="text-sm text-[var(--color-text-secondary)]">{children}</div>
        {footer ? <div className="mt-6 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  )
}

export function DropdownMenu({
  trigger,
  items,
}: {
  trigger: React.ReactNode
  items: Array<{ label: string; onClick: () => void; variant?: "default" | "primary" | "danger" }>
}) {
  return (
    <div className="group relative inline-block">
      {trigger}
      <div className="invisible absolute right-0 z-20 mt-2 min-w-[180px] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-1 opacity-0 shadow-[var(--shadow-card)] transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            className={cn(
              "block w-full rounded-md px-3 py-2 text-left text-sm",
              item.variant === "primary" && "font-medium text-[var(--color-primary)] hover:bg-orange-50",
              item.variant === "danger" && "text-red-600 hover:bg-red-50",
              (!item.variant || item.variant === "default") && "text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)]"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}
