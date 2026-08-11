import { useId } from "react"

type StarRatingInputProps = {
  label: string
  value: number
  onChange: (value: number) => void
  required?: boolean
}

export function StarRatingInput({ label, value, onChange, required = false }: StarRatingInputProps) {
  const groupId = useId()

  return (
    <fieldset className="buyer-star-rating">
      <legend>
        {label}
        {required ? " *" : null}
      </legend>
      <div role="radiogroup" aria-labelledby={groupId}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} out of 5 stars`}
            className={star <= value ? "is-active" : ""}
            onClick={() => onChange(star)}
          >
            {star <= value ? "★" : "☆"}
          </button>
        ))}
        <span className="buyer-star-rating-value">{value}/5</span>
      </div>
    </fieldset>
  )
}
