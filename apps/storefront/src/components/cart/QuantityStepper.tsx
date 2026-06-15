type QuantityStepperProps = {
  quantity: number
  disabled?: boolean
  onChange: (quantity: number) => void
}

export function QuantityStepper({ quantity, disabled, onChange }: QuantityStepperProps) {
  return (
    <div className="buyer-cart-stepper" aria-label="Quantity">
      <button type="button" disabled={disabled || quantity <= 1} onClick={() => onChange(Math.max(1, quantity - 1))}>-</button>
      <strong>{quantity}</strong>
      <button type="button" disabled={disabled} onClick={() => onChange(quantity + 1)}>+</button>
    </div>
  )
}
