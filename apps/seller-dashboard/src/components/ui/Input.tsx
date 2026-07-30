import { useId, type ReactNode } from "react"
import { cn } from "../../lib/cn"

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  description?: string
  error?: string | null
  leadingIcon?: ReactNode
  trailingAction?: ReactNode
}

const controlClass =
  "w-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-focus)_22%,transparent)] disabled:bg-[var(--color-surface-muted)] disabled:text-[var(--color-text-secondary)]"

function FieldShell({
  id,
  label,
  required,
  description,
  error,
  children,
}: {
  id: string
  label?: string
  required?: boolean
  description?: string
  error?: string | null
  children: ReactNode
}) {
  const message = error ?? description
  const messageId = `${id}-message`
  if (!label && !message) return <>{children}</>
  return (
    <label className="block text-sm font-medium text-[var(--color-text-primary)]" htmlFor={id}>
      {label ? (
        <span className="mb-1.5 inline-flex items-center gap-1">
          {label}
          {required ? <span className="text-[var(--color-primary)]" aria-hidden="true">*</span> : null}
        </span>
      ) : null}
      {children}
      {message ? (
        <p id={messageId} className={cn("mt-1 text-sm", error ? "text-[var(--color-danger)]" : "text-[var(--color-text-secondary)]")}>
          {message}
        </p>
      ) : null}
    </label>
  )
}

export function Input({
  label,
  description,
  error,
  leadingIcon,
  trailingAction,
  className,
  id,
  required,
  ...props
}: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const message = error ?? description
  const input = (
    <span className="relative flex items-center">
      {leadingIcon ? <span className="pointer-events-none absolute left-3 text-[var(--color-text-secondary)]" aria-hidden="true">{leadingIcon}</span> : null}
      <input
        {...props}
        id={inputId}
        required={required}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={message ? `${inputId}-message` : undefined}
        className={cn(controlClass, leadingIcon ? "pl-10" : undefined, trailingAction ? "pr-11" : undefined, className)}
      />
      {trailingAction ? <span className="absolute right-2 inline-flex items-center">{trailingAction}</span> : null}
    </span>
  )
  return (
    <FieldShell id={inputId} label={label} required={required} description={description} error={error}>
      {input}
    </FieldShell>
  )
}

export function Textarea({
  label,
  description,
  error,
  className,
  id,
  required,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  description?: string
  error?: string | null
}) {
  const generatedId = useId()
  const textareaId = id ?? generatedId
  const message = error ?? description
  return (
    <FieldShell id={textareaId} label={label} required={required} description={description} error={error}>
      <textarea
        {...props}
        id={textareaId}
        required={required}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={message ? `${textareaId}-message` : undefined}
        className={cn(controlClass, "min-h-28 resize-y", className)}
      />
    </FieldShell>
  )
}

export function Select({
  label,
  description,
  error,
  className,
  id,
  required,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  description?: string
  error?: string | null
}) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const message = error ?? description
  return (
    <FieldShell id={selectId} label={label} required={required} description={description} error={error}>
      <select
        {...props}
        id={selectId}
        required={required}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={message ? `${selectId}-message` : undefined}
        className={cn(controlClass, className)}
      />
    </FieldShell>
  )
}

export function Label({
  children,
  className,
  htmlFor,
}: {
  children: React.ReactNode
  className?: string
  htmlFor?: string
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("block text-xs font-semibold uppercase text-[var(--color-text-secondary)]", className)}
    >
      {children}
    </label>
  )
}

export function FieldError({ message }: { message?: string | null }) {
  if (!message) return null
  return <p className="mt-1 text-sm text-[var(--color-danger)]">{message}</p>
}
