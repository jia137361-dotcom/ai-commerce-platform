import { useId, type ReactNode, type SelectHTMLAttributes } from "react"

type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
  label: string
  error?: string
  hint?: string
  children: ReactNode
}

export function SelectField({ label, error, hint, children, className = "", ...selectProps }: SelectFieldProps) {
  const id = useId()
  const messageId = `${id}-message`
  return (
    <label className={["buyer-ui-field", className].filter(Boolean).join(" ")} htmlFor={id}>
      <span>{label}</span>
      <select
        {...selectProps}
        id={id}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error || hint ? messageId : undefined}
      >
        {children}
      </select>
      {error || hint ? <small id={messageId} className={error ? "buyer-ui-field-error" : ""}>{error ?? hint}</small> : null}
    </label>
  )
}
