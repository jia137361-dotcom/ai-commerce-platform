import { cn } from "../../lib/cn"

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger"
  size?: "sm" | "md" | "lg"
  loading?: boolean
  fullWidth?: boolean
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  disabled,
  loading = false,
  fullWidth = false,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading
  return (
    <button
      type="button"
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-lg)] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_srgb,var(--color-focus)_34%,transparent)] disabled:cursor-not-allowed disabled:opacity-55",
        size === "sm" && "px-3 py-1.5 text-sm",
        size === "md" && "px-4 py-2 text-sm",
        size === "lg" && "px-6 py-3 text-base",
        fullWidth && "w-full",
        variant === "primary" && "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)]",
        variant === "secondary" && "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)]",
        variant === "outline" && "border border-[var(--color-primary)] bg-transparent text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)]",
        variant === "ghost" && "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]",
        variant === "danger" && "border border-red-200 text-[var(--color-danger)] hover:bg-red-50",
        className
      )}
      {...props}
    >
      {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" /> : null}
      {children}
    </button>
  )
}
