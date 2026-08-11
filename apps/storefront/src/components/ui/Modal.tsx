import { useEffect, useId, useRef, type ReactNode } from "react"
import { Button } from "./Button"

type ModalProps = {
  open: boolean
  title: string
  description?: string
  eyebrow?: string
  children?: ReactNode
  footer?: ReactNode
  onClose: () => void
  className?: string
}

export function Modal({ open, title, description, eyebrow, children, footer, onClose, className = "" }: ModalProps) {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLElement | null>(null)

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
    window.setTimeout(() => {
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(focusableSelector)
      firstFocusable?.focus()
    }, 0)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown)
      previousActiveElement?.focus()
    }
  }, [onClose, open])

  if (!open) return null

  return (
    <div className="buyer-ui-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        ref={dialogRef}
        className={["buyer-ui-card", "buyer-ui-card--default", "buyer-ui-modal", className].filter(Boolean).join(" ")}
        role="dialog"
        aria-modal
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="buyer-ui-modal-header">
          <div>
            {eyebrow ? <p className="buyer-ui-eyebrow">{eyebrow}</p> : null}
            <h2 id={titleId}>{title}</h2>
            {description ? <p id={descriptionId}>{description}</p> : null}
          </div>
          <Button variant="ghost" ariaLabel="Close dialog" title="Close" onClick={onClose}>×</Button>
        </header>
        <div className="buyer-ui-modal-body">
          {children}
        </div>
        {footer ? <footer className="buyer-ui-modal-footer">{footer}</footer> : null}
      </section>
    </div>
  )
}
