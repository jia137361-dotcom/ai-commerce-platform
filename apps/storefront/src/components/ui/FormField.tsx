import { useId, type InputHTMLAttributes } from "react"

type FormFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string
  error?: string
  hint?: string
}

export function FormField({ label, error, hint, className = "", ...inputProps }: FormFieldProps) {
  const id = useId()
  const messageId = `${id}-message`
  return (
    <label className={["buyer-ui-field", className].filter(Boolean).join(" ")} htmlFor={id}>
      <span>{label}</span>
      <input
        {...inputProps}
        id={id}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error || hint ? messageId : undefined}
      />
      {error || hint ? <small id={messageId} className={error ? "buyer-ui-field-error" : ""}>{error ?? hint}</small> : null}
    </label>
  )
}
