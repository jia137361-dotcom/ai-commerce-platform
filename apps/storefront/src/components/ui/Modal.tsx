import { useEffect, useId, type ReactNode } from "react"
import { Button } from "./Button"
import { Card } from "./Card"

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

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [onClose, open])

  if (!open) return null

  return (
    <div className="buyer-ui-modal-backdrop" role="presentation">
      <Card
        className={["buyer-ui-modal", className].filter(Boolean).join(" ")}
        role="dialog"
        ariaModal
        ariaLabelledBy={titleId}
        ariaDescribedBy={description ? descriptionId : undefined}
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
      </Card>
    </div>
  )
}
