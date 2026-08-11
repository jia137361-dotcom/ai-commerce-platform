import { useId, type TextareaHTMLAttributes } from "react"

type TextAreaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & {
  label: string
  error?: string
  hint?: string
}

export function TextArea({ label, error, hint, className = "", ...textAreaProps }: TextAreaProps) {
  const id = useId()
  const messageId = `${id}-message`
  return (
    <label className={["buyer-ui-field", className].filter(Boolean).join(" ")} htmlFor={id}>
      <span>{label}</span>
      <textarea
        {...textAreaProps}
        id={id}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error || hint ? messageId : undefined}
      />
      {error || hint ? <small id={messageId} className={error ? "buyer-ui-field-error" : ""}>{error ?? hint}</small> : null}
    </label>
  )
}
