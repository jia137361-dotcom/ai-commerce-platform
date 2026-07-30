import type { MouseEventHandler, ReactNode } from "react"

export type ButtonVariant = "primary" | "secondary" | "outline" | "danger" | "ghost"

type ButtonProps = {
  children: ReactNode
  variant?: ButtonVariant
  href?: string
  type?: "button" | "submit" | "reset"
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  className?: string
  onClick?: MouseEventHandler<HTMLButtonElement>
  ariaLabel?: string
  title?: string
}

export function Button({
  children,
  variant = "primary",
  href,
  type = "button",
  disabled = false,
  loading = false,
  fullWidth = false,
  className = "",
  onClick,
  ariaLabel,
  title,
}: ButtonProps) {
  const classes = ["buyer-ui-button", `buyer-ui-button--${variant}`, fullWidth ? "buyer-ui-button--full" : "", className]
    .filter(Boolean)
    .join(" ")
  const content = loading ? (
    <>
      <span className="buyer-ui-button-spinner" aria-hidden="true" />
      {children}
    </>
  ) : children

  if (href) {
    return (
      <a
        className={classes}
        href={disabled ? undefined : href}
        aria-disabled={disabled || undefined}
        aria-label={ariaLabel}
        title={title}
      >
        {content}
      </a>
    )
  }

  return (
    <button
      className={classes}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-label={ariaLabel}
      title={title}
      onClick={onClick}
    >
      {content}
    </button>
  )
}
