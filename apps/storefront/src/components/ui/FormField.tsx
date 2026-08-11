import { useId, type InputHTMLAttributes, type ReactNode } from "react"

type FormFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string
  error?: string
  hint?: string
  description?: string
  leadingIcon?: ReactNode
  trailingAction?: ReactNode
}

export function FormField({
  label,
  error,
  hint,
  description,
  leadingIcon,
  trailingAction,
  className = "",
  required,
  ...inputProps
}: FormFieldProps) {
  const id = useId()
  const messageId = `${id}-message`
  const helper = error ?? hint ?? description
  return (
    <label className={["buyer-ui-field", className].filter(Boolean).join(" ")} htmlFor={id}>
      <span className="buyer-ui-field-label">
        {label}
        {required ? <span className="buyer-ui-field-required" aria-hidden="true">*</span> : null}
      </span>
      <span
        className={[
          "buyer-ui-field-control",
          leadingIcon ? "buyer-ui-field-control--leading" : "",
          trailingAction ? "buyer-ui-field-control--trailing" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {leadingIcon ? <span className="buyer-ui-field-icon" aria-hidden="true">{leadingIcon}</span> : null}
        <input
          {...inputProps}
          id={id}
          required={required}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={helper ? messageId : undefined}
        />
        {trailingAction ? <span className="buyer-ui-field-action">{trailingAction}</span> : null}
      </span>
      {helper ? <small id={messageId} className={error ? "buyer-ui-field-error" : ""}>{helper}</small> : null}
    </label>
  )
}
