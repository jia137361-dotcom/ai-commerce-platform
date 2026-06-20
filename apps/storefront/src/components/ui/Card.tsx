import type { AriaRole, ReactNode } from "react"

type CardProps = {
  children: ReactNode
  as?: "div" | "section" | "article"
  variant?: "default" | "muted" | "outlined"
  className?: string
  ariaLabel?: string
  role?: AriaRole
  ariaModal?: boolean
  ariaLabelledBy?: string
  ariaDescribedBy?: string
}

export function Card({
  children,
  as: Component = "div",
  variant = "default",
  className = "",
  ariaLabel,
  role,
  ariaModal,
  ariaLabelledBy,
  ariaDescribedBy,
}: CardProps) {
  return (
    <Component
      className={["buyer-ui-card", `buyer-ui-card--${variant}`, className].filter(Boolean).join(" ")}
      aria-label={ariaLabel}
      role={role}
      aria-modal={ariaModal || undefined}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
    >
      {children}
    </Component>
  )
}
